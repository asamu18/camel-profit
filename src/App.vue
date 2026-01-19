<template>
  <!-- 如果未登录，显示登录页 -->
  <Login v-if="!session" />
  
  <!-- 如果已登录，显示主布局 -->
  <div v-else class="min-h-screen relative"> <!-- 去掉了 pb-16 -->
    
    <!-- 页面内容显示区 -->
    <router-view :key="$route.fullPath" />

    <!-- 3. 整个底部导航栏注释掉 -->
    <!-- 
    <div class="fixed bottom-0 left-0 right-0 max-w-7xl mx-auto bg-white border-t border-gray-200 flex justify-around items-center h-14 shadow-lg z-50">
      <router-link to="/" class="flex flex-col items-center text-gray-500 hover:text-orange-500" active-class="text-orange-600 font-bold">
        <el-icon :size="20"><Money /></el-icon>
        <span class="text-xs mt-1">记账</span>
      </router-link>
      
      <router-link to="/square" class="flex flex-col items-center text-gray-500 hover:text-orange-500" active-class="text-orange-600 font-bold">
        <el-icon :size="20"><ChatDotSquare /></el-icon>
        <span class="text-xs mt-1">广场</span>
      </router-link>
    </div>
    -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import Login from './components/Login.vue'
// 图标引入也可以暂时注释掉，避免报 unused 警告
// import { Money, ChatDotSquare } from '@element-plus/icons-vue'

const session = ref(null)

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })
  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
  })
})
</script>