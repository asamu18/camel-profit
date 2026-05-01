# 驼账宝（camel-profit）Code Wiki

本 Wiki 目标：把代码结构、核心流程、关键模块/函数、依赖关系、运行方式等信息整理成可持续维护的文档，便于二次开发与排障。

## 目录

- [01-整体架构](file:///workspace/docs/code-wiki/01-整体架构.md)
- [02-模块与职责](file:///workspace/docs/code-wiki/02-模块与职责.md)
- [03-数据模型与 Supabase](file:///workspace/docs/code-wiki/03-数据模型与Supabase.md)
- [04-关键流程](file:///workspace/docs/code-wiki/04-关键流程.md)
- [05-运行、构建与部署](file:///workspace/docs/code-wiki/05-运行、构建与部署.md)
- [06-依赖关系](file:///workspace/docs/code-wiki/06-依赖关系.md)

## 一句话概览

- 形态：Vue 3 + Vite 的单页应用（SPA），UI 以 Element Plus + Tailwind utility class 为主。
- 数据：前端直接使用 Supabase（鉴权 + 表 CRUD），无独立后端服务。
- 发布：Web 端适配 Vercel，通过 rewrite 把 `/api/supabase/*` 代理到 Supabase；移动端通过 Capacitor（Android/iOS）加载 `dist/`。

## 核心入口

- Web 入口 HTML：[index.html](file:///workspace/index.html)
- Vue 启动与插件注册：[main.js](file:///workspace/src/main.js)
- 顶层分流（登录态/主界面）：[App.vue](file:///workspace/src/App.vue)
- 路由：[/](file:///workspace/src/router.js#L5-L13)（Dashboard）与 [/history](file:///workspace/src/router.js#L5-L13)（HistoryView）
