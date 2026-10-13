import { existsSync, readFileSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const mockEnabled = (process.env.VITE_MOCK_ENABLED ?? env.VITE_MOCK_ENABLED) === "true";
  const projectConfigPath = resolve(process.cwd(), "../../project.config.json");
  const projectConfig = existsSync(projectConfigPath)
    ? JSON.parse(readFileSync(projectConfigPath, "utf8")) as { appid?: string }
    : {};
  const appId = process.env.VITE_WECHAT_APP_ID || env.VITE_WECHAT_APP_ID || projectConfig.appid;
  let outputDirectory = "";
  return {
    plugins: [uni(), {
      name: "exclude-mock-assets",
      apply: "build",
      configResolved(config) {
        outputDirectory = resolve(config.root, config.build.outDir);
      },
      // uni:copy 在 writeBundle 完成静态目录复制后，再清理正式包中的演示图片。
      closeBundle: {
        order: "post",
        sequential: true,
        async handler() {
          if (mockEnabled) return;
          const buildDirectory = resolve(process.cwd(), "dist");
          const outputPath = relative(buildDirectory, outputDirectory);
          if (!outputPath || isAbsolute(outputPath) || outputPath === ".." || outputPath.startsWith(`..${sep}`)) {
            throw new Error("Mock 图片清理路径超出小程序构建目录");
          }
          await rm(resolve(outputDirectory, "static/mock-food"), { recursive: true, force: true });
        },
      },
    }, {
      name: "wechat-appid",
      apply: "build",
      closeBundle: {
        order: "post",
        sequential: true,
        async handler() {
          if (!appId || appId === "touristappid") return;
          if (!/^wx[0-9a-f]{16}$/i.test(appId)) throw new Error("微信 AppID 格式不正确");
          const configPath = resolve(outputDirectory, "project.config.json");
          const config = JSON.parse(await readFile(configPath, "utf8"));
          config.appid = appId;
          await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
        },
      },
    }],
    define: {
      "import.meta.env.VITE_MOCK_ENABLED": JSON.stringify(String(mockEnabled)),
    },
    resolve: {
      alias: [{
        find: "../mock",
        replacement: resolve(process.cwd(), mockEnabled ? "src/mock/index.ts" : "src/services/mock-disabled.ts"),
      }],
    },
  };
});
