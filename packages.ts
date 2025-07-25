import * as path from "@std/path";
import * as fs from "@std/fs";
import {
  binary,
  cachedDownload,
  denoInstallable,
  exec,
  DownloadFile,
  Installable,
  mapPlatform,
  MultiPlatform,
  setVariable,
  addToPath,
  unPackage,
  tarPackage,
  unzip,
  withEnv,
  zippedBinary,
  zippedPackage,
} from "./setuputils.ts";

// Deno installable
export function deno(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://github.com/denoland/deno/releases/download/v${version}/deno-x86_64-unknown-linux-gnu.zip`,
      cachedName: `deno-v${version}-x86_64-unknown-linux-gnu.zip`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/denoland/deno/releases/download/v${version}/deno-x86_64-apple-darwin.zip`,
      cachedName: `deno-v${version}-x86_64-apple-darwin.zip`,
    },
    darwin_aarch64: {
      url:
        `https://github.com/denoland/deno/releases/download/v${version}/deno-aarch64-apple-darwin.zip`,
      cachedName: `deno-v${version}-aarch64-apple-darwin.zip`,
    },
  };

  function env(localdir: string) {
    return [
      setVariable("DENO_INSTALL", localdir),
      setVariable("DENO_INSTALL_ROOT", localdir),
    ]
  }

  function install(url: DownloadFile) {
    return withEnv(zippedBinary(url), env);
  }

  return mapPlatform(urls, install);
}

// nodejs installable
export function nodejs(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://nodejs.org/dist/v${version}/node-v${version}-linux-x64.tar.xz`,
      cachedName: `node-v${version}-linux-x64.tar.xz`,
    },
    darwin_x86_64: {
      url:
        `https://nodejs.org/dist/v${version}/node-v${version}-darwin-x64.tar.gz`,
      cachedName: `node-v${version}-darwin-x64.tar.gz`,
    },
    darwin_aarch64: {
      url:
        `https://nodejs.org/dist/v${version}/node-v${version}-darwin-arm64.tar.gz`,
      cachedName: `node-v${version}-darwin-arm64.tar.gz`,
    },
  };

  return {
    linux_x86_64: withEnv(tarPackage(urls.linux_x86_64, '--xz'), (localdir) => [
      addToPath(path.join(localdir,`node-v${version}-linux-x64/bin`)),
    ]),
    darwin_x86_64: withEnv(tarPackage(urls.darwin_x86_64, '--gzip'), (localdir) => [
      addToPath(path.join(localdir,`node-v${version}-darwin-x64/bin`)),
    ]),
    darwin_aarch64: urls.darwin_aarch64 ? withEnv(tarPackage(urls.darwin_aarch64, '--gzip'), (localdir) => [
      addToPath(path.join(localdir,`node-v${version}-darwin-arm64/bin`)),
    ]) : undefined,
  }
}

// pnpm installable
export function pnpm(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url: `https://github.com/pnpm/pnpm/releases/download/v${version}/pnpm-linux-x64`,
      cachedName: `pnpm-linux-x64.${version}`,
    },
    darwin_x86_64: {
      url: `https://github.com/pnpm/pnpm/releases/download/v${version}/pnpm-macos-x64`,
      cachedName: `pnpm-darwin-x64.${version}`,
    },
    darwin_aarch64: {
      url: `https://github.com/pnpm/pnpm/releases/download/v${version}/pnpm-macos-arm64`,
      cachedName: `pnpm-darwin-arm64.${version}`,
    }
  };

  function install(url: DownloadFile) {
    return withEnv(binary(url, "pnpm"), (localdir) => [
      addToPath(path.join(localdir, "pnpm", "bin")),
      setVariable("PNPM_HOME", path.join(localdir, "pnpm", "bin")),
    ]);
  }

  return mapPlatform(urls, install);
}

