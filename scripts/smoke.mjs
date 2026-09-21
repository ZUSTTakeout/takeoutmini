import assert from 'node:assert/strict';
const base = process.env.API_BASE_URL || 'http://localhost:3000/api';
async function request(path, method = 'GET', data, token) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}
const merchant = await request('/auth/dev', 'POST', { role: 'MERCHANT' });
const student = await request('/auth/dev', 'POST', { role: 'STUDENT' });
const shop = await request('/merchant/shop', 'GET', undefined, merchant.token);
// Only add missing demo products; keep existing stock and user edits intact.
if (!shop.products.length) {
  const category = shop.categories[0] || await request('/merchant/categories', 'POST', { name: '热销主食' }, merchant.token);
  for (const [name, price] of [['招牌鸡腿饭', 1500], ['番茄鸡蛋面', 1200], ['香菇滑鸡饭', 1600]]) {
    await request('/merchant/products', 'POST', { categoryId: category.id, name, price, stock: 100 }, merchant.token);
  }
}
const shops = await request('/shops');
const current = shops.find(s => s.id === shop.id);
assert.ok(current, 'Demo shop must be open');
const product = current.products.find(p => p.stock >= 1);
assert.ok(product, 'Need an available demo product');
const key = `smoke-${Date.now()}-${crypto.randomUUID()}`;
const body = { shopId: shop.id, items: [{ productId: product.id, quantity: 1 }], idempotencyKey: key, remark: '联调测试订单（自动取消）' };
const order = await request('/orders', 'POST', body, student.token);
assert.equal(order.total, product.price);
try {
  const retry = await request('/orders', 'POST', body, student.token);
  assert.equal(retry.id, order.id, 'Retry must return same order');
  const merchantOrders = await request('/merchant/orders', 'GET', undefined, merchant.token);
  assert.ok(merchantOrders.some(o => o.id === order.id));
  const after = await request(`/shops/${shop.id}`);
  assert.equal(after.products.find(p => p.id === product.id).stock, product.stock - 1);
} finally {
  await request(`/orders/${order.id}/status`, 'PATCH', { status: 'CANCELLED' }, student.token);
}
const restored = await request(`/shops/${shop.id}`);
assert.equal(restored.products.find(p => p.id === product.id).stock, product.stock);
console.log('PASS: login, shop/menu, create order, idempotency, merchant visibility, cancellation and stock restore');
