# 校园美食街微信小程序

按参考方案保留微信小程序与统一后端，明确不包含 H5 和独立 App。

## 已实现

- 学生：营业店铺浏览、分类商品、按店购物车、库存校验、线下自取下单、订单状态、取消与库存回补。
- 商户：演示登录、营业开关、订单接单/制作/出餐/完成、商品与分类管理接口、经营统计。
- 后端：NestJS + TypeScript + Prisma/MySQL 8，JWT + RBAC，订单幂等键，事务扣库存，Docker Compose + Nginx 配置。
- 小程序：uni-app Vue 3 TypeScript，暖白橙色 UI，真实 API 请求，不使用假数据驱动核心流程。

## 本地启动

1. 复制 `.env.example` 为 `.env` 并修改密码。
2. `docker compose up -d mysql redis`。
3. 在 `apps/api` 设置 `DATABASE_URL` 后执行 `npx prisma db push`，再执行 `npm run build && npm start`。
4. 执行 `npm --prefix apps/miniapp run build:mp-weixin`，微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin`；开发接口地址默认 `http://localhost:3000/api`，真机调试需改为 HTTPS 合法域名。

演示登录仅在 `NODE_ENV` 非 production 且 `DEV_AUTH_ENABLED` 非 false 时开启。生产环境应配置微信 AppID/Secret，关闭演示登录，并配置 HTTPS/WSS 与真实支付/退款服务。

## 构建状态

后端 TypeScript 和微信小程序编译通过。小程序使用官方 `uni build -p mp-weixin`，源码入口是 `apps/miniapp/src`，产物含 `app.json` 和六个页面的 WXML/JS/JSON/WXSS。

`npm run test:smoke` 会通过真实本地 API 验证演示登录、菜单、订单幂等、商户查看订单、取消及库存恢复；无菜品时添加三款演示菜品，保留自动取消的测试订单。仅用于开发数据库。

当前为本地演示版本：微信正式登录、支付/退款、WebSocket 通知和 Redis 业务接入尚未完成。编译通过不代表真机验收或可上线；生产部署还需权限与并发库存安全检查。
