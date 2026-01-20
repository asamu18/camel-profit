<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-xl font-bold text-[#8B5E3C]">账务明细</h2>
      <el-radio-group v-model="viewType" size="small">
        <el-radio-button label="all">流水</el-radio-button>
        <el-radio-button label="fixed">每日模板</el-radio-button>
        <el-radio-button label="feed">大车进货</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 1. 每日模板栏：允许实时修改 -->
    <div v-if="viewType === 'fixed'" class="space-y-3 animate-in fade-in">
      <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
        <div class="flex justify-between items-center">
          <span class="text-blue-800 font-bold">每日固定消耗明细</span>
          <span class="text-blue-700 font-mono font-bold">合计: ￥{{ dailyTemplateTotal }}</span>
        </div>
        <p class="text-[10px] text-blue-400 mt-1">修改后点击下方“保存设置”即可生效</p>
      </div>

      <div v-for="(item, idx) in templateCopy" :key="idx" 
           class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-3">
          <el-input v-model="item.name" size="small" placeholder="项目名称" class="w-1/2 font-bold" />
          <el-button type="danger" link @click="removeTemplateItem(idx)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <div class="flex gap-4 items-center">
          <div class="flex-1">
            <span class="text-[10px] text-gray-400 block mb-1">数量/重量</span>
            <el-input-number v-model="item.quantity" :min="0" size="small" :controls="false" class="w-full" />
          </div>
          <div class="flex-1">
            <span class="text-[10px] text-gray-400 block mb-1">单价</span>
            <el-input-number v-model="item.unit_price" :min="0" size="small" :controls="false" class="w-full" />
          </div>
          <div class="w-20 text-right">
            <span class="text-[10px] text-gray-400 block mb-1">小计</span>
            <span class="font-bold text-rose-500">￥{{ (item.quantity * item.unit_price).toFixed(0) }}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <el-button class="flex-1 border-dashed" @click="addTemplateItem">+ 增加项</el-button>
        <el-button type="primary" class="flex-1 font-bold" @click="saveTemplateChanges" :loading="saving">保存修改</el-button>
      </div>
    </div>

    <!-- 2. 全部流水 & 进货单 -->
    <div v-else class="space-y-3 animate-in fade-in">
      <!-- 进货统计头 -->
      <div v-if="viewType === 'feed'" class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2 flex justify-between items-center">
        <span class="text-emerald-800 font-bold">大车进货总支出</span>
        <span class="text-emerald-700 font-bold font-mono">￥{{ feedTotalAmount.toLocaleString() }}</span>
      </div>

      <!-- 循环真实账单列表 -->
      <div 
        v-for="item in filteredList" 
        :key="item.id" 
        class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group"
      >
        <div class="flex items-center gap-4">
          <div :class="getItemColor(item)" class="w-10 h-10 rounded-full flex items-center justify-center text-lg">
            {{ getItemEmoji(item) }}
          </div>
          <div>
            <p class="font-bold text-gray-800 text-sm">{{ item.category }}</p>
            <p class="text-[10px] text-gray-400">
              {{ item.date }} 
              <span v-if="item.duration > 1">| 涵盖{{item.duration}}天</span>
              <span v-if="item.weight">| {{item.weight}}吨</span>
            </p>
          </div>
        </div>

        <div class="text-right">
          <p :class="item.isIncome ? 'text-emerald-500' : 'text-rose-500'" class="font-bold font-mono text-lg">
            {{ item.isIncome ? '+' : '-' }}{{ item.amount.toLocaleString() }}
          </p>
          <button @click="handleDelete(item)" class="text-[10px] text-rose-300">删除</button>
        </div>
      </div>
      
      <div v-if="filteredList.length === 0" class="py-20 text-center text-gray-300 text-sm">暂无记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { dataService } from '../api/dataService'

const income = ref([])
const cost = ref([])
const settings = ref(null)
const templateCopy = ref([]) // 用于编辑的模板副本
const viewType = ref('all')
const saving = ref(false)

const fetchData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const [incRes, costRes, setRes] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ])
  income.value = incRes.data || []
  cost.value = costRes.data || []
  settings.value = setRes.data || null
  
  if (settings.value?.daily_template) {
    templateCopy.value = JSON.parse(JSON.stringify(settings.value.daily_template))
  }
}

// 每日模板的总金额 (基于副本计算)
const dailyTemplateTotal = computed(() => {
  return templateCopy.value.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
})

const feedTotalAmount = computed(() => {
  return cost.value.filter(x => x.cost_type === '库存进货').reduce((s, i) => s + Number(i.amount), 0)
})

const filteredList = computed(() => {
  if (viewType.value === 'feed') {
    return cost.value
      .filter(x => x.cost_type === '库存进货')
      .map(x => ({ ...x, isIncome: false }))
  }

  // 🔴 核心逻辑：流水栏排除“日常支出”类型的记录
  const list = [
    ...income.value.map(x => ({ ...x, isIncome: true })),
    ...cost.value.filter(x => x.cost_type !== '日常支出').map(x => ({ ...x, isIncome: false }))
  ]
  return list.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100)
})

// --- 模板操作 ---
const addTemplateItem = () => {
  templateCopy.value.push({ name: '', quantity: 1, unit_price: 0 })
}

const removeTemplateItem = (idx) => {
  templateCopy.value.splice(idx, 1)
}

const saveTemplateChanges = async () => {
  if (templateCopy.value.some(i => !i.name.trim())) {
    return ElMessage.warning('项目名称不能为空')
  }
  
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('settings')
      .update({ daily_template: templateCopy.value })
      .eq('user_id', user.id)
    
    if (error) throw error
    ElMessage.success('保存成功，利润计算已同步更新')
    fetchData() // 重新同步
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const getItemEmoji = (i) => {
  if (i.isIncome) return '🥛'
  if (i.cost_type === '库存进货') return '🌾'
  return '🚜'
}

const getItemColor = (i) => {
  if (i.isIncome) return 'bg-emerald-50 text-emerald-600'
  if (i.cost_type === '库存进货') return 'bg-orange-50 text-orange-600'
  return 'bg-gray-50 text-gray-600'
}

const handleDelete = (item) => {
  ElMessageBox.confirm(`确定删除这条记录吗？`, '警告').then(async () => {
    const table = item.isIncome ? 'income' : 'cost'
    await dataService.deleteRecord(table, item.id)
    ElMessage.success('已删除')
    fetchData()
  }).catch(() => {})
}

onMounted(fetchData)
</script>