// adoptopenjdk installable
export function adoptopenjdk(version: string): MultiPlatform<Installable> {
  const major = version.substring(0, version.indexOf("."))
  const uversion = version.replace('+','_');
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://github.com/adoptium/temurin${major}-binaries/releases/download/jdk-${version}/OpenJDK${major}U-jdk_x64_linux_hotspot_${uversion}.tar.gz`,
      cachedName: `OpenJDK${major}U-jdk_x64_linux_hotspot_${uversion}.tar.gz`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/adoptium/temurin${major}-binaries/releases/download/jdk-${version}/OpenJDK${major}U-jdk_x64_mac_hotspot_${uversion}.tar.gz`,
      cachedName: `OpenJDK${major}U-jdk_x64_mac_hotspot_${uversion}.tar.gz`,
    },
  };

  return {
    linux_x86_64:
      withEnv(tarPackage(urls.linux_x86_64, '--gzip'), (localdir) => [
        setVariable("JAVA_HOME", path.join(localdir, `jdk-${version}`)),
        addToPath(path.join(localdir,  `jdk-${version}/bin`)),
      ]),
    darwin_x86_64:
      // Sigh... the macos jdk has Contents/Home as a prefix in the tar file,
      withEnv(tarPackage(urls.darwin_x86_64, '--gzip'), (localdir) => [
        setVariable("JAVA_HOME", path.join(localdir, `jdk-${version}/Contents/Home`)),
        addToPath(path.join(localdir,  `jdk-${version}/Contents/Home/bin`)),
      ]),
  }
}

// bazel installable
export function bazel(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://github.com/bazelbuild/bazel/releases/download/${version}/bazel-${version}-installer-linux-x86_64.sh`,
      cachedName: `bazel-${version}-installer-linux-x86_64.sh`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/bazelbuild/bazel/releases/download/${version}/bazel-${version}-installer-darwin-x86_64.sh`,
      cachedName: `bazel-${version}-installer-darwin-x86_64.sh`,
    },
  };

  function install(url: DownloadFile): Installable {
    return {
      manifestName: url.cachedName,
      install: async (localdir: string): Promise<void> => {
        const shellscript = await cachedDownload(url);
        console.log(`installing ${url.cachedName}`);
        const installdir = path.join(localdir, `bazel-${version}`)
        await exec('/bin/bash', [shellscript, `--prefix=${installdir}`])
        await fs.ensureSymlink(
          path.join(installdir, "bin/bazel"),
          path.join(localdir, "bin/bazel"),
        );
      },
      env: () => [],
    }
  }

  return mapPlatform(urls, install);
}

// gradle installable
export function gradle(version: string): Installable {
  const url: DownloadFile = {
    url:
    `https://services.gradle.org/distributions/gradle-${version}-bin.zip`,
    cachedName: `gradle-${version}-bin.zip`,
  }

  return withEnv(zippedPackage(url), (localdir) => [
    addToPath(path.join(localdir,`gradle-${version}/bin`)),
  ])
}

// yarn installable
export function yarn(version: string): Installable {
  const url: DownloadFile = {
    url:
      `https://github.com/yarnpkg/yarn/releases/download/v${version}/yarn-v${version}.tar.gz`,
    cachedName: `yarn-v${version}.tar.gz`,
  }

  return withEnv(tarPackage(url, '--gzip'), (localdir) => [
    addToPath(path.join(localdir,`yarn-v${version}/bin`)),
  ])
}

// Terraform installable
export function terraform(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://releases.hashicorp.com/terraform/${version}/terraform_${version}_linux_amd64.zip`,
      cachedName: `terraform_${version}_linux_amd64.zip`,
    },
    darwin_x86_64: {
      url:
        `https://releases.hashicorp.com/terraform/${version}/terraform_${version}_darwin_amd64.zip`,
      cachedName: `terraform_${version}_darwin_amd64.zip`,
    },
  };

  return mapPlatform(urls, zippedBinary);
}

// standard ADL tooling
export function adl(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://github.com/adl-lang/adl/releases/download/v${version}/adl-bindist-${version}-linux-x64.zip`,
      cachedName: `adl-bindist-${version}-linux-x64.zip`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/adl-lang/adl/releases/download/v${version}/adl-bindist-${version}-macos-x64.zip`,
      cachedName: `adl-bindist-${version}-macos-x64.zip`,
    },
    darwin_aarch64: {
      url:
        `https://github.com/adl-lang/adl/releases/download/v${version}/adl-bindist-${version}-macos-arm64.zip`,
      cachedName: `adl-bindist-${version}-macos-arm64.zip`,
    },
  };

  return mapPlatform(urls, zippedPackage);
}

