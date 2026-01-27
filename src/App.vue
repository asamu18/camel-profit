<template>
  <!-- 1. 初始加载遮罩：防止 Supabase 检查登录状态时的白屏或登录页闪现 -->
  <div v-if="initialLoading" class="min-h-screen flex items-center justify-center bg-[#8B5E3C]">
    <div class="text-white text-xl font-bold animate-pulse">驼账宝加载中...</div>
  </div>

  <template v-else>
    <!-- 2. 登录页 -->
    <Login v-if="!session" />

    <!-- 3. 主界面 -->
    <div v-else class="min-h-screen bg-[#FDFBF7] max-w-md mx-auto shadow-xl border-x border-gray-100 flex flex-col">
      <header 
        class="bg-[#8B5E3C] text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-50"
        :style="{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }"
      >
        <h1 class="text-2xl font-bold">驼账宝</h1>
        <p class="text-sm opacity-80 mt-1">简单、直白，养驼人的记账神器</p>
      </header>

      <main class="p-4 flex-1 overflow-y-auto mb-24">
        <router-view />
      </main>

      <nav 
        class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40"
        :style="{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', paddingTop: '0.75rem' }"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 text-gray-400" active-class="!text-[#8B5E3C]">
          <el-icon :size="20"><Money /></el-icon>
          <span class="text-[10px] font-medium">首页</span>
        </router-link>

        <!-- 🔴 弱化后的加号按钮：改名为“导入”，颜色变淡，图标变更为文件图标 -->
        <div class="relative -mt-6">
          <button id="nav-import" @click="triggerBulkImport" class="p-3 rounded-2xl shadow-md bg-gray-100 text-gray-500 border border-gray-200 active:scale-95 transition-all">
            <el-icon :size="20"><DocumentAdd /></el-icon>
            <p class="text-[8px] mt-0.5 font-bold">导入</p>
          </button>
        </div>

        <router-link id="nav-history" to="/history" class="flex flex-col items-center gap-1 text-gray-400" active-class="!text-[#8B5E3C]">
          <el-icon :size="20"><Clock /></el-icon>
          <span class="text-[10px] font-medium">历史</span>
        </router-link>
      </nav>
    </div>
  </template>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import Login from './components/Login.vue'
import { Money, Plus, Clock, DocumentAdd } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const session = ref(null)
const router = useRouter()
const initialLoading = ref(true)

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  
  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
  })
  
  initialLoading.value = false
})

const triggerBulkImport = () => {
  router.push({ path: '/', query: { action: 'bulkImport', t: Date.now() } })
}
</script>

<style>
body { background-color: #8B5E3C; margin: 0; padding: 0; }
#app { background-color: #FDFBF7; min-height: 100vh; }
::-webkit-scrollbar { display: none; }
</style>