export * as packages from './packages.ts';
export {
    addToPath, binary, cachedDownload, denoInstallable, exec, forPlatform, getHostPlatform,
    installTo, mapPlatform, setAlias, setVariable, tarPackage, unPackage, unzip, withEnv,
    withPostInstall, zippedBinary, zippedPackage
} from './setuputils.ts';
export type { DownloadFile, Installable, MultiPlatform } from './setuputils.ts';
