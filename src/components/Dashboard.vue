<template>
  <div class="space-y-6">
    <!-- 顶部设置入口 -->
    <div class="flex justify-between items-center px-1">
      <div class="text-xs text-gray-400">版本 v1.1 - App 适配版</div>
      <button @click="openSettings" class="text-[#8B5E3C] text-sm flex items-center gap-1">
        <el-icon><Setting /></el-icon> 经营设置/重置
      </button>
    </div>

    <!-- 1. 今日预计净利润卡片 -->
    <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden">
      <span class="text-gray-400 text-sm">今日预计净利润</span>
      <div :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
        <span class="text-3xl font-bold">¥ {{ formatNum(todayProfit) }}</span>
      </div>
      <div class="flex justify-between items-center">
        <p class="text-[10px] text-gray-300 italic">
          {{ hasTodayMilk ? '* 基于今日实账计算' : '* 基于模板预估' }}
        </p>
        <div class="opacity-10">
          <el-icon :size="24" :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'"><TrendCharts /></el-icon>
        </div>
      </div>
    </div>

    <!-- 数据看板 -->
    <div class="grid grid-cols-2 gap-4">
      <!-- 2. 今日交奶实收 -->
      <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden">
        <div class="h-5 flex items-center">
          <span class="text-gray-400 text-sm">今日交奶实收</span>
        </div>
        <div>
          <span class="text-2xl font-bold" :class="hasTodayMilk ? 'text-emerald-500' : 'text-gray-300'">
            ¥ {{ formatNum(todayIncome) }}
          </span>
          <div class="h-4 mt-1">
            <p v-if="!hasTodayMilk" class="text-[10px] text-orange-400">
              预计: ¥ {{ formatNum(dailyPotentialIncome) }}
            </p>
            <p v-else class="text-[10px] opacity-0">占位</p>
          </div>
        </div>
        <div v-if="hasTodayMilk" class="absolute -right-2 -bottom-2 opacity-10 text-emerald-500 scale-150 rotate-12">
          <el-icon :size="60"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <!-- 3. 每日固定成本卡片 -->
      <div @click="showTemplate = true" class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 active:bg-gray-50 transition-colors">
        <div class="h-5 flex justify-between items-center">
          <span class="text-gray-400 text-sm">每日固定成本</span>
          <el-icon class="text-gray-300"><ArrowRight /></el-icon>
        </div>
        <div>
          <span class="text-2xl font-bold text-rose-500">¥ {{ formatNum(dailyFixedCost) }}</span>
          <div class="h-4 mt-1">
            <p class="text-[10px] text-blue-400">点击修改明细</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 本月/年利润预估卡片 (褐色) -->
    <div class="bg-[#8B5E3C] p-6 rounded-[2.5rem] shadow-xl text-white">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg opacity-80">本月利润预估</h3>
          <p class="text-3xl font-bold mt-1">¥ {{ formatNum(monthlyProfit) }}</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded-full block mb-1">已计入实际收支</span>
          <span class="text-[10px] text-white/50">月额外支出: ¥ {{ formatNum(monthlyExtra) }}</span>
        </div>
      </div>
      <div class="pt-4 border-t border-white/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] opacity-70">预计年利润 (当前规模)</p>
          <p class="text-lg font-bold">¥ {{ formatNum(monthlyProfit * 12) }}</p>
        </div>
        <div class="text-right"><p class="text-[10px] opacity-50 italic">* 基于平摊逻辑计算</p></div>
      </div>
    </div>

    <!-- 快捷操作按钮 -->
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-4">
        <button @click="openMilk" :class="hasTodayMilk ? 'bg-gray-400' : 'bg-[#F59E0B]'" class="py-5 rounded-3xl font-bold text-lg shadow-md text-white flex flex-col items-center">
          <!-- 🔴 删除了下方的批量文字导入小字 -->
          <span>{{ hasTodayMilk ? '✅ 今日已交' : '🥛 刚交了奶' }}</span>
        </button>
        <button @click="openFeed" class="bg-emerald-600 text-white py-5 rounded-3xl font-bold text-lg shadow-md flex flex-col items-center">
          <span>🌾 进大车料</span>
        </button>
      </div>
      <button @click="openExtra" class="w-full bg-[#C4A484] text-white py-4 rounded-3xl font-bold text-lg shadow-md flex items-center justify-center gap-2">
        <el-icon><EditPen /></el-icon>
        <span>记一笔额外开销 (支出)</span>
      </button>
    </div>

    <!-- 弹窗组件 -->
    <AddRecordModal ref="addModalRef" @success="syncData" />
    <SetupWizard ref="wizardRef" @finish="syncData" />
    <SettingsModal ref="settingsRef" @saved="syncData" />
    <ImportMilkModal ref="importModalRef" @success="syncData" />

    <!-- 每日模板编辑弹窗 -->
    <el-dialog v-model="showTemplate" title="每日固定成本模板" width="90%" style="max-width: 450px" center destroy-on-close>
      <div class="space-y-3">
        <div v-for="(item, idx) in templateCopy" :key="idx" class="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div class="flex justify-between items-center mb-2">
            <el-input v-model="item.name" size="small" class="w-2/3 font-bold" />
            <el-button type="danger" link @click="templateCopy.splice(idx, 1)"><el-icon><Delete /></el-icon></el-button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <el-input-number v-model="item.quantity" :min="0" size="small" class="w-full" :controls="false" />
            <el-input-number v-model="item.unit_price" :min="0" size="small" class="w-full" :controls="false" />
          </div>
        </div>
        <el-button class="w-full border-dashed" @click="templateCopy.push({name: '', quantity: 1, unit_price: 0})">+ 增加物料</el-button>
        <el-button type="primary" class="w-full py-4 mt-4 font-bold" @click="saveTemplate" :loading="saving">保存修改</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase'
