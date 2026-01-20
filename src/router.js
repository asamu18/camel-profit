import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './components/Dashboard.vue'
import HistoryView from './components/HistoryView.vue' // 改为直接引入

const routes = [
  { path: '/', component: Dashboard },
  { path: '/history', component: HistoryView } // 使用组件
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router