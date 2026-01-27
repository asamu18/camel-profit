<template>
  <el-dialog v-model="visible" title="经营设置" width="90%" style="max-width: 400px;" center destroy-on-close append-to-body>
    <div class="mb-6 bg-orange-50 p-3 rounded-lg text-xs text-orange-800">
      <el-icon><InfoFilled /></el-icon> 这里的数据变动会影响后续的利润统计。
    </div>

    <el-form label-position="top">
      <!-- 第一部分：规模 -->
    <h3 class="font-bold text-gray-700 mb-2 text-xs">🐪 驼群规模</h3>
  <div class="grid grid-cols-2 gap-4 mb-4" id="setting-camels">
    <el-form-item label="总驼数" class="!mb-0">
      <el-input-number v-model="form.total_camels" :controls="false" class="!w-full" />
    </el-form-item>
    <el-form-item label="产奶数" class="!mb-0">
      <el-input-number v-model="form.milking_camels" :controls="false" class="!w-full" />
    </el-form-item>
  </div>

  <!-- 第二部分：交奶情况 (对应您原本在 SetupWizard 里的逻辑) -->
  <h3 class="font-bold text-gray-700 mb-2 text-xs border-t pt-4">🥛 交奶情况 (用于预估)</h3>
  <div class="grid grid-cols-3 gap-2 mb-4" id="setting-milk">
    <el-form-item label="几天交一次">
      <el-input-number v-model="form.milk_frequency" :controls="false" class="!w-full" />
    </el-form-item>
    <el-form-item label="每次公斤">
      <el-input-number v-model="form.milk_quantity_per_time" :controls="false" class="!w-full" />
    </el-form-item>
    <el-form-item label="单价(元)">
      <el-input-number v-model="form.milk_price" :controls="false" class="!w-full" />
    </el-form-item>
  </div>

  <!-- 第三部分：每日明细 -->
  <div class="flex items-center justify-between border-t pt-4 mb-2 cursor-pointer select-none" @click="showDailyCosts = !showDailyCosts" id="setting-daily">
    <h3 class="font-bold text-gray-700 text-xs">💰 每天固定成本明细</h3>
    <div class="flex items-center gap-1 text-xs text-gray-400">
      <span>{{ showDailyCosts ? '收起' : '展开' }}</span>
      <el-icon class="transition-transform duration-200" :class="{'rotate-90': showDailyCosts}">
        <ArrowRight />
      </el-icon>
    </div>
  </div>
  
  <div v-show="showDailyCosts" class="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
    <div v-for="(item, idx) in form.daily_template" :key="idx" class="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
      <el-input v-model="item.name" placeholder="项" size="small" class="flex-1" />
      <el-input-number v-model="item.quantity" :controls="false" placeholder="量" size="small" style="width: 60px" />
      <el-input-number v-model="item.unit_price" :controls="false" placeholder="价" size="small" style="width: 60px" />
      <el-button type="danger" :icon="Delete" link @click="form.daily_template.splice(idx, 1)" />
    </div>
    <el-button :icon="Plus" class="w-full !rounded-xl" size="small" @click="form.daily_template.push({name: '', quantity: 0, unit_price: 0})">
      增加项
    </el-button>
  </div>

      <div class="mt-8 pt-6 border-t border-red-100 flex flex-col">
        <h3 class="text-red-500 font-bold text-xs mb-4 flex items-center gap-1">
          <el-icon><Warning /></el-icon> 账户安全与帮助
        </h3>
        
        <div class="flex flex-col gap-3">
          <!-- 🔴 导览入口 -->
          <el-button type="primary" plain class="!w-full !m-0 !h-12 font-bold" @click="handleShowGuide">
            再看一遍功能演示
          </el-button>

          <el-button type="danger" plain class="!w-full !m-0 !h-12 font-bold" @click="handleResetAll">
            一键清除所有数据
          </el-button>
          
          <el-button type="info" plain class="!w-full !m-0 !h-12 font-bold" @click="handleLogout">
            退出当前账号
          </el-button>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="flex gap-3">
        <el-button @click="visible = false" class="flex-1 rounded-xl">取消</el-button>
        <el-button type="primary" @click="save" :loading="loading" class="flex-1 rounded-xl font-bold">保存设置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { dataService } from '../api/dataService'
import { InfoFilled, Warning, Delete, Plus, ArrowRight } from '@element-plus/icons-vue' // 新增图标
import { ElMessage, ElMessageBox } from 'element-plus'




const visible = ref(false)
const loading = ref(false)
const showDailyCosts = ref(false)

const emit = defineEmits(['saved', 'showGuide'])

const form = reactive({  
  total_camels: 0, 
  milking_camels: 0,
  milk_price: 30,
  milk_frequency: 1,
  milk_quantity_per_time: 0,
  daily_template: [] // 确保初始化为数组
})

const open = async () => {
  visible.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  if (data) { 
    // 🔴 关键改动：使用 Object.assign 将数据库所有字段（含模板）同步到 form
    Object.assign(form, data) 
  }
}

// 约 71 行：保存逻辑
const save = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    // 🔴 关键改动：提交 form 全量数据，确保模板和奶价同步更新
    await supabase.from('settings').upsert({ 
      user_id: user.id, 
      ...form 
    }, { onConflict: 'user_id' })
    ElMessage.success('配置已更新'); visible.value = false; emit('saved')
  } catch (e) { ElMessage.error('保存失败') } finally { loading.value = false }
}

const handleLogout = async () => { await supabase.auth.signOut(); localStorage.clear(); window.location.reload() }

const handleShowGuide = () => {
  visible.value = false
  // 标注：重置历史页面指引状态，确保下次进入历史页会触发指引
  localStorage.removeItem('is_first_history') 
  emit('showGuide')
}

const handleResetAll = () => {
  ElMessageBox.confirm('确定要删除吗？不可撤销。', '彻底重置', { confirmButtonText: '确定', type: 'warning' }).then(async () => {
    loading.value = true
    try { await dataService.clearAllUserData(); localStorage.clear(); window.location.href = window.location.origin }
    catch (e) { ElMessage.error('失败') } finally { loading.value = false }
  }).catch(() => {})
}

defineExpose({ open, visible, showDailyCosts }) // 🔴 暴露 showDailyCosts 以便引导时自动展开
</script>