import { CircleCheckFilled, Setting, ArrowRight, Delete, TrendCharts, EditPen } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import AddRecordModal from './AddRecordModal.vue'
import SetupWizard from './SetupWizard.vue'
import SettingsModal from './SettingsModal.vue'
import ImportMilkModal from './ImportMilkModal.vue'
import { useRoute, useRouter } from 'vue-router'

const addModalRef = ref(null)
const wizardRef = ref(null)
const settingsRef = ref(null)
const importModalRef = ref(null)
const route = useRoute()
const router = useRouter()

// 状态
const income = ref([])
const cost = ref([])
const settings = ref(null)
const showTemplate = ref(false)
const templateCopy = ref([])
const saving = ref(false)

const toNum = (val) => Number(val) || 0

// --- 格式化函数 ---
const formatNum = (n) => {
  if (n === null || n === undefined) return '0'
  const rounded = Math.round(n)
  const isNegative = rounded < 0
  return (isNegative ? '-' : '') + Math.abs(rounded).toLocaleString('en-US')
}

// --- 计算属性 ---
const dailyPotentialIncome = computed(() => {
  if (!settings.value) return 0
  return (toNum(settings.value.milk_quantity_per_time) * toNum(settings.value.milk_price)) / toNum(settings.value.milk_frequency || 1)
})

const dailyFixedCost = computed(() => {
  const list = settings.value?.daily_template || []
  return list.reduce((s, i) => s + (toNum(i.quantity) * toNum(i.unit_price)), 0)
})

const todayIncome = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return income.value.filter(i => i.date === today && i.category === '驼奶销售').reduce((s, i) => s + toNum(i.amount), 0)
})

const hasTodayMilk = computed(() => todayIncome.value > 0)

const todayExtraCost = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return cost.value
    .filter(c => c.date === today && c.cost_type !== '日常支出' && c.cost_type !== '库存进货')
    .reduce((s, i) => s + toNum(i.amount), 0)
})

