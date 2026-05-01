# 驼账宝 - 项目代码Wiki

## 1. 项目概览

**驼账宝** 是一款专为养驼人设计的记账管理应用，帮助用户记录驼奶销售收入、饲料采购、日常支出等，并提供利润计算、数据分析等功能。

### 1.1 技术栈
- **前端框架**: Vue 3 (Composition API)
- **UI组件库**: Element Plus
- **构建工具**: Vite (基于 Rolldown)
- **样式工具**: Tailwind CSS 4.x, Sass
- **后端服务**: Supabase (BaaS - Backend as a Service)
- **跨平台**: Capacitor 8.x (iOS/Android)
- **其他**: ECharts (数据可视化), XLSX (Excel导入)

### 1.2 项目结构
```
/workspace
├── android/                # Capacitor Android 原生代码
├── ios/                    # Capacitor iOS 原生代码
├── public/                 # 公共静态资源
├── src/
│   ├── api/                # API 服务层
│   │   └── dataService.js  # 数据服务 (核心业务逻辑)
│   ├── assets/             # 静态资源
│   ├── components/         # Vue 组件
│   ├── lib/                # 第三方库封装
│   │   └── supabase.js     # Supabase 客户端配置
│   ├── utils/              # 工具函数
│   ├── App.vue             # 根组件
│   ├── main.js             # 应用入口
│   ├── router.js           # 路由配置
│   └── style.css           # 全局样式
├── .env                    # 环境变量
├── capacitor.config.json   # Capacitor 配置
├── package.json            # 项目依赖
└── vite.config.js          # Vite 配置
```

---

## 2. 核心模块详解

### 2.1 认证模块 - [Login.vue](file:///workspace/src/components/Login.vue)
**职责**: 用户登录/注册

**功能特点**:
- 使用手机号+密码登录，自动处理首次注册
- 虚拟邮箱后缀：`@camel.local`（满足Supabase邮箱格式要求）
- 手机号格式校验：`1[3-9]\d{9}`
- 密码最小长度：6位

**关键代码**:
```javascript
const DOMAIN_SUFFIX = '@camel.local'

const handleLogin = async () => {
  const email = phone.value + DOMAIN_SUFFIX
  // 1. 尝试登录
  // 2. 失败则自动注册，然后再次登录
}
```

### 2.2 Supabase 客户端 - [supabase.js](file:///workspace/src/lib/supabase.js)
**职责**: 初始化和配置Supabase客户端

**功能特点**:
- 自动区分生产环境和开发环境
- 生产环境使用相对路径代理 (`/api/supabase`)
- 开发/App环境直接使用原始URL

**配置**:
```javascript
const supabaseUrl = (import.meta.env.PROD && !isApp)
  ? (window.location.origin + '/api/supabase') 
  : rawUrl
```

### 2.3 数据服务层 - [dataService.js](file:///workspace/src/api/dataService.js)
**职责**: 所有与Supabase数据库的交互封装

#### 2.3.1 核心方法
| 方法名 | 说明 |
|--------|------|
| `addIncome()` | 添加收入记录 |
| `addCost()` | 添加支出记录 |
| `updateRecord()` | 更新记录 |
| `deleteRecord()` | 删除记录 |
| `getDataByMonth()` | 按月份获取数据 |
| `getTrendData()` | 获取趋势数据 |
| `getFullHistory()` | 获取完整历史记录 |
| `getInventory()` | 获取当前库存 |
| `updateInventory()` | 更新库存 |
| `incrementInventory()` | 增加库存（进货时） |
| `clearAllUserData()` | 清空所有用户数据 |

#### 2.3.2 数据库表结构推测
根据代码推断，项目使用以下表：
- `income`: 收入表 (user_id, date, category, amount, quantity, unit_price, duration)
- `cost`: 支出表 (user_id, date, category, amount, quantity, unit_price, cost_type, weight)
- `settings`: 用户设置表 (user_id, daily_template, milk_price, milk_frequency, milk_quantity_per_time, etc.)
- `inventory`: 库存表 (user_id, category, quantity, unit_price, updated_at)
- `posts`: 可能是公告或其他数据

### 2.4 主应用组件 - [App.vue](file:///workspace/src/App.vue)
**职责**: 
- 应用初始化和认证状态管理
- 应用布局和导航
- 全局组件加载

**布局结构**:
```
┌───────────────────────────┐
│      顶部Header           │
├───────────────────────────┤
│                           │
│      主内容区域           │
│      (router-view)        │
│                           │
├───────────────────────────┤
│      底部导航栏           │
│ [首页] [导入] [历史]      │
└───────────────────────────┘
```

### 2.5 仪表盘 - [Dashboard.vue](file:///workspace/src/components/Dashboard.vue)
**职责**: 展示核心财务数据和快捷操作

