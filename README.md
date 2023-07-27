Utility code to support installing locally scoped and versioned development tools

# Supported tools

The following tools can be installed with this system

* [deno](https://deno.land/)
* [nodejs](https://nodejs.org/)
* [pnpm](https://pnpm.io/)
* [adoptopenjdk](https://adoptium.net/en-GB/)
* [bazel](https://bazel.build/)
* [gradle](https://gradle.org/)
* [yarn](https://github.com/yarnpkg/yarn/releases)
* [terraform](https://www.terraform.io/)
* [adl](https://github.com/adl-lang/adl)
* [awscli](https://aws.amazon.com/cli/)
* [foundry](https://github.com/foundry-rs/foundry)
* [pulumi](https://www.pulumi.com/)


# Project setup

create a `deno.json` file in the root of your project:

```
{
    "lock": "./deno/deno.lock"
}
```

write a typescript file `./deno/local-setup.ts` to specify the tools and versions you need. For
example

``` typescript
import {
  packages,
  forPlatform,
  getHostPlatform,
  installTo
} from "https://deno.land/x/adllang_localsetup@v0.6/mod.ts";

const DENO = packages.deno("1.34.1");
const NODE = packages.nodejs("18.16.0");
const YARN = packages.yarn("1.22.19");
const ADL = packages.adl("1.1.12");

export async function main() {
  if (Deno.args.length != 1) {
    console.error("Usage: local-setup LOCALDIR");
    Deno.exit(1);
  }
  const localdir = Deno.args[0];

  const platform = getHostPlatform();

  const installs = [
    forPlatform(DENO, platform),
    forPlatform(NODE, platform),
    forPlatform(ADL, platform),
    YARN,
  ];

  await installTo(installs, localdir);
}

main()
  .catch((err) => {
    console.error("error in main", err);
  });
```

copy the [wrapper shell script](example/local-setup.sh) to `./deno/local-setup.sh` 

Add `.local` to the project gitignore

For a more complex example see [the included local-setup.ts](example/local-setup.ts).
This included;
* a locally defined package, and
* having a package adding aliases to the environment.

# Usage

In a project, just source the shell script:

```
$ . deno/local-setup.sh
```

This will download the tools, install them to `.local` and put them on
the path in the current shell.

# Local Dev

To work on and use a local version of local-setup you can clone repo, potentially as a git submodule e.g. 
```
git submodule add git@github.com:adl-lang/local-setup.git deno/patched/local-setup
```

Either change the import in `local-setup.sh`
``` patch
-} from "https://deno.land/x/adllang_localsetup@v0.6/mod.ts";
+} from "./patched/local-setup/mod.ts";
```
Or use an `import` in override the `deno.json` file to override the deno package with your local copy.

For example if your fork was clone as a submodule into `deno/patched/local-setup` your `deno.json` would look like;

``` json
{
    "lock": "./deno/deno.lock",
    "imports": {
        "https://deno.land/x/adllang_localsetup@v0.6/": "./deno/patched/local-setup/"
    }
}
```