const { NotFoundException } = require("@nestjs/common");
const { ShopsController } = require("../dist/shops.controller");

describe("public shop endpoints", () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const controller = new ShopsController({
    shop: { findMany, findFirst },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("only lists open shops", async () => {
    findMany.mockResolvedValue([]);
    await controller.list();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isOpen: true } }),
    );
  });

  test("keeps a closed shop's detail available", async () => {
    const closedShop = { id: "shop-a", isOpen: false };
    findFirst.mockResolvedValue(closedShop);
    await expect(controller.getOne({ id: "shop-a" })).resolves.toBe(closedShop);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "shop-a" } }),
    );
  });

  test("returns not found for an unknown shop", async () => {
    findFirst.mockResolvedValue(null);
    await expect(controller.getOne({ id: "missing" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
