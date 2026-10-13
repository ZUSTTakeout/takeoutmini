import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const appRoot = new URL("../", import.meta.url);
const output = new URL("src/static/tabbar/", appRoot);
const paths = JSON.parse(await readFile(new URL("src/components/icons/paths.json", appRoot), "utf8"));
const theme = await readFile(new URL("src/styles/theme.css", appRoot), "utf8");
const color = (name) => {
  const value = theme.match(new RegExp("--color-" + name + ":\\s*(#[a-fA-F0-9]+)"))?.[1];
  if (!value) throw new Error("Missing theme color: " + name);
  return value;
};
await mkdir(output, { recursive: true });
for (const name of ["restaurant", "orders", "user"]) {
  for (const selected of [false, true]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" color="${color(selected ? "brand" : "text-secondary")}" stroke="currentColor" stroke-width="${selected ? 2.1 : 1.7}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(name + (selected ? "-active" : "") + ".png", output)));
  }
}
const pagesUrl = new URL("src/pages.json", appRoot);
const pages = JSON.parse(await readFile(pagesUrl, "utf8"));
pages.globalStyle.navigationBarBackgroundColor = color("background");
pages.globalStyle.backgroundColor = color("background");
pages.tabBar.color = color("text-secondary");
pages.tabBar.selectedColor = color("brand");
pages.tabBar.backgroundColor = color("surface");
["restaurant", "orders", "user"].forEach((name, i) => {
  pages.tabBar.list[i].iconPath = `static/tabbar/${name}.png`;
  pages.tabBar.list[i].selectedIconPath = `static/tabbar/${name}-active.png`;
});
await writeFile(pagesUrl, JSON.stringify(pages, null, 2) + "\n");
console.log("Generated six tabBar icons from the shared SVG set and theme.");