**核心功能**:
1. **今日利润计算**: 根据是否已交奶，显示今日到手净赚
2. **数据卡片**:
   - 今日交奶实收
   - 每日固定成本
   - 本月利润预估
3. **快捷操作**:
   - 交奶记账
   - 进饲料
   - 记杂费
4. **每日模板管理**: 配置日常固定支出
5. **新手引导**: 使用 UserGuide 组件

**关键计算属性**:
```javascript
const todayProfit = computed(() => 
  (hasTodayMilk.value ? (todayIncome.value / todayMilkDuration.value) : dailyPotentialIncome.value) 
  - dailyFixedCost.value - todayExtraCost.value
)
```

**自动补填缺失成本**: `autoFillMissingCosts()` - 根据每日模板自动补填缺失的日常支出记录

### 2.6 历史记录 - [HistoryView.vue](file:///workspace/src/components/HistoryView.vue)
**职责**: 展示历史账单、按条件筛选、汇总统计

**功能特点**:
1. **视图分类**: 全部/收入/支出/饲料
2. **日期筛选**: 自定义日期范围 + 快捷选择（本月/最近30天/本年）
3. **汇总统计**: 净利润、总收入、总支出、进货统计
4. **库存管理**: 查看存货估值、预计使用天数
5. **月度聚合**: 支出按月聚合显示，支持展开查看明细

**关键计算**:
```javascript
const getDaysLeft = (inventoryItem) => {
  const templateItem = settings.value.daily_template.find(t => t.name === inventoryItem.category)
  return Math.floor((Number(inventoryItem.quantity) * 1000) / Number(templateItem.quantity))
}
```

### 2.7 记账弹窗 - [AddRecordModal.vue](file:///workspace/src/components/AddRecordModal.vue)
**职责**: 提供多种场景的记账表单

**支持的场景**:
| 场景 | 功能 |
|------|------|
| 卖奶 | 记录驼奶销售收入，支持按多天平摊 |
| 买饲料 | 记录饲料采购，自动更新库存，支持智能计算单价/总价 |
| 录入库存 | 盘点并录入当前库存，支持按吨或按袋计算 |
| 其他 | 记录其他收入或支出 |

**智能功能**:
- 自动记住上次奶价
- 新增饲料自动添加到每日模板
- 实时计算金额

### 2.8 工具函数 - [format.js](file:///workspace/src/utils/format.js)
**职责**: 数据格式化

**导出函数**:
```javascript
export const formatNum = (n) // 格式化金额，保留千分位
export const formatDateCN = (dateStr) // 格式化日期为中文格式
```

---

## 3. 关键业务流程

### 3.1 用户认证流程
```
用户输入手机号+密码
    ↓
校验手机号格式
    ↓
构造虚拟邮箱 (手机号+@camel.local)
    ↓
尝试登录 → 成功 → 进入应用
    ↓ 失败
尝试注册 → 成功 → 自动登录 → 进入应用
```

### 3.2 记账流程（卖奶）
```
点击「刚交了奶」
    ↓
打开AddRecordModal（场景：卖奶）
    ↓
自动填充上次奶价和交奶频率
    ↓
用户填写：日期、天数、重量、单价
    ↓
实时计算总收入
    ↓
提交 → 保存到income表 → 刷新数据 → 关闭弹窗
```

### 3.3 库存管理流程
```
进货（买饲料）
    ↓
记录到cost表（cost_type='库存进货'）
    ↓
调用incrementInventory() → 更新库存
    ↓
(可选) 新增饲料自动添加到daily_template

日常消耗
    ↓
每日模板自动生成cost记录（cost_type='日常支出'）
    ↓
库存不直接扣减，通过盘点手动调整
```

### 3.4 利润计算逻辑
```
今日利润
├─ 已交奶 → (今日奶款 / 天数) - 固定成本 - 杂费
└─ 未交奶 → 预估日收入 - 固定成本 - 杂费

本月利润
├─ 实际收入（已记录的奶款）
├─ 预估剩余天数收入
├─ 减：月固定成本
└─ 减：本月杂费
```

---

## 4. 组件列表与依赖关系

