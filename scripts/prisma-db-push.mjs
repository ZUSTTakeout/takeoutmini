import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = dirname(dirname(fileURLToPath(import.meta.url)));
const apiDirectory = join(workspace, "apps", "api");
loadEnvFile(join(workspace, ".env"));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 必须配置`);
  return value;
}

function databaseUrl() {
  const directUrl = process.env.DATABASE_URL?.trim();
  if (directUrl) return directUrl;

  const host = required("DATABASE_HOST");
  const port = Number(required("DATABASE_PORT"));
  const database = required("DATABASE_NAME");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DATABASE_PORT 必须是 1 到 65535 之间的整数");
  }
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("DATABASE_NAME 只能包含字母、数字和下划线");
  }

  const url = new URL("mysql://localhost");
  url.hostname = host;
  url.port = String(port);
  url.username = required("DATABASE_USER");
  url.password = required("DATABASE_PASSWORD");
  url.pathname = `/${database}`;
  return url.toString();
}

const apiRequire = createRequire(join(apiDirectory, "package.json"));
const prismaCli = apiRequire.resolve("prisma/build/index.js");
const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    "db",
    "push",
    "--schema",
    join(apiDirectory, "prisma", "schema.prisma"),
    "--skip-generate",
  ],
  {
    cwd: workspace,
    env: { ...process.env, DATABASE_URL: databaseUrl() },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
