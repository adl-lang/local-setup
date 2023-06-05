import { readerFromStreamReader } from "https://deno.land/std@0.105.0/io/mod.ts";
import * as path from "https://deno.land/std@0.105.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.105.0/fs/mod.ts";

// Variants of something that depends on platform
export type MultiPlatform<T> = {
  darwin_x86_64: T;
  linux_x86_64: T;
};

export type Platform = keyof MultiPlatform<unknown>;

// A location fron which we can download a file, and the name under which
// to cache it locally
export interface DownloadFile {
  url: string;
  cachedName: string;
}

// Something can be installed into the local environment
export interface Installable {
  // The (name including the version)
  manifestName: string;

  // The action to install it
  install(localdir: String): Promise<void>;

  // Any environment variables upon which the installed thing depends.
  env(localdir: String): EnvAction[];
}

type EnvAction 
  = {kind: 'setVariable', variable: string, value: string}
  | {kind: 'addToPath', directory: string}

export function setVariable( variable: string, value: string) : EnvAction {
  return {kind:'setVariable', variable, value};
}

export function addToPath(directory: string) : EnvAction {
  return {kind:'addToPath',directory};
}

export function forPlatform<T>(multi: MultiPlatform<T>, platform: Platform): T {
  return multi[platform];
}

export function mapPlatform<A, B>(
  multi: MultiPlatform<A>,
  fn: (a: A) => B,
): MultiPlatform<B> {
  return {
    darwin_x86_64: fn(multi.darwin_x86_64),
    linux_x86_64: fn(multi.linux_x86_64),
  };
}

export function getHostPlatform(): Platform {
  if (Deno.build.os === "linux" && Deno.build.arch === "x86_64") {
    return "linux_x86_64";
  } else if (Deno.build.os === "darwin" && Deno.build.arch === "x86_64") {
    return "darwin_x86_64";
  } else if (Deno.build.os === "darwin" && Deno.build.arch === "aarch64") {
    // M1 Macs are compatible with Intel binaries via Rosetta
    // todo(alex): Investigate sourcing of ARM specific builds (with fallback)
    return "darwin_x86_64";
  } else {
    throw new Error(
      `Platform ${Deno.build.os}-${Deno.build.arch} not supported`,
    );
  }
}

// Augment an installable with additional environment variables
export function withEnv(
  i: Installable,
  env: (localdir: string) => EnvAction[],
): Installable {
  return {
    manifestName: i.manifestName,
    install: i.install,
    env: (localdir: string) => (
      [
        ...i.env(localdir),
        ...env(localdir),
      ]
    ),
  };
}

// Augment an installable with an action to run post install
export function withPostInstall(
  i: Installable,
  action: (localdir: string) => Promise<void>,
): Installable {
  return {
    manifestName: i.manifestName,
    install:  async (localdir: string): Promise<void> => {
      await i.install(localdir)
      await action(localdir)
    },
    env: i.env,
  };
}

export function zippedBinary(dfile: DownloadFile): Installable {
  return {
    manifestName: dfile.cachedName,
    install: async (localdir: string): Promise<void> => {
      const zipfile = await cachedDownload(dfile);
      await unzip(zipfile, path.join(localdir, "bin"));
    },
    env: () => [],
  };
}

export function binary(dfile: DownloadFile, name: string): Installable {
  return {
    manifestName: dfile.cachedName,
    install: async (localdir: string): Promise<void> => {
      const src = await cachedDownload(dfile);
      const target = path.join(localdir, "bin", name);
      await Deno.copyFile(src, target);
      await Deno.chmod(target, 0o755);
    },
    env: () => [],
  };
}

export function zippedPackage(
  dfile: DownloadFile,
  reldir?: string,
): Installable {
  return {
    manifestName: dfile.cachedName,
    install: async (localdir: string): Promise<void> => {
      const zipfile = await cachedDownload(dfile);
      let targetpath = localdir;
      if (reldir) {
        targetpath = path.join(targetpath, reldir);
      }
      await unzip(zipfile, targetpath);
    },
    env: () => [],
  };
}

export function tarPackage(
  dfile: DownloadFile,
  compression: TarCompression,
  reldir?: string,
): Installable {
  return {
    manifestName: dfile.cachedName,
    install: async (localdir: string): Promise<void> => {
      const tarfile = await cachedDownload(dfile);
      let targetpath = localdir;
      if (reldir) {
        targetpath = path.join(targetpath, reldir);
      }
      await untar(tarfile, targetpath, compression);
    },
    env: () => [],
  };
}

/// Returns the users download cache directory, creating it if necessary
export async function getDownloadCacheDir(): Promise<string> {
  let cachedir: string;
  let homedir = Deno.env.get("HOME");
  if (homedir === undefined) {
    throw new Error("$HOME not defined");
  }
  switch (getHostPlatform()) {
    case "darwin_x86_64":
      cachedir = path.join(homedir, "Library/Caches/localtools");
      break;
    case "linux_x86_64":
      cachedir = path.join(homedir, ".cache/localtools");
      break;
  }
  await fs.ensureDir(cachedir);
  return cachedir;
}

/// Download a file to the cache if it's not already present. Return
/// the path of the file in the cache.
export async function cachedDownload(
  downloadFile: DownloadFile,
): Promise<string> {
  const cachedir = await getDownloadCacheDir();
  const cachePath = path.join(cachedir, downloadFile.cachedName);
  const cacheFileExists = await fs.exists(cachePath);

  if (!cacheFileExists) {
    console.log(`fetching ${downloadFile.url}`);
    const rsp = await fetch(downloadFile.url);
    const rdr = rsp.body?.getReader();
    if (rdr) {
      const r = readerFromStreamReader(rdr);
      const f = await Deno.open(cachePath, { create: true, write: true });
      await Deno.copy(r, f);
      f.close();
    }
  }
  return cachePath;
}

