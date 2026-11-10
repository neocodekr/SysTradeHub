import { copyFile, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "pages-dist");

await mkdir(resolve(root, "assets"), { recursive: true });
await cp(resolve(output, "assets"), resolve(root, "assets"), { recursive: true, force: true });
const currentAssets = new Set(await readdir(resolve(output, "assets")));
for (const name of await readdir(resolve(root, "assets"))) {
  if (/^index-[\w-]+\.(js|css)$/.test(name) && !currentAssets.has(name)) {
    await rm(resolve(root, "assets", name));
  }
}
for (const name of ["index.html", "favicon.svg", "manifest.webmanifest", "global-markets.json"]) {
  await copyFile(resolve(output, name), resolve(root, name));
}
await writeFile(resolve(root, ".nojekyll"), "");
console.log("GitHub Pages files staged in repository root.");
