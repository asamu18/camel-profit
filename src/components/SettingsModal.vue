<template>
  <el-dialog v-model="visible" title="经营设置" width="90%" style="max-width: 400px;" center destroy-on-close>
    
    <div class="mb-6 bg-orange-50 p-3 rounded-lg text-sm text-orange-800">
      <el-icon><InfoFilled /></el-icon> 这里的数据变动会影响后续的统计，请如实填写。
    </div>

    <el-form label-position="top">
      <h3 class="font-bold border-l-4 border-orange-500 pl-2 mb-3">🐪 驼群规模</h3>
      <el-form-item label="骆驼总数 (峰)">
        <el-input-number v-model="form.total_camels" :min="1" size="large" style="width: 100%" />
      </el-form-item>
      <el-form-item label="正在产奶 (峰)">
        <el-input-number v-model="form.milking_camels" :min="0" size="large" style="width: 100%" />
      </el-form-item>

      <h3 class="font-bold border-l-4 border-blue-500 pl-2 mb-3 mt-6">💰 日常固定开销</h3>
      <p class="text-xs text-gray-400 mb-2">包括：人工费、伙食费、水电费等每天必须花的钱。</p>
      <el-form-item label="每日固定支出 (元/天)">
        <el-input-number v-model="form.daily_fixed_cost" :min="0" size="large" style="width: 100%" />
      </el-form-item>
      <!-- 新增：危险区域 -->
       <div class="mt-10 pt-6 border-t border-red-100">
         <h3 class="text-red-500 font-bold text-sm mb-2">⚠️ 危险区域</h3>
         <p class="text-[11px] text-gray-400 mb-4">如果您想重新开始，可以清空所有账单和设置。此操作不可撤销。</p>
         <el-button type="danger" plain class="w-full" size="default" @click="handleResetAll">
           清空所有数据并重新初始化
         </el-button>
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
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dataService } from '../api/dataService'

const visible = ref(false)
const loading = ref(false)
const form = reactive({ total_camels: 0, milking_camels: 0, daily_fixed_cost: 0 })
const emit = defineEmits(['saved'])

const handleResetAll = () => {
  ElMessageBox.confirm(
    '确定要删除所有账单、设置和发布的信息吗？系统将恢复到初次使用的状态。',
    '彻底清空确认',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      buttonSize: 'large',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    loading.value = true
    try {
      await dataService.clearAllUserData()
      ElMessage.success('数据已全部清除')
      visible.value = false
      
      // 核心：强制刷新页面，让 Dashboard 重新触发 SetupWizard
      window.location.reload()
    } catch (e) {
      ElMessage.error('清除失败: ' + e.message)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}


const open = async () => {
  visible.value = true
  // 加载现有设置
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
  if (data) {
    form.total_camels = data.total_camels
    form.milking_camels = data.milking_camels
    form.daily_fixed_cost = data.daily_fixed_cost || 0
  }
}

const save = async () => {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  
  // upsert: 有则更新，无则插入
  const { error } = await supabase.from('settings').upsert({
    user_id: user.id,
    total_camels: form.total_camels,
    milking_camels: form.milking_camels,
    daily_fixed_cost: form.daily_fixed_cost
  }, { onConflict: 'user_id' })

  if (error) ElMessage.error('保存失败')
  else {
    ElMessage.success('保存成功')
    visible.value = false
    emit('saved') // 通知父组件更新数据
  }
  loading.value = false
}

defineExpose({ open })
</script>