/** Unzip a file to a directory */
export async function unzip(zippath: string, todir: string): Promise<void> {
  console.log(`unzipping ${zippath}`);
  await fs.ensureDir(todir);
  const proc = Deno.run({
    cmd: ["unzip", "-o", "-q", zippath, "-d", todir],
  },
  );
  const status = await proc.status();
  if (!status.success) {
    throw new Error("Failed to run unzip");
  }
}

/** Unzip a file to a directory */
export async function exec(opt: Deno.RunOptions ): Promise<void> {
  const proc = Deno.run(opt);
  const status = await proc.status();
  if (!status.success) {
    throw new Error("Failed to run cmd");
  }
}

type TarCompression = '--gzip' | '--xz';

/** Untar a file to a directory */
export async function untar(tarpath: string, todir: string, compression: TarCompression): Promise<void> {
  console.log(`untarring ${tarpath}`);
  await fs.ensureDir(todir);
  const proc = Deno.run({
    cmd: ["tar", "--extract", compression, "-f", tarpath, "--directory", todir],
  });
  const status = await proc.status();
  if (!status.success) {
    throw new Error("Failed to run unzip");
  }
}


export async function unPackage(pkgpath: string, todir: string): Promise<void> {
  console.log(`unpacking ${pkgpath}`);
  await fs.ensureDir(todir);
  // Crappy xml to install a pkg file in a custom locations
  // see https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-mac.html#cliv2-mac-install-cmd
  const choicesxml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
      <array>
        <dict>
          <key>choiceAttribute</key>
          <string>customLocation</string>
          <key>attributeSetting</key>
          <string>${todir}</string>
          <key>choiceIdentifier</key>
          <string>default</string>
        </dict>
      </array>
    </plist>
  `;
  const choicesxmlpath = await Deno.makeTempFile({ suffix: ".xml" });
  await Deno.writeTextFile(choicesxmlpath, choicesxml);

  const proc = Deno.run({
    cmd: [
      "installer",
      "-pkg",
      pkgpath,
      "-target",
      "CurrentUserHomeDirectory",
      "-applyChoiceChangesXML",
      choicesxmlpath,
    ],
  });
  const status = await proc.status();
  if (!status.success) {
    throw new Error("Failed to run unzip");
  }
}

export function envPathContainsLocalBin(localdir: string): boolean {
  const path = Deno.env.get("PATH");
  if (path === undefined) {
    throw new Error("$PATH not defined");
  }
  const pathElements = path.split(":");
  const localBinDir = localdir + "/bin";
  return pathElements.indexOf(localBinDir) !== -1;
}

export function ensurePathContainsLocalBin(localdir: string) {
  if (!envPathContainsLocalBin(localdir)) {
    const localBinDir = localdir + "/bin";

    if (!fs.existsSync(localBinDir)) {
      throw new Error(
        ".local/bin does not exist. Did you forget to run `source tools/local-setup.sh`",
      );
    }

    const path = Deno.env.get("PATH");
    Deno.env.set("PATH", localBinDir + (path == undefined ? "" : ":" + path));
  }
}

export function denoInstallable(name: string, url: string): Installable {
  return {
    manifestName: url,
    install: async (localdir: string) => {
      await denoInstall(localdir, name, url);
    },
    env: () => [],
  };
}

export async function denoInstall(
  localdir: string,
  name: string,
  url: string,
): Promise<void> {
  console.log(`installing ${url}`);
  const proc = Deno.run({
    cmd: [
      "deno",
      "install",
      "--quiet",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--unstable",
      "-f",
      "--root",
      localdir,
      "--name",
      name,
      url,
    ],
  });
  const status = await proc.status();
  if (!status.success) {
    throw new Error("Failed to deno install " + url);
  }
}

export async function checkManifest(
  installs: Installable[],
  localdir: string,
): Promise<boolean> {
  const manifestpath = path.join(localdir, ".manifest");
  if (!await fs.exists(manifestpath)) {
    return false;
  }
  const existing: string[] = JSON.parse(await Deno.readTextFile(manifestpath));
  const needed: string[] = installs.map((i) => i.manifestName);
  needed.sort();
  return existing.length == needed.length &&
    needed.every((v, i) => v == existing[i]);
}

export async function writeManifest(
  installs: Installable[],
  localdir: string,
): Promise<void> {
  const manifestpath = path.join(localdir, ".manifest");
  const needed: string[] = installs.map((i) => i.manifestName);
  needed.sort();
  await Deno.writeTextFile(manifestpath, JSON.stringify(needed, null, 2));
}

export async function writeEnvScript(
  installs: Installable[],
  localdir: string,
): Promise<void> {
  const localenvpath = path.join(localdir, "bin/local-env.sh");
  let lines: string[] = [];
  let pathdirs: string[] = [];
  for (const i of installs) {
    for (const action of i.env(localdir)) {
      switch (action.kind) {
        case 'setVariable':
          lines.push(`export ${action.variable}='${action.value}'\n`)
          break;
        case 'addToPath':
          pathdirs.push(action.directory)
          break;
      }
    }
  }
  lines.sort();
  lines.push('');
  lines.push(`export PATH=${pathdirs.join(':')}:$PATH\n`)
  await Deno.writeTextFile(localenvpath, lines.join(""));
}

/// Install the requested software to the given directory. Only do this
/// if needed, based upon the last written mantifest file.
export async function installTo(installs: Installable[], toDir: string) {
  if (await checkManifest(installs, toDir)) {
    return;
  }
  for (const i of installs) {
    await i.install(toDir);
  }
  await writeEnvScript(installs, toDir);
  await writeManifest(installs, toDir);
}
