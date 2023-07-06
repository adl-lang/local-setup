Utility code to support installing locally scoped development tools

# Project setup

create a `deno.json` file in the root of your project:

```
{
    "lock": "./deno/deno.lock"
}
```

write a typescript file `./deno/local-setup.ts` to specify the tools and versions you need. For
example

```
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

# Usage

In a project, just source the shell script:

```
$ . deno.local-setup.sh
```

This will download the tools, install them to `.local` and put them on
the path in the current shell.