const todayProfit = computed(() => {
  const currentIncome = hasTodayMilk.value ? todayIncome.value : dailyPotentialIncome.value
  const currentCost = dailyFixedCost.value + todayExtraCost.value
  return currentIncome - currentCost
})

const monthlyProfit = computed(() => {
  if (!settings.value) return 0
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  let totalActualIncome = 0
  let totalDaysCovered = 0
  income.value.forEach(i => {
    const d = new Date(i.date)
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && i.category === '驼奶销售') {
      totalActualIncome += toNum(i.amount)
      totalDaysCovered += Math.max(1, toNum(i.duration || 1))
    }
  })
  const remainingDays = Math.max(0, daysInMonth - totalDaysCovered)
  const totalProjectedIncome = totalActualIncome + (remainingDays * dailyPotentialIncome.value)
  const totalFixedCost = dailyFixedCost.value * daysInMonth
  const totalExtraCost = cost.value.filter(c => {
    const d = new Date(c.date)
    return d.getMonth() === now.getMonth() && c.cost_type !== '日常支出' && c.cost_type !== '库存进货'
  }).reduce((s, v) => s + toNum(v.amount), 0)
  return totalProjectedIncome - totalFixedCost - totalExtraCost
})

const monthlyExtra = computed(() => {
  const now = new Date()
  return cost.value.filter(c => {
    const d = new Date(c.date)
    return d.getMonth() === now.getMonth() && c.cost_type !== '日常支出' && c.cost_type !== '库存进货'
  }).reduce((s, i) => s + toNum(i.amount), 0)
})

// --- 方法 ---
const syncData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const [incRes, costRes, setRes] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
    supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ])
  if (incRes.data) income.value = incRes.data
  if (costRes.data) cost.value = costRes.data
  if (setRes.data) {
    settings.value = setRes.data
    templateCopy.value = JSON.parse(JSON.stringify(setRes.data.daily_template || []))
  }
}

const saveTemplate = async () => {
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('settings').update({ daily_template: templateCopy.value }).eq('user_id', user.id)
    await supabase.from('cost').delete().eq('user_id', user.id).eq('date', today).eq('cost_type', '日常支出')
    const dailyRecords = templateCopy.value.map(item => ({
      user_id: user.id, date: today, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price),
      quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出'
    }))
    if (dailyRecords.length > 0) await supabase.from('cost').insert(dailyRecords)
    ElMessage.success('模板及今日账单已更新')
    showTemplate.value = false
    syncData()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const openMilk = () => {
  if (!addModalRef.value) return
  if (hasTodayMilk.value) {
    ElMessageBox.confirm('今日已记账，如需修改请前往历史页面。', '提示', { confirmButtonText: '去历史', cancelButtonText: '取消' })
      .then(() => router.push('/history'))
    return
  }
  addModalRef.value.openWithScene('卖奶')
}

// 批量文字导入
const openAIImport = () => { if (importModalRef.value) importModalRef.value.open() }
const openFeed = () => addModalRef.value.openWithScene('买饲料')
const openExtra = () => addModalRef.value.openWithScene('其他')
const openSettings = () => settingsRef.value.open()

onMounted(async () => {
  await syncData()
  setTimeout(() => { if (wizardRef.value) wizardRef.value.check() }, 1000)
})

// 🔴 修改路由监听：响应 bulkImport
watch(() => route.query.action, async (val) => {
  if (!val) return
  
  // 等待组件挂载
  if (!addModalRef.value || !importModalRef.value) await nextTick()

  if (val === 'addMilk') {
    openMilk()
  } else if (val === 'bulkImport') {
    openAIImport() // 🔴 触发文字导入
  }

  // 清理地址栏
  setTimeout(() => {
    router.replace({ path: '/', query: {} })
  }, 500)
}, { immediate: true })
</script>

<style scoped>
.font-bold { font-family: system-ui, -apple-system, sans-serif; }
</style>