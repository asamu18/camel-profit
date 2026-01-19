<template>
  <div v-if="session">
    <Dashboard :key="session.user.id" />
  </div>
  <Login v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard.vue'
import Login from './components/Login.vue'

const session = ref(null)

onMounted(() => {
  // 获取当前 Session
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })

  // 监听 Auth 变化
  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
  })
})
</script>

<style>
body {
  margin: 0;
  background-color: #f5f7fa;
}
</style>