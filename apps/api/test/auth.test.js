const { AuthService } = require("../dist/auth");

describe("JWT secret validation", () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  test("rejects the public example secret", () => {
    process.env.JWT_SECRET = "change_me_to_at_least_32_random_characters";
    expect(() => new AuthService({})).toThrow("不能使用示例值");
  });

  test("accepts a configured secret with sufficient length", () => {
    process.env.JWT_SECRET = "test-only-random-secret-0123456789";
    expect(() => new AuthService({})).not.toThrow();
  });
});
