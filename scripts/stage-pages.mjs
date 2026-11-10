import { copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "pages-dist");

await mkdir(resolve(root, "assets"), { recursive: true });
await cp(resolve(output, "assets"), resolve(root, "assets"), { recursive: true, force: true });
for (const name of ["index.html", "favicon.svg", "manifest.webmanifest"]) {
  await copyFile(resolve(output, name), resolve(root, name));
}
await writeFile(resolve(root, ".nojekyll"), "");
console.log("GitHub Pages files staged in repository root.");