// AWS cli
export function awscli(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url:
        `https://awscli.amazonaws.com/awscli-exe-linux-x86_64-${version}.zip`,
      cachedName: `awscli-exe-linux-x86_64-${version}.zip`,
    },
    darwin_x86_64: {
      url: `https://awscli.amazonaws.com/AWSCLIV2-${version}.pkg`,
      cachedName: `AWSCLIV2-${version}.pkg`,
    },
  };

  return {
    // Irritatingly, we have different packaging on macos vs linux
    linux_x86_64: {
      manifestName: urls.linux_x86_64.cachedName,
      install: async (localdir: string): Promise<void> => {
        const zipfile = await cachedDownload(urls.linux_x86_64);
        await unzip(zipfile, path.join(localdir, "lib"));
        await fs.ensureSymlink(
          path.join(localdir, "lib/aws/dist/aws"),
          path.join(localdir, "bin/aws"),
        );
        await fs.ensureSymlink(
          path.join(localdir, "lib/aws/dist/aws_completer"),
          path.join(localdir, "bin/aws_completer"),
        );
      },
      env: () => [],
    },
    darwin_x86_64: {
      manifestName: urls.darwin_x86_64.cachedName,
      install: async (localdir: string): Promise<void> => {
        const pkgfile = await cachedDownload(urls.darwin_x86_64);
        await unPackage(pkgfile, path.join(localdir, "lib"));
        await fs.ensureSymlink(
          path.join(localdir, "lib/aws-cli/aws"),
          path.join(localdir, "bin/aws"),
        );
        await fs.ensureSymlink(
          path.join(localdir, "lib/aws-cli/aws_completer"),
          path.join(localdir, "bin/aws_completer"),
        );
      },
      env: () => [],
    },
  };
}

// AWS cli
export function aws_vault(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url: `https://github.com/ByteNess/aws-vault/releases/download/v${version}/aws-vault-linux-amd64`,
      cachedName: `aws-vault-linux-amd64-ByteNess${version}`,
    },
    darwin_x86_64: {
      url: `https://github.com/ByteNess/aws-vault/releases/download/v${version}/aws-vault-darwin-amd64`,
      cachedName: `aws-vault-darwin-amd64-ByteNess${version}`,
    },
    darwin_aarch64: {
      url: `https://github.com/ByteNess/aws-vault/releases/download/v${version}/aws-vault-darwin-arm64`,
      cachedName: `aws-vault-darwin-arm64-ByteNess${version}`,
    }
  };

  return {
    linux_x86_64: {
      manifestName: urls.linux_x86_64.cachedName,
      install: binary(urls.linux_x86_64, 'aws-vault').install,
      env: () => [],
    },
    darwin_x86_64: {
      manifestName: urls.darwin_x86_64.cachedName,
      install: binary(urls.darwin_x86_64, 'aws-vault').install,
      env: () => [],
    },
    darwin_aarch64: {
      manifestName: urls.darwin_aarch64!.cachedName,
      install: binary(urls.darwin_aarch64!, 'aws-vault').install,
      env: () => [],
    },
  };

  // // leaving this here as a example of how to use a dmg file

  // async function cpFromDmg(dmgfile: string, localdir: string): Promise<void> {
  //   console.log(`coping from dmg ${dmgfile}`);
  //   // hdiutil attach {path_to_dmg} -mountpoint /Volumes/{mount_name}
  //   await exec("hdiutil", [
  //       "attach",
  //       dmgfile,
  //       "-mountpoint",
  //       `/Volumes/aws-vault-${version}`,
  //     ]
  //   );
  //   const target = path.join(localdir, "bin/aws-vault");
  //   await Deno.copyFile(`/Volumes/aws-vault-${version}/aws-vault`, target);
  //   await Deno.chmod(target, 0o755);
  //   // hdiutil detach /Volumes/{mount_name}
  //   await exec("hdiutil", [
  //       "detach",
  //       `/Volumes/aws-vault-${version}`,
  //     ]
  //   );
  // }
}

