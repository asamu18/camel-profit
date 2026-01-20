import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs' // 🔴 引入中文包
import router from './router'

const app = createApp(App)
app.use(ElementPlus, {
  locale: zhCn, // 🔴 全局配置中文
})
app.use(router)
app.mount('#app')