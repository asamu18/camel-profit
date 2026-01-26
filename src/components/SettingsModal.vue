<template>
  <el-dialog v-model="visible" title="经营设置" width="90%" style="max-width: 400px;" center destroy-on-close>
    
    <div class="mb-6 bg-orange-50 p-3 rounded-lg text-xs text-orange-800">
      <el-icon><InfoFilled /></el-icon> 这里的数据变动会影响后续的利润统计。
    </div>

    <el-form label-position="top">
      <h3 class="font-bold border-l-4 border-orange-500 pl-2 mb-3 text-sm">🐪 驼群规模</h3>
      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="骆驼总数 (峰)">
          <el-input-number v-model="form.total_camels" :min="1" size="large" style="width: 100%" :controls="false" />
        </el-form-item>
        <el-form-item label="正在产奶 (峰)">
          <el-input-number v-model="form.milking_camels" :min="0" size="large" style="width: 100%" :controls="false" />
        </el-form-item>
      </div>

      <!-- 危险区域 -->
      <div class="mt-8 pt-6 border-t border-red-100 flex flex-col">
  <h3 class="text-red-500 font-bold text-xs mb-2 flex items-center gap-1">
    <el-icon><Warning /></el-icon> 账户安全与重置
  </h3>
  <p class="text-[10px] text-gray-400 mb-4">清空后将无法找回数据，系统会重新进入初始化向导。</p>
  
  <!-- 使用 flex 容器并强制子项宽度 -->
  <div class="flex flex-col gap-3">
    <el-button 
      type="danger" 
      plain 
      class="!w-full !m-0" 
      @click="handleResetAll"
    >
      一键清除所有数据
    </el-button>
    
    <el-button 
      type="info" 
      plain 
      class="!w-full !m-0" 
      @click="handleLogout"
    >
      退出当前账号
    </el-button>
  </div>
</div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false" size="large">取消</el-button>
      <el-button type="primary" @click="save" :loading="loading" size="large">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { dataService } from '../api/dataService'
import { InfoFilled, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const visible = ref(false)
const loading = ref(false)
const form = reactive({ total_camels: 0, milking_camels: 0 })
const emit = defineEmits(['saved'])

const open = async () => {
  visible.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  if (data) {
    form.total_camels = data.total_camels
    form.milking_camels = data.milking_camels
  }
}

const save = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('settings').upsert({
      user_id: user.id,
      total_camels: form.total_camels,
      milking_camels: form.milking_camels
    }, { onConflict: 'user_id' })

    if (error) throw error
    ElMessage.success('设置已保存')
    visible.value = false
    emit('saved')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 🔴 核心逻辑：退出登录
const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // 清除所有本地缓存
    localStorage.clear()
    
    ElMessage.success('已安全退出')
    visible.value = false
    
    // 强制刷新页面，触发 App.vue 的初始加载逻辑回到登录页
    window.location.reload()
  } catch (e) {
    ElMessage.error('退出失败: ' + e.message)
  }
}

const handleResetAll = () => {
  ElMessageBox.confirm(
    '确定要删除所有账单、设置和存货信息吗？系统将恢复到初次使用的状态。',
    '彻底清空确认',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    loading.value = true
    try {
      // 1. 调用 API 删除所有数据
      await dataService.clearAllUserData()
      
      // 2. 清理所有本地缓存
      localStorage.clear()
      
      ElMessage.success('数据已全部清除')
      
      // 3. 🔴 关键点：强制重定向到根路径并刷新
      window.location.href = window.location.origin
    } catch (e) {
      ElMessage.error('清除失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

defineExpose({ open })
</script>