import {
  packages,
  forPlatform,
  installTo,
  getHostPlatform
} from "../mod.ts";


const PREK = packages.prek("0.3.2");

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
    forPlatform(PREK, platform),
  ];

  await installTo(installs, localdir);
}

await main();
