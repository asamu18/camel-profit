# 03｜数据模型与 Supabase

## Supabase 连接与环境变量

- 连接初始化：[supabase.js](file:///workspace/src/lib/supabase.js)
- 依赖环境变量（构建期注入）：
  - `VITE_SUPABASE_URL`：Supabase Project URL
  - `VITE_SUPABASE_KEY`：前端可用的 anon key

安全约束（强烈建议）：

- 前端只能使用 anon key；不要在前端注入 service_role key。
- 所有业务表建议开启 RLS，并用 `user_id = auth.uid()` 作为核心访问控制条件。

## 表结构（由代码推断）

本仓库未包含 Supabase SQL migration/DDL，下面结构为从代码读写字段推断出的“最小必要字段集合”，实际数据库可包含更多字段（如 `id`、`created_at` 等）。

### income（收入）

代码涉及：[dataService.addIncome](file:///workspace/src/api/dataService.js#L10-L16)、[AddRecordModal.vue](file:///workspace/src/components/AddRecordModal.vue#L212-L216)、[ImportMilkModal.vue](file:///workspace/src/components/ImportMilkModal.vue#L161-L170)

- `id`：主键（推断：用于删除/更新与渲染 key）
- `user_id`：uuid（必需）
- `date`：`YYYY-MM-DD` 字符串（必需）
- `category`：字符串（如 `驼奶销售`）
- `amount`：number（必需）
- `quantity`：number（公斤）
- `unit_price`：number（元/公斤）
- `duration`：number（“这是几天的量”，用于平摊计算）

### cost（支出）

代码涉及：[dataService.addCost](file:///workspace/src/api/dataService.js#L18-L24)、[HistoryView.vue](file:///workspace/src/components/HistoryView.vue#L287-L294)、[FeedStatModal.vue](file:///workspace/src/components/FeedStatModal.vue#L65-L92)

- `id`
- `user_id`
- `date`
- `category`：字符串（如 `豆粕` / `人工工资`）
- `amount`
- `quantity`：number（用于模板/日常支出）
- `unit_price`
- `cost_type`：字符串（至少出现）
  - `日常支出`：每日固定成本模板落账
  - `库存进货`：饲料进货
  - `其他`：杂费等
- `weight`：number（吨；用于库存进货统计）

### settings（经营设置）

代码涉及：[SettingsModal.vue](file:///workspace/src/components/SettingsModal.vue#L103-L135)、[SetupWizard.vue](file:///workspace/src/components/SetupWizard.vue#L173-L197)

- `user_id`
- `total_camels`：number
- `milking_camels`：number
- `milk_frequency`：number（几天交一次奶）
- `milk_quantity_per_time`：number（每次公斤）
- `milk_price`：number（元/公斤）
- `daily_template`：JSON 数组
  - item：`{ name: string, quantity: number, unit_price: number }`

### inventory（库存）

代码涉及：[dataService.getInventory](file:///workspace/src/api/dataService.js#L125-L131)、[dataService.updateInventory](file:///workspace/src/api/dataService.js#L133-L145)

- `id`（可选；但列表渲染使用了 `item.id`，建议存在）
- `user_id`
- `category`：饲料名称
- `quantity`：number（吨）
- `unit_price`：number（用于估值）
- `updated_at`：timestamp

约束建议：

- 唯一键：`(user_id, category)`（代码 upsert 依赖，见 [dataService.updateInventory](file:///workspace/src/api/dataService.js#L136-L143)）

### posts（广场信息）

代码涉及：[Square.vue](file:///workspace/src/components/Square.vue#L87-L135)

- `id`
- `user_id`
- `type`：`招聘`/`出租`/`求助`/`广告`
- `title`
- `content`
- `contact_info`
- `created_at`

## RLS 与权限策略建议（面向当前代码）

如果要让前端 anon key 安全可用，且避免用户互相读写数据，建议：

- `income/cost/settings/inventory/posts` 全部开启 RLS
- Policy（示意）：
  - Select：`user_id = auth.uid()`（posts 若希望公共可见可放宽，但当前 UI 默认展示全部 posts，且写入带 user_id）
  - Insert：`user_id = auth.uid()`
  - Update/Delete：`user_id = auth.uid()`

## 生产环境代理（Vercel rewrite）

原因：在 Web 生产环境中将 Supabase API 走同域代理，减少浏览器侧的跨域/直连差异，并方便统一网关策略。

- 前端将 Supabase baseUrl 切换为 `/api/supabase`（见 [supabase.js](file:///workspace/src/lib/supabase.js#L10-L13)）
- Vercel 配置 rewrite（见 [vercel.json](file:///workspace/vercel.json#L1-L7)）

