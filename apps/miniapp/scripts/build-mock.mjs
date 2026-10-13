import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(appRoot, "dist/build/mp-weixin-mock");
const cli = resolve(appRoot, "node_modules/@dcloudio/vite-plugin-uni/bin/uni.js");
const built = spawnSync(process.execPath, [cli, "build", "-p", "mp-weixin"], {
  cwd: appRoot, stdio: "inherit",
  env: { ...process.env, VITE_MOCK_ENABLED: "true", VITE_DEV_AUTH_ENABLED: "true", UNI_OUTPUT_DIR: output },
});
if (built.status !== 0) process.exit(built.status ?? 1);
const configPath = resolve(output, "project.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const localConfigPath = resolve(appRoot, "../../project.config.json");
if ((!config.appid || config.appid === "touristappid") && existsSync(localConfigPath)) {
  const localConfig = JSON.parse(readFileSync(localConfigPath, "utf8"));
  if (localConfig.appid) config.appid = localConfig.appid;
}
config.projectname = "campus-food-preview";
config.setting.urlCheck = false;
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log("Mock 构建完成：" + output);
