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
} from "https://deno.land/x/adllang_localsetup@v0.8/mod.ts";

// Rust ADL tooling
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
    // DENO,
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
