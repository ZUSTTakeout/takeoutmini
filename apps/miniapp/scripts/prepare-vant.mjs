import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const packageDirectory = resolve(appDirectory, "node_modules/@vant/weapp");
const sourceDirectory = resolve(packageDirectory, "dist");
const targetDirectory = resolve(appDirectory, "src/wxcomponents/vant");
const pages = JSON.parse(await readFile(resolve(appDirectory, "src/pages.json"), "utf8"));
const components = Object.values(pages.globalStyle.usingComponents ?? {})
  .filter((path) => path.startsWith("/wxcomponents/vant/"))
  .map((path) => path.split("/")[3]);
const directories = new Set(["common", "mixins", "wxs", ...components]);

// Native components declare their child components in JSON. Keep that dependency
// closure with the official sources so a build needs no manual npm step in DevTools.
async function collectDependencies(component) {
  const config = JSON.parse(await readFile(resolve(sourceDirectory, component, "index.json"), "utf8"));
  for (const path of Object.values(config.usingComponents ?? {})) {
    const dependency = path.split("/").find((part) => part !== ".." && part !== ".");
    if (dependency && !directories.has(dependency)) {
      directories.add(dependency);
      await collectDependencies(dependency);
    }
  }
}

for (const component of components) await collectDependencies(component);

await mkdir(targetDirectory, { recursive: true });
// 此目录由脚本生成；移除旧依赖，避免按需清单缩减后仍复制进构建产物。
for (const entry of await readdir(targetDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory() || directories.has(entry.name)) continue;
  const obsoleteDirectory = resolve(targetDirectory, entry.name);
  if (dirname(obsoleteDirectory) !== targetDirectory) throw new Error("Vant 清理路径超出生成目录");
  await rm(obsoleteDirectory, { recursive: true, force: true });
}
const extensions = new Set([".js", ".json", ".wxml", ".wxss", ".wxs"]);
for (const directory of directories) {
  await cp(resolve(sourceDirectory, directory), resolve(targetDirectory, directory), {
    recursive: true,
    filter: async (source) => {
      try {
        await readdir(source);
        return true;
      } catch {
        return extensions.has(extname(source));
      }
    },
  });
}
await cp(resolve(packageDirectory, "LICENSE"), resolve(targetDirectory, "LICENSE"));
console.log(`Vant Weapp: prepared ${components.length} components and their dependencies.`);
