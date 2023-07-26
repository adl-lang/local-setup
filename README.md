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
  installTo,
  mapPlatform,
  MultiPlatform,
  DownloadFile,
  Installable,
  withEnv,
  setAlias,
  binary
} from "https://deno.land/x/adllang_localsetup@v0.6/mod.ts";

// local package def for WIP Rust ADL tooling
function radlc(gh_org: string, version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://github.com/${gh_org}/adl/releases/download/rust%2Fcompiler%2Fv${version}/radlc-v${version}-linux`,
      cachedName: `radlc-${version}-linux`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/${gh_org}/adl/releases/download/rust%2Fcompiler%2Fv${version}/radlc-v${version}-osx`,
      cachedName: `radlc-${version}-osx`,
    },
  };
  function install(url: DownloadFile): Installable {
    return binary(url, 'radlc');
  }
  return mapPlatform(urls, install);
}

const platform = getHostPlatform();
function withPlatform<T>(multi: MultiPlatform<T>) {
  return forPlatform(multi, platform)
}

const DENO = withPlatform(packages.deno("1.34.1"));
const NODE = withPlatform(packages.nodejs("18.16.0"));
const YARN = packages.yarn("1.22.19");
const PNPM = withEnv(withPlatform(packages.pnpm("8.1.1")), () => [
  setAlias("npm", "echo \"using pnpm\"; pnpm"),
  setAlias("pn", "pnpm"),
]);
const ADL = withPlatform(packages.adl("1.1.12"));
const RADL = withPlatform(radlc("millergarym","0.0.10"));

export async function main() {
  if (Deno.args.length != 1) {
    console.error("Usage: local-setup LOCALDIR");
    Deno.exit(1);
  }
  const localdir = Deno.args[0];


  const installs = [
    DENO,
    NODE,
    ADL,
    RADL,
    PNPM,
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

# Usage

In a project, just source the shell script:

```
$ . deno/local-setup.sh
```

This will download the tools, install them to `.local` and put them on
the path in the current shell.

# Local Dev

To work on and use a local version of local-setup you can do the following;
* [fork the repo](https://github.com/adl-lang/local-setup/fork) and clone it (potentially as a git submodule)
* use an `import` in override the `deno.json` file to override the deno package with your local copy.

For example if your fork was clone as a submodule into `deno/patched/local-setup` your `deno.json` would look like;

``` json
{
    "lock": "./deno/deno.lock",
    "imports": {
        "https://deno.land/x/adllang_localsetup@v0.6/": "./deno/patched/local-setup/"
    }
}
```