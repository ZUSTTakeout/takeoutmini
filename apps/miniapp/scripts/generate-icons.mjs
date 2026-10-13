import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const appRoot = new URL("../", import.meta.url);
const outputDirectory = new URL("src/static/icons/", appRoot);
const catalogPath = new URL("src/icons/catalog.json", appRoot);
const { icons, colors, tabBar } = JSON.parse(await readFile(catalogPath, "utf8"));

if (!Object.keys(icons).length || !Object.keys(colors).length || tabBar.names.some((name) => !(name in icons))) {
  throw new Error("Invalid icon catalog.");
}

await mkdir(outputDirectory, { recursive: true });
await readFile(new URL("LICENSE.txt", outputDirectory));

const createPng = async (icon, name, color, weight = "Outline") => {
  // Resolve currentColor before rasterizing so WeChat uses ordinary local PNGs.
  const svg = icon.toSvg({ size: 96, weight }).replaceAll("currentColor", color);
  await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(`${name}.png`, outputDirectory)));
};

for (const [name, component] of Object.entries(icons)) {
  const { default: icon } = await import(`reicon/icons/${component}`);
  await Promise.all(Object.entries(colors).map(([colorName, color]) =>
    createPng(icon, `${name}-${colorName}`, color),
  ));
  if (tabBar.names.includes(name)) {
    await createPng(icon, `tab-${name}`, tabBar.color);
    await createPng(icon, `tab-${name}-active`, tabBar.selectedColor, "Filled");
  }
}

console.log(`Generated ${Object.keys(icons).length * Object.keys(colors).length + tabBar.names.length * 2} Reicon PNGs.`);
