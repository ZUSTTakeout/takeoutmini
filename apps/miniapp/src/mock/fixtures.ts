import type { Order, OrderStatus, Product, Shop, User } from "../types";

export const MOCK_STUDENT: User = { id: "mock-student", nickname: "林小满", role: "STUDENT" };
export const MOCK_MERCHANT: User = {
  id: "mock-merchant", nickname: "禾间小馆 · 主理人", role: "MERCHANT", shopId: "mock-hejian",
};
export interface MockOrder extends Order {
  studentId: string;
  idempotencyKey?: string;
  fingerprint?: string;
}

const images = {
  bowl: "/static/mock-food/bowl.jpg",
  noodles: "/static/mock-food/noodles.jpg",
  burger: "/static/mock-food/burger.jpg",
  coffee: "/static/mock-food/coffee.jpg",
  salad: "/static/mock-food/salad.jpg",
};

function product(
  id: string, name: string, price: number, stock: number, categoryId: string,
  description: string, image: keyof typeof images | null, isAvailable = true,
): Product {
  return { id, name, price, stock, categoryId, description, image: image ? images[image] : null, isAvailable };
}

export function createShops(): Shop[] {
  return [
    {
      id: "mock-hejian", name: "禾间小馆", isOpen: true,
      notice: "午餐 11:00 开始供应 · 一食堂东侧 06 号窗口",
      description: "现做饭食",
      categories: [
        { id: "mock-rice", name: "招牌饭食" }, { id: "mock-noodles", name: "汤面与拌面" },
        { id: "mock-sides", name: "小食" }, { id: "mock-drinks", name: "饮品" },
        { id: "mock-set", name: "双人分享套餐" },
      ],
      products: [
        product("mock-rice-1", "香煎鸡腿时蔬饭", 1850, 38, "mock-rice", "鸡腿排、时令蔬菜与香米饭，酱汁分装。", "bowl"),
        product("mock-rice-2", "照烧双拼鸡腿饭配溏心蛋与时蔬", 2650, 12, "mock-rice", "双份鸡腿配溏心蛋，现做约需 8 分钟。", "bowl"),
        product("mock-rice-3", "菌菇蔬菜饭", 1600, 0, "mock-rice", "杏鲍菇、香菇与青菜。", "salad"),
        product("mock-noodle-1", "豚骨叉烧拉面", 2200, 26, "mock-noodles", "浓汤、叉烧、海苔与溏心蛋，可选少盐。", "noodles"),
        product("mock-noodle-2", "葱油拌面", 1200, 1, "mock-noodles", "葱油现熬，搭配爽口黄瓜丝。", "noodles"),
        product("mock-side-1", "香酥鸡块", 950, 45, "mock-sides", "外酥里嫩，搭配独立蘸酱。", null),
        product("mock-side-2", "烤蔬菜沙拉", 1350, 20, "mock-sides", "烤南瓜、生菜与番茄，油醋汁分装。", "salad"),
        product("mock-drink-1", "冰柠檬茶", 650, 999, "mock-drinks", "鲜切柠檬，可备注少冰或不加糖。", "coffee"),
        product("mock-set-1", "双人午间分享套餐（两份主食＋两杯饮品＋小食）", 6990, 6, "mock-set", "主食可选鸡腿饭或拉面，请在备注中填写口味。", "bowl"),
        product("mock-rice-4", "黑椒牛肉饭", 2450, 30, "mock-rice", "嫩牛肉与黑椒酱，搭配时蔬。", "bowl", false),
      ],
    },
    {
      id: "mock-soup", name: "巷口汤面 · 手作鲜汤与现拌面", isOpen: true,
      notice: "二食堂一楼 12 号窗口 · 饭点请预留 10 分钟",
      categories: [{ id: "mock-soup-noodles", name: "鲜汤面" }, { id: "mock-soup-sides", name: "小食" }],
      products: [
        product("mock-soup-1", "番茄牛肉汤面", 2100, 22, "mock-soup-noodles", "番茄鲜汤与慢炖牛肉。", "noodles"),
        product("mock-soup-2", "清汤鲜虾馄饨面", 1800, 40, "mock-soup-noodles", "手包鲜虾馄饨，清淡鲜香。", "noodles"),
        product("mock-soup-3", "凉拌木耳", 600, 18, "mock-soup-sides", "酸甜爽脆，微辣。", null),
      ],
    },
    {
      id: "mock-garden", name: "青禾轻食", isOpen: true,
      notice: "图书馆旁 B2 · 酱汁默认分装",
      categories: [{ id: "mock-garden-salad", name: "轻食沙拉" }, { id: "mock-garden-bowl", name: "谷物碗" }],
      products: [
        product("mock-garden-1", "牛油果鸡胸沙拉", 2800, 15, "mock-garden-salad", "低温鸡胸、牛油果与生菜，含油醋汁。", "salad"),
        product("mock-garden-2", "南瓜藜麦谷物碗", 2400, 10, "mock-garden-bowl", "烤南瓜与藜麦，搭配鹰嘴豆。", "bowl"),
        product("mock-garden-3", "田园时蔬沙拉", 1900, 0, "mock-garden-salad", "每日时令蔬菜。", "salad"),
      ],
    },
    {
      id: "mock-burger", name: "三明治与汉堡研究所", isOpen: true,
      notice: "体育馆西门 03 号档口 · 堂食和自取",
      categories: [{ id: "mock-burger-main", name: "汉堡" }, { id: "mock-burger-set", name: "分享套餐" }],
      products: [
        product("mock-burger-1", "芝士牛肉汉堡", 2300, 28, "mock-burger-main", "牛肉饼、切达芝士与新鲜番茄。", "burger"),
        product("mock-burger-2", "双层芝士牛肉汉堡", 3200, 9, "mock-burger-main", "双层牛肉饼，现烤面包。", "burger"),
        product("mock-burger-3", "四人汉堡分享套餐", 12990, 5, "mock-burger-set", "四个汉堡与小食饮品组合。", "burger"),
      ],
    },
    {
      id: "mock-coffee", name: "拾光咖啡", isOpen: false,
      notice: "今日 14:00 开始营业 · 艺术楼一层",
      categories: [{ id: "mock-coffee-cup", name: "咖啡" }, { id: "mock-coffee-milk", name: "茶饮" }],
      products: [
        product("mock-coffee-1", "拿铁", 1600, 50, "mock-coffee-cup", "双份浓缩与鲜牛奶。", "coffee"),
        product("mock-coffee-2", "美式咖啡", 1200, 60, "mock-coffee-cup", "可选冰或热。", "coffee"),
        product("mock-coffee-3", "桂花乌龙奶茶", 1800, 25, "mock-coffee-milk", "桂花香与清爽乌龙茶。", "coffee"),
      ],
    },
    {
      id: "mock-breakfast", name: "晨间铺子", isOpen: true,
      notice: "",
      categories: [{ id: "mock-breakfast-main", name: "早餐" }],
      products: [
        product("mock-breakfast-1", "鲜肉小笼包", 850, 80, "mock-breakfast-main", "一份 6 只。", null),
        product("mock-breakfast-2", "豆浆", 300, 120, "mock-breakfast-main", "现磨豆浆，可选无糖。", null),
      ],
    },
  ];
}

