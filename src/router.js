import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './components/Dashboard.vue'
import Square from './components/Square.vue' // 稍后创建
import Login from './components/Login.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/square', component: Square },
  { path: '/login', component: Login }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router