// for current versions see https://console.cloud.google.com/storage/browser/cloud-sdk-release;tab=objects?pageState=(%22StorageObjectListTable%22:(%22f%22:%22%255B%255D%22,%22s%22:%5B(%22i%22:%22objectListDisplayFields%2FtimeCreated%22,%22s%22:%221%22),(%22i%22:%22displayName%22,%22s%22:%220%22)%5D))&prefix=&forceOnObjectsSortingFiltering=true
export function gcloud(version: string): MultiPlatform<Installable> {
  const urls : MultiPlatform<DownloadFile> =
  {
    linux_x86_64: {
      url: `https://storage.googleapis.com/cloud-sdk-release/google-cloud-cli-${version}-linux-x86_64.tar.gz`,
      cachedName: `google-cloud-cli-${version}-linux-x86_64.tar.gz`,
    },
    darwin_x86_64: {
      url: `https://storage.googleapis.com/cloud-sdk-release/google-cloud-cli-${version}-darwin-x86_64.tar.gz`,
      cachedName: `google-cloud-cli-${version}-darwin-x86_64.tar.gz`,
    },
    darwin_aarch64: {
      url: `https://storage.googleapis.com/cloud-sdk-release/google-cloud-cli-${version}-darwin-arm.tar.gz`,
      cachedName: `google-cloud-cli-${version}-darwin-arm.tar.gz`,
    },
  };

  return mapPlatform(urls, url => withEnv(tarPackage(url, '--gzip'), (localdir) => [
    addToPath(path.join(localdir,`google-cloud-sdk/bin`)),
  ]));
}

// Foundry
//
export function foundry(version: string): MultiPlatform<Installable> {
  const urls : MultiPlatform<DownloadFile> =
  {
    linux_x86_64: {
      url: `https://github.com/foundry-rs/foundry/releases/download/${version}/foundry_nightly_linux_amd64.tar.gz`,
      cachedName: `foundry_${version}_linux_amd64.tar.gz`,
    },
    darwin_x86_64: {
      url: `https://github.com/foundry-rs/foundry/releases/download/${version}/foundry_nightly_darwin_amd64.tar.gz`,
      cachedName: `foundry_${version}_darwin_amd64.tar.gz`,
    },
  };

  return mapPlatform(urls, url => tarPackage(url, '--gzip', 'bin'));
}


// Pulumi
//
export function pulumi(version: string): MultiPlatform<Installable> {
  const urls : MultiPlatform<DownloadFile> =
  {
    linux_x86_64: {
      url: `https://get.pulumi.com/releases/sdk/pulumi-v${version}-linux-x64.tar.gz`,
      cachedName: `pulumi-v${version}-linux-x64.tar.gz`,
    },
    darwin_x86_64: {
      url: `https://get.pulumi.com/releases/sdk/pulumi-v${version}-darwin-x64.tar.gz`,
      cachedName: `pulumi-v${version}-darwin-x64.tar.gz`,
    },
    darwin_aarch64: {
      url: `https://get.pulumi.com/releases/sdk/pulumi-v${version}-darwin-arm64.tar.gz`,
      cachedName: `pulumi-v${version}-darwin-arm64.tar.gz`
    },
  };

  return mapPlatform(urls, url => withEnv(tarPackage(url, '--gzip'), (localdir) => [
    addToPath(path.join(localdir,`pulumi`)),
  ]));
}

export function dnit(version: string): Installable {
  return denoInstallable(
    "dnit",
    `https://deno.land/x/dnit@dnit-v${version}/main.ts`,
  );
}

export function taskfile(version: string): MultiPlatform<Installable> {
  const urls : MultiPlatform<DownloadFile> =
  {
    linux_x86_64: {
      url: `https://github.com/go-task/task/releases/download/v${version}/task_linux_386.tar.gz`,
      cachedName: `task_v${version}_linux_386.tar.gz`,
    },
    darwin_x86_64: {
      url: `https://github.com/go-task/task/releases/download/v${version}/task_darwin_amd64.tar.gz`,
      cachedName: `task_v${version}_darwin_amd64.tar.gz`,
    },
  };

  return mapPlatform(urls, url => withEnv(tarPackage(url, '--gzip', `taskfile`), (localdir) => [
    addToPath(path.join(localdir,`taskfile`)),
    // todo add completion eg. add to local-env
    // fpath+=`${localdir}/taskfile/completion/zsh`
    // see https://taskfile.dev/installation/#setup-completions
  ]));
}

export function bun(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> =
  {
    linux_x86_64: {
      url: `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-linux-x64.zip`,
      cachedName: `bun-${version}-linux-x64.zip`,
    },
    darwin_x86_64: {
      url: `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-darwin-x64.zip`,
      cachedName: `bun-${version}-darwin-x64.zip`,
    },
    darwin_aarch64: {
      url:
        `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-darwin-aarch64.zip`,
      cachedName: `bun-${version}-darwin-aarch64.zip`,
    },
  };

  function install(url: DownloadFile): Installable {
    return {
      manifestName: url.cachedName,
      install: async (localdir: string): Promise<void> => {
        const zipFile = await cachedDownload(url);
        await unzip(zipFile, localdir);
        if ( url.cachedName.endsWith("darwin-x64.zip") ) {
          await fs.ensureSymlink(
            path.join(localdir, "bun-darwin-x64/bun"),
            path.join(localdir, "bin/bun"),
          );
        }
        if ( url.cachedName.endsWith("darwin-aarch64.zip") ) {
          await fs.ensureSymlink(
            path.join(localdir, "bun-darwin-aarch64/bun"),
            path.join(localdir, "bin/bun"),
          );
        }
        if ( url.cachedName.endsWith("linux-x64.zip") ) {
          await fs.ensureSymlink(
            path.join(localdir, "bun-linux-x64/bun"),
            path.join(localdir, "bin/bun"),
          );
        }
      },
      env: () => [],
    }
  }

  return mapPlatform(urls, install);
}

export function act(version: string): MultiPlatform<Installable> {
  const urls: MultiPlatform<DownloadFile> = {
    linux_x86_64: {
      url: `https://github.com/nektos/act/releases/download/v${version}/act_Linux_x86_64.tar.gz`,
      cachedName: `act_${version}_Linux_x86_64.tar.gz`,
    },
    darwin_x86_64: {
      url: `https://github.com/nektos/act/releases/download/v${version}/act_Darwin_x86_64.tar.gz`,
      cachedName: `act_${version}_Darwin_x86_64.tar.gz`,
    },
    darwin_aarch64: {
      url: `https://github.com/nektos/act/releases/download/v${version}/act_Darwin_arm64.tar.gz`,
      cachedName: `act_${version}_Darwin_arm64.tar.gz`,
    },
  };

  return mapPlatform(urls, (url) => {
    // act untars as a binary with a README and LICENSE which we preserve in a scoped folder
    return withEnv(tarPackage(url, "--gzip", "act"), (localdir) => [
      addToPath(path.join(localdir, "act")),
    ]);
  });
}

// lefthook
// there are gzipped available, but local-setup can't deal with those, so downloading binaries
export function leftHook(version: string): MultiPlatform<Installable> {
  const urls: Required<MultiPlatform<DownloadFile>> = {
    linux_x86_64: {
      url:
        `https://github.com/evilmartians/lefthook/releases/download/v${version}/lefthook_${version}_Linux_x86_64`,
      cachedName: `lefthook-bindist-linux_x86_64-${version}`,
    },
    darwin_x86_64: {
      url:
        `https://github.com/evilmartians/lefthook/releases/download/v${version}/lefthook_${version}_MacOS_x86_64`,
      cachedName: `lefthook-bindist-darwin_x86_64-${version}`,
    },
    darwin_aarch64: {
      url:
        `https://github.com/evilmartians/lefthook/releases/download/v${version}/lefthook_${version}_MacOS_arm64`,
      cachedName: `lefthook-bindist-darwin_aarch64-${version}`,
    },
  };
  return {
    linux_x86_64:
      binary(urls.linux_x86_64, "lefthook"),
    darwin_x86_64:
      binary(urls.darwin_x86_64, "lefthook"),
    darwin_aarch64:
      binary(urls.darwin_aarch64, "lefthook"),
  }
}

