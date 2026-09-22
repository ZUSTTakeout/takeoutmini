import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { config } from "dotenv";

function environmentFiles(): string[] {
  const explicitPath = process.env.DOTENV_CONFIG_PATH?.trim();
  if (explicitPath) return [resolve(explicitPath)];

  const files = [resolve(process.cwd(), ".env")];
  const apiRoot = resolve(__dirname, "..");
  const appsRoot = resolve(apiRoot, "..");
  if (basename(apiRoot) === "api" && basename(appsRoot) === "apps") {
    files.push(resolve(appsRoot, "..", ".env"));
  }
  return [...new Set(files)];
}

for (const path of environmentFiles()) {
  if (existsSync(path)) config({ path });
}
