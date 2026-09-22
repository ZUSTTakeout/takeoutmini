require("reflect-metadata");

const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const {
  CreateOrderDto,
  CreateProductDto,
  UpdateProductDto,
} = require("../dist/dto");

const validateBody = (Type, body) =>
  validate(plainToInstance(Type, body), {
    forbidNonWhitelisted: true,
    whitelist: true,
  });

describe("request validation", () => {
  test("accepts a 200-character order remark and rejects 201 characters", async () => {
    const base = {
      shopId: "shop-a",
      items: [{ productId: "product-a", quantity: 1, expectedPrice: 1200 }],
      idempotencyKey: "request-0001",
    };
    await expect(
      validateBody(CreateOrderDto, { ...base, remark: "备".repeat(200) }),
    ).resolves.toHaveLength(0);
    await expect(
      validateBody(CreateOrderDto, { ...base, remark: "备".repeat(201) }),
    ).resolves.not.toHaveLength(0);
  });

  test("rejects unknown input and out-of-range quantities", async () => {
    const errors = await validateBody(CreateOrderDto, {
      shopId: "shop-a",
      items: [
        { productId: "product-a", quantity: 100, expectedPrice: 1200 },
      ],
      idempotencyKey: "request-0001",
      total: 1,
    });
    expect(errors.length).toBeGreaterThan(0);

    await expect(
      validateBody(CreateOrderDto, {
        shopId: "shop-a",
        items: [{ productId: "product-a", quantity: 1 }],
        idempotencyKey: "request-0001",
      }),
    ).resolves.not.toHaveLength(0);
  });

  test("aligns product text boundaries with database columns", async () => {
    const body = {
      name: "菜品",
      price: 1,
      stock: 0,
      categoryId: "category-a",
      description: "介".repeat(500),
      image: `https://example.com/${"a".repeat(2028)}`,
    };
    await expect(validateBody(CreateProductDto, body)).resolves.toHaveLength(0);
    await expect(
      validateBody(CreateProductDto, {
        ...body,
        description: "介".repeat(501),
      }),
    ).resolves.not.toHaveLength(0);
  });

  test("does not treat null as an omitted required-type patch field", async () => {
    await expect(
      validateBody(UpdateProductDto, { name: null }),
    ).resolves.not.toHaveLength(0);
  });
});
