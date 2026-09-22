const { databaseUrlFromEnv } = require("../dist/database-config");

describe("database configuration", () => {
  test("uses an explicit DATABASE_URL when provided", () => {
    expect(
      databaseUrlFromEnv({ DATABASE_URL: "mysql://user:pass@db:3306/app" }),
    ).toBe("mysql://user:pass@db:3306/app");
  });

  test("builds and encodes a URL from explicit server parameters", () => {
    expect(
      databaseUrlFromEnv({
        DATABASE_HOST: "db.internal",
        DATABASE_PORT: "3307",
        DATABASE_NAME: "campus_food",
        DATABASE_USER: "app@user",
        DATABASE_PASSWORD: "p@ss:word",
      }),
    ).toBe(
      "mysql://app%40user:p%40ss%3Aword@db.internal:3307/campus_food",
    );
  });

  test("rejects missing or malformed server parameters", () => {
    expect(() => databaseUrlFromEnv({})).toThrow("DATABASE_HOST 必须配置");
    expect(() =>
      databaseUrlFromEnv({
        DATABASE_HOST: "localhost",
        DATABASE_PORT: "70000",
        DATABASE_NAME: "campus_food",
        DATABASE_USER: "campus",
        DATABASE_PASSWORD: "secret",
      }),
    ).toThrow("DATABASE_PORT");
  });
});