### 4.1 主要组件
| 组件 | 路径 | 说明 |
|------|------|------|
| App | [App.vue](file:///workspace/src/App.vue) | 根组件，布局和认证 |
| Dashboard | [Dashboard.vue](file:///workspace/src/components/Dashboard.vue) | 首页/仪表盘 |
| HistoryView | [HistoryView.vue](file:///workspace/src/components/HistoryView.vue) | 历史记录页 |
| Login | [Login.vue](file:///workspace/src/components/Login.vue) | 登录页 |
| AddRecordModal | [AddRecordModal.vue](file:///workspace/src/components/AddRecordModal.vue) | 记账弹窗 |
| EditRecordModal | [EditRecordModal.vue](file:///workspace/src/components/EditRecordModal.vue) | 编辑弹窗 |
| SettingsModal | [SettingsModal.vue](file:///workspace/src/components/SettingsModal.vue) | 设置弹窗 |
| SetupWizard | [SetupWizard.vue](file:///workspace/src/components/SetupWizard.vue) | 新手设置向导 |
| ImportMilkModal | [ImportMilkModal.vue](file:///workspace/src/components/ImportMilkModal.vue) | 批量导入奶款 |
| YearlyReportModal | [YearlyReportModal.vue](file:///workspace/src/components/YearlyReportModal.vue) | 年度报告 |
| FeedStatModal | [FeedStatModal.vue](file:///workspace/src/components/FeedStatModal.vue) | 饲料统计 |
| UserGuide | [UserGuide.vue](file:///workspace/src/components/UserGuide.vue) | 用户引导 |
| CountTo | [CountTo.vue](file:///workspace/src/components/CountTo.vue) | 数字动画 |
| Square | [Square.vue](file:///workspace/src/components/Square.vue) | 方块组件 |

### 4.2 依赖关系图
```
App.vue
├── Login.vue
├── router-view
│   ├── Dashboard.vue
│   │   ├── AddRecordModal.vue
│   │   ├── SetupWizard.vue
│   │   ├── SettingsModal.vue
│   │   ├── ImportMilkModal.vue
│   │   ├── UserGuide.vue
│   │   └── CountTo.vue
│   └── HistoryView.vue
│       ├── AddRecordModal.vue
│       ├── UserGuide.vue
│       └── CountTo.vue
└── (底部导航)

dataService.js (被所有需要数据操作的组件使用)
supabase.js (被dataService和所有需要直接访问auth的组件使用)
```

---

## 5. 路由配置 - [router.js](file:///workspace/src/router.js)
```javascript
const routes = [
  { path: '/', component: Dashboard },
  { path: '/history', component: HistoryView }
]
```

---

## 6. 环境变量配置

需要在 `.env` 文件中配置：
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

---

## 7. 项目运行方式

### 7.1 Web开发
```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产版本
```

### 7.2 移动端开发（Capacitor）
```bash
# 1. 构建Web版本
npm run build

# 2. 同步到原生平台
npx cap sync

# 3. 打开Android Studio
npx cap open android

# 4. 打开Xcode
npx cap open ios
```

---

## 8. 设计风格与约定

### 8.1 颜色主题
- **主色**: `#8B5E3C` (棕色/驼色)
- **成功/收入**: 绿色系 (`#10B981`, `#34D399`)
- **危险/支出**: 红色系 (`#F43F5E`, `#FB7185`)
- **警告**: 橙色系 (`#F59E0B`)
- **信息**: 蓝色系 (`#409EFF`)

### 8.2 UI/UX特点
- 移动端优先设计，最大宽度 `max-w-md`
- 圆角设计 `rounded-3xl`, `rounded-[2.5rem]`
- 卡片式布局，带轻微阴影
- 骨架屏加载状态
- 数字动画效果 (CountTo组件)
- 用户引导流程 (UserGuide组件)

### 8.3 代码约定
- 使用 Composition API (`<script setup>`)
- 响应式数据: `ref()` 基本类型, `reactive()` 对象
- 工具函数: 提取到 `utils/` 目录
- API调用: 封装在 `dataService.js` 中
- 事件命名: 使用 kebab-case (`@success`, `@saved`)

---

## 9. 关键技术点与注意事项

### 9.1 Supabase安全规则
项目依赖Supabase的RLS (Row Level Security)，需要确保：
- 用户只能访问自己的数据 (通过 `user_id` 过滤)
- 认证状态通过 `supabase.auth.onAuthStateChange` 监听

### 9.2 库存管理设计
- 库存不直接扣减，而是通过「进货」累加
- 日常支出是独立记录，通过每日模板生成
- 库存预计使用天数 = (库存吨数 × 1000) / 每日用量(公斤)

### 9.3 Capacitor环境检测
```javascript
const isApp = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor')
```

### 9.4 性能优化
- 使用 `localStorage` 缓存用户引导状态
- 数据分页加载（`getFullHistory`）
- 使用 `Promise.all` 并行请求多个数据

---

## 10. 待完善/扩展功能建议

1. **数据导出**: 支持导出Excel/PDF报表
2. **数据备份**: 自动备份到云端
3. **多驼群管理**: 支持多个驼场分开记账
4. **消息提醒**: 提醒交奶、进货、盘点等
5. **数据可视化**: 更多图表展示趋势
6. **团队协作**: 支持多用户共同管理一个驼场
7. **离线模式**: 支持离线记账，上线同步

---

## 11. 联系方式与维护

- **应用名称**: 驼账宝
- **包名**: `com.camelprofit.app`
- **版本**: v1.6 (极简导览版)

---

*文档生成时间: 2026-05-01*