export function createOrders(shops: Shop[], now = Date.now()): MockOrder[] {
  const specs: Array<[string, OrderStatus, number, Array<[string, number]>, string]> = [
    ["mock-order-1", "CREATED", 0, [["mock-rice-2", 2], ["mock-drink-1", 2]], "一份不放葱，另一份少盐。饮品少冰，谢谢。"],
    ["mock-order-2", "READY", 0, [["mock-noodle-1", 1], ["mock-side-1", 1]], "面汤分装，下课后到店取餐。"],
    ["mock-order-3", "ACCEPTED", 0, [["mock-rice-1", 1], ["mock-side-2", 1], ["mock-drink-1", 1]], ""],
    ["mock-order-4", "CREATED", 0, [["mock-set-1", 1]], "一份鸡腿饭、一份拉面。两杯饮品都不要冰，酱汁请分装。"],
    ["mock-order-5", "COMPLETED", 3, [["mock-burger-3", 1]], ""],
    ["mock-order-6", "COMPLETED", 0, [["mock-rice-1", 2], ["mock-drink-1", 2]], ""],
    ["mock-order-7", "CANCELLED", 0, [["mock-noodle-2", 1]], "临时有课。"],
    ["mock-order-8", "COMPLETED", 2, [["mock-garden-1", 1]], "不加油醋汁。"],
    ["mock-order-9", "COMPLETED", 0, [["mock-noodle-1", 3], ["mock-side-1", 3]], ""],
    ["mock-order-10", "COMPLETED", 1, [["mock-soup-1", 1], ["mock-soup-3", 1]], ""],
    ["mock-order-11", "ACCEPTED", 0, [["mock-rice-2", 1]], "请用两个餐盒分别装米饭和配菜，我会在十二点四十分左右到一食堂东侧窗口取餐。"],
    ["mock-order-12", "COMPLETED", 0, [["mock-set-1", 2]], ""],
  ];
  return specs.map(([id, status, shopIndex, choices, remark], index) => {
    const shop = shops[shopIndex];
    const items = choices.map(([productId, quantity], itemIndex) => {
      const selected = shop.products.find((item) => item.id === productId)!;
      return { id: `${id}-item-${itemIndex}`, productId, name: selected.name, price: selected.price, quantity };
    });
    const created = new Date(now - (index < 4 ? (index + 1) * 7 : index * 160) * 60_000);
    const createdAt = created.toISOString();
    const date = `${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}`;
    return {
      id, number: `${date}${String(48 - index).padStart(4, "0")}`, status,
      studentId: index === 3 || index === 10 ? "mock-classmate" : MOCK_STUDENT.id,
      shop: { id: shop.id, name: shop.name }, items, remark,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      createdAt, updatedAt: createdAt,
    };
  });
}
