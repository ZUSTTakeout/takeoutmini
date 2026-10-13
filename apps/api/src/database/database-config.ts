type DatabaseEnvironment = Record<string, string | undefined>;

function required(environment: DatabaseEnvironment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} 必须配置`);
  return value;
}

function firstConfigured(
  environment: DatabaseEnvironment,
  ...names: string[]
): string | undefined {
  return names.map((name) => environment[name]?.trim()).find(Boolean);
}

export function databaseUrlFromEnv(
  environment: DatabaseEnvironment = process.env,
): string {
  const directUrl = environment.DATABASE_URL?.trim();
  if (directUrl) return directUrl;

  const host =
    firstConfigured(environment, "DATABASE_HOST", "MYSQL_HOST") ?? "127.0.0.1";
  const port = Number(
    firstConfigured(environment, "DATABASE_PORT", "MYSQL_PORT") ?? "13306",
  );
  const database =
    firstConfigured(environment, "DATABASE_NAME", "MYSQL_DATABASE") ??
    required(environment, "DATABASE_NAME");
  const user =
    firstConfigured(environment, "DATABASE_USER", "MYSQL_USER") ??
    required(environment, "DATABASE_USER");
  const password =
    firstConfigured(environment, "DATABASE_PASSWORD", "MYSQL_PASSWORD") ??
    required(environment, "DATABASE_PASSWORD");

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DATABASE_PORT 必须是 1 到 65535 之间的整数");
  }
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("DATABASE_NAME 只能包含字母、数字和下划线");
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(host)) {
    throw new Error("DATABASE_HOST 格式不正确");
  }

  const address = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${address}:${port}/${database}`;
}
