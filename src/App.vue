<template>
  <Login v-if="!session" />
  <div v-else class="min-h-screen bg-[#FDFBF7] max-w-md mx-auto shadow-xl border-x border-gray-100 flex flex-col">
    
    <!-- 顶部 Header -->
    <header 
      class="bg-[#8B5E3C] text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-50"
      :style="{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }"
    >
      <h1 class="text-2xl font-bold">驼账宝</h1>
      <p class="text-sm opacity-80 mt-1">简单、直白，养驼人的记账神器</p>
    </header>

    <!-- 主体内容 -->
    <main class="p-4 flex-1 overflow-y-auto mb-24">
      <router-view />
    </main>

    <!-- 底部导航 -->
    <nav 
      class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40"
      :style="{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', paddingTop: '0.75rem' }"
    >
      <router-link to="/" class="flex flex-col items-center gap-1 text-gray-400" active-class="!text-[#8B5E3C]">
        <el-icon :size="20"><Money /></el-icon>
        <span class="text-[10px] font-medium">首页</span>
      </router-link>

      <!-- 🔴 加号按钮：现在负责触发“批量文字导入” -->
      <div class="relative -mt-10">
        <button 
          @click="triggerBulkImport" 
          class="p-4 rounded-full shadow-xl bg-[#F59E0B] text-white border-4 border-white active:scale-95 transition-transform"
        >
          <el-icon :size="24"><Plus /></el-icon>
        </button>
      </div>

      <router-link to="/history" class="flex flex-col items-center gap-1 text-gray-400" active-class="!text-[#8B5E3C]">
        <el-icon :size="20"><Clock /></el-icon>
        <span class="text-[10px] font-medium">历史</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import Login from './components/Login.vue'
import { Money, Plus, Clock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const session = ref(null)
const router = useRouter()

// 🔴 修改：点击加号跳转并带上导入指令
const triggerBulkImport = () => {
  router.push({ 
    path: '/', 
    query: { 
      action: 'bulkImport', 
      t: Date.now() 
    }
  })
}

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => { session.value = data.session })
  supabase.auth.onAuthStateChange((_event, _session) => { session.value = _session })
})
</script>

<style>
body { background-color: #8B5E3C; margin: 0; padding: 0; }
#app { background-color: #FDFBF7; min-height: 100vh; }
::-webkit-scrollbar { display: none; }
</style>