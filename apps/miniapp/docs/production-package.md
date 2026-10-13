# 商户主题与生产包记录

记录日期：2026-10-13。Vant Weapp 版本：1.11.7。

## 包体积

两次均在相同工作区设置 `VITE_MOCK_ENABLED=false`、`VITE_DEV_AUTH_ENABLED=false`，重新执行 `build:mp-weixin`。统计 `dist/build/mp-weixin` 所有文件的实际字节数，不包含 Mock 预览目录；这里是未压缩构建目录大小，微信上传压缩后的包大小以开发者工具为准。

| 范围 | 调整前 | 调整后 | 减少 |
| --- | ---: | ---: | ---: |
| 完整构建产物 | 793,320 字节 / 389 文件 | 395,703 字节 / 285 文件 | 397,617 字节（50.1%） |
| wxcomponents/vant | 162,600 字节 / 162 文件 | 57,914 字节 / 63 文件 | 104,686 字节（64.4%） |
| static/mock-food | 294,765 字节 / 5 文件 | 0 字节 / 0 文件 | 294,765 字节（100%） |

源码直接使用的组件为 `van-switch`、`van-popup`、`van-loading`，全局注册从 23 项缩减到 3 项。准备脚本保留 JSON 声明的依赖闭包，包括弹窗需要的 overlay、icon、info、transition 与开关需要的 loading，以及 common、mixins、wxs；每次准备会清理已经移出清单的旧组件目录，不修改第三方组件源文件。

正式构建的静态资源复制结束后移除 `static/mock-food`，Mock 预览构建保留这些照片。Mock 模块仍通过现有 Vite 别名隔离，与业务请求行为无关。

## 主题覆盖

| 使用位置 | 核对与调整 |
| --- | --- |
| merchant/index | 营业开关使用统一主色、边框色、表面色、控制圆角及动画时长；加载状态保留主题色参数。 |
| merchant/products | 分类弹窗使用主题表面色、面板圆角与遮罩色；原生输入框字号、占位文字与商品编辑表单一致。 |
| MerchantProductEditor | 商品弹窗背景交给主题变量，移除重复的行内背景覆盖；名称、价格、库存、描述、图片地址占位文字统一；上架开关接入共享圆角样式。 |
| MerchantProductRow | 在售、下架、禁用、加载开关接入统一主题，去除 Vant 默认边框及阴影。 |
| merchant/settings | 营业开关与工作台一致；店铺名称、公告使用统一表单字号及占位文字色。 |
| MenuRow | 加载指示器已有显式主色；补齐默认加载颜色、大小、文本字号及行高变量，保留现有交互。 |

变量名对照安装包的 WXSS 核对。Vant 1.11.7 的开关轨道圆角和滑块圆角、单元格分隔线不能仅靠原生变量覆盖：`styles/vant.css` 通过 Vant 的 `addGlobalClass` 共享选择器，分别消费主题中的 `--switch-border-radius`、`--switch-node-border-radius` 与统一边框变量；显式提高覆盖优先级，避开混用编译时外部样式类没有生效的问题。组件内部没有新增硬编码颜色。

当前页面没有使用 Vant cell、field、tag。未使用的组件已移出构建清单；主题仍补齐 cell 行高、标签字号、field 占位文字及错误色、tag 普通/大号字号与语义颜色映射，供后续复用。

## 生产检查

`npm --prefix apps/miniapp run check:production` 调用 `scripts/check-mock.mjs --production`，检查真实构建目录是否存在、是否包含 Mock 目录/图片，以及是否残留 fixtures 中的账号、店铺、商品标识或名称。基线包因 `static/mock-food/bowl.jpg` 被正确拒绝；调整后的正式包通过全部 8 项检查，证明检查能发现实际泄漏。

完整构建命令与上线 checklist 见[小程序 README](../README.md#上线前)。

## 验证状态

ESLint 与 vue-tsc 通过；正式构建与生产包检查通过。Mock 回归覆盖营业设置、分类添加、商品创建/修改/下架和订单流转，另有 12 项下单链路回归通过。

微信开发者工具已检查商品列表、营业设置、订单列表和商户资料页面，并确认商品列表开关使用主题圆角。弹窗自动化期间工具自身出现 `inspectee MPPage.getCurrent` / `rawPath` 页面元数据异常，交互结果与截图上下文不一致，不能据此确认完整流程；弹窗完整交互和 iOS / Android 真机验收仍待手工走查，不视为已经通过。走查产生的 Mock 数据和账号已恢复到检查前状态。
