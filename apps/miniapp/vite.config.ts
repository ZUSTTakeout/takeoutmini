import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const mockEnabled = (process.env.VITE_MOCK_ENABLED ?? env.VITE_MOCK_ENABLED) === "true";
  return {
    plugins: [uni()],
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
