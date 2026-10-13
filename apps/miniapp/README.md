# 小程序构建与上线

项目说明见[仓库 README](../../README.md)，Mock 图片来源见[来源记录](docs/mock-assets.md)。

## 上线前

- [ ] 关闭 Mock 和开发登录，重新生成正式包，再运行 `scripts/check-mock.mjs --production`（快捷命令 `check:production`）。检查覆盖实际构建产物，禁止携带 Mock 模块、演示图片、示例商品和 Mock 账号。只运行 `test:mock` 不代表正式包检查通过。
- [ ] 在 iOS、Android 真机走查商户商品管理、分类管理、订单流转和营业设置，确认开关、输入框、弹窗以及加载状态与主题一致。
- [ ] 关闭后端测试支付（`TEST_PAYMENT_ENABLED=false`），确认生产环境拒绝测试支付请求；微信真实收款接入并验收前不开放新下单。验证微信登录、退出后重新登录和身份刷新。

从仓库根目录执行（PowerShell）：

```powershell
$env:VITE_MOCK_ENABLED = 'false'
$env:VITE_DEV_AUTH_ENABLED = 'false'
npm --prefix apps/miniapp run lint
npm --prefix apps/miniapp run build:mp-weixin
npm --prefix apps/miniapp run check:production
```

微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin`。预览数据使用独立的 `build:mock` 构建与 `mp-weixin-mock` 目录。

包体积与 Vant 主题覆盖记录见[生产包记录](docs/production-package.md)。
