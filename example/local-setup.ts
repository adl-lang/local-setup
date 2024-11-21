import {
  packages,
  forPlatform,
  installTo,
  getHostPlatform
} from "../mod.ts";


const NODE = packages.nodejs("22.11.0");
const YARN = packages.yarn("1.22.22");
const PNPM = packages.pnpm("9.14.2");
const ADL = packages.adl("1.2.1");

export async function main() {
  if (Deno.args.length != 2) {
    console.error("Usage: local-setup DENOVERSION LOCALDIR");
    Deno.exit(1);
  }
  const denoVersion = Deno.args[0];
  const localdir = Deno.args[1];

  const platform = getHostPlatform();

  const DENO = packages.deno(denoVersion);

  const installs = [
    forPlatform(DENO, platform),
    forPlatform(NODE, platform),
    forPlatform(ADL, platform),
    forPlatform(PNPM, platform),
    YARN,
  ];

  await installTo(installs, localdir);
}

await main();
