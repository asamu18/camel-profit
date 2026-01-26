<template>
  <div class="space-y-6">
    <!-- 顶部设置入口 -->
    <div class="flex justify-between items-center px-1">
      <div class="text-xs text-gray-400">版本 v1.5 - 自动补全成本版</div>
      <button @click="openSettings" class="text-[#8B5E3C] text-sm flex items-center gap-1 font-bold">
        <el-icon><Setting /></el-icon> 经营设置/重置
      </button>
    </div>

    <!-- 1. 核心：今天到手净赚 -->
    <div class="bg-white p-6 rounded-[2.5rem] shadow-sm border border-orange-100 flex flex-col justify-between h-44 relative overflow-hidden">
      <span class="text-gray-500 text-base font-bold">今天到手净赚</span>
      <div :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
        <span class="text-5xl font-black">¥ {{ formatNum(todayProfit) }}</span>
      </div>
      <div class="flex justify-between items-center">
        <p class="text-xs text-gray-400 font-medium italic">
          {{ hasTodayMilk ? `* 已按 ${todayMilkDuration} 天产量平摊` : '* 基于模板预估' }}
        </p>
        <div class="opacity-10">
          <el-icon :size="40" :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'"><TrendCharts /></el-icon>
        </div>
      </div>
    </div>

    <!-- 动态数据看板 -->
    <div class="grid gap-4" :class="hasTodayMilk ? 'grid-cols-2' : 'grid-cols-1'">
      <!-- 2. 今日交奶实收 -->
      <div v-if="hasTodayMilk" class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="h-5 flex items-center">
          <span class="text-gray-400 text-sm font-bold">今日交奶实收</span>
        </div>
        <div>
          <span class="text-2xl font-black text-emerald-500">
            ¥ {{ formatNum(todayIncome) }}
          </span>
          <div class="h-4 mt-1">
            <p class="text-[10px] opacity-0">占位</p>
          </div>
        </div>
        <div class="absolute -right-2 -bottom-2 opacity-10 text-emerald-500 scale-150 rotate-12">
          <el-icon :size="60"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <!-- 3. 每天喂草开支 -->
      <div @click="showTemplate = true" class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 active:bg-gray-50 transition-all">
        <div class="h-5 flex justify-between items-center">
          <span class="text-gray-400 text-sm font-bold">每天喂草开支</span>
          <el-icon class="text-gray-300"><ArrowRight /></el-icon>
        </div>
        <div>
          <span class="text-2xl font-black text-rose-500">¥ {{ formatNum(dailyFixedCost) }}</span>
          <div class="h-4 mt-1">
            <p class="text-[10px] text-blue-400 font-bold">点这里改明细</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 本月利润卡片 -->
    <div class="bg-[#8B5E3C] p-6 rounded-[2.5rem] shadow-xl text-white">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg opacity-80 font-bold">本月利润预估</h3>
          <p class="text-4xl font-black mt-1">¥ {{ formatNum(monthlyProfit) }}</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full block mb-1">实账+预估</span>
          <span class="text-[10px] text-white/50 font-bold">杂费: ¥{{ formatNum(monthlyExtra) }}</span>
        </div>
      </div>
      <div class="pt-4 border-t border-white/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] opacity-70 font-bold">预计一年能赚</p>
          <p class="text-xl font-black">¥ {{ formatNum(monthlyProfit * 12) }}</p>
        </div>
        <div class="text-right"><p class="text-[10px] opacity-50 italic">* 基于平摊逻辑计算</p></div>
      </div>
    </div>

    <!-- 快捷操作按钮 -->
    <div class="space-y-4">
      <button @click="openMilk" :class="hasTodayMilk ? 'bg-gray-400' : 'bg-[#F59E0B]'" class="w-full py-7 rounded-3xl font-black text-2xl shadow-lg text-white flex items-center justify-center gap-3 active:scale-95 transition-all">
        <span class="text-3xl">🥛</span>
        <span>{{ hasTodayMilk ? '今日账已记完' : '刚才交了奶' }}</span>
      </button>
      <button @click="openFeed" class="w-full bg-[#059669] py-7 rounded-3xl font-black text-2xl shadow-lg text-white flex items-center justify-center gap-3 active:scale-95 transition-all">
        <span class="text-3xl">🌾</span>
        <span>进饲料 / 买草</span>
      </button>
      <button @click="openExtra" class="w-full bg-[#C4A484] py-5 rounded-3xl font-black text-lg shadow-md text-white flex items-center justify-center gap-2 active:scale-95 transition-all">
        <el-icon :size="20"><EditPen /></el-icon>
        <span>记一笔杂费 (修车、买药等)</span>
      </button>
    </div>

    <!-- 弹窗 -->
    <AddRecordModal ref="addModalRef" @success="syncData" />
    <SetupWizard ref="wizardRef" @finish="syncData" />
    <SettingsModal ref="settingsRef" @saved="syncData" />
    <ImportMilkModal ref="importModalRef" @success="syncData" />

    <el-dialog v-model="showTemplate" title="每天喂草开支管理" width="95%" style="max-width: 450px" center destroy-on-close>
      <div class="space-y-4">
        <div class="max-h-[40vh] overflow-y-auto space-y-3 pr-1">
          <div v-for="(item, idx) in templateCopy" :key="idx" class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div class="flex justify-between items-center mb-3">
              <el-input v-model="item.name" size="large" class="w-2/3 font-black" />
              <el-button type="danger" link @click="templateCopy.splice(idx, 1)"><el-icon :size="20"><Delete /></el-icon></el-button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-gray-400 ml-1">数量</span>
                <el-input-number v-model="item.quantity" :min="0" size="large" class="w-full" :controls="false" />
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[10px] text-gray-400 ml-1">单价</span>
                <el-input-number v-model="item.unit_price" :min="0" size="large" class="w-full" :controls="false" />
              </div>
            </div>
          </div>
          <el-button class="w-full py-4 border-dashed rounded-xl font-bold" @click="templateCopy.push({name: '', quantity: 1, unit_price: 0})">+ 增加开支项</el-button>
        </div>
        <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-2">
          <p class="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1"><el-icon><Calendar /></el-icon> 同时也修改以前的账单</p>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-white rounded-xl border border-blue-200 h-12">
                <span class="text-[8px] text-blue-400">从哪天起</span><span class="text-xs font-black text-blue-700">{{ syncStartDate || '选日期' }}</span>
                <input type="date" v-model="syncStartDate" class="absolute inset-0 opacity-0 w-full h-full" />
            </div>
            <div class="text-blue-300">-</div>
            <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-white rounded-xl border border-blue-200 h-12">
                <span class="text-[8px] text-blue-400">到哪天止</span><span class="text-xs font-black text-blue-700">{{ syncEndDate || '选日期' }}</span>
                <input type="date" v-model="syncEndDate" class="absolute inset-0 opacity-0 w-full h-full" />
            </div>
          </div>
        </div>
        <el-button type="primary" class="w-full py-6 font-black text-xl rounded-3xl shadow-lg" @click="saveTemplate" :loading="saving">确认保存修改</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase'
import { CircleCheckFilled, Setting, ArrowRight, Delete, TrendCharts, EditPen, Calendar, RefreshRight } from '@element-plus/icons-vue'
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

const income = ref([])
const cost = ref([])
const settings = ref(null)
const showTemplate = ref(false)
const templateCopy = ref([])
const syncStartDate = ref('')
const syncEndDate = ref('')
const saving = ref(false)

const toNum = (val) => Number(val) || 0
const formatNum = (n) => {
  if (n === null || n === undefined) return '0'
  const rounded = Math.round(n)
  return (rounded < 0 ? '-' : '') + Math.abs(rounded).toLocaleString('en-US')
}

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

const todayMilkDuration = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const record = income.value.find(i => i.date === today && i.category === '驼奶销售')
  return record ? (toNum(record.duration) || 1) : 1
})

const todayExtraCost = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return cost.value
    .filter(c => c.date === today && c.cost_type !== '日常支出' && c.cost_type !== '库存进货')
    .reduce((s, i) => s + toNum(i.amount), 0)
})

const todayProfit = computed(() => {
  const effectiveDailyIncome = hasTodayMilk.value ? (todayIncome.value / todayMilkDuration.value) : dailyPotentialIncome.value
  return effectiveDailyIncome - dailyFixedCost.value - todayExtraCost.value
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

// 🔴 核心修复：自动补齐漏掉的每日成本
const autoFillMissingCosts = async (userId, dailyTemplate) => {
  if (!dailyTemplate || dailyTemplate.length === 0) return

  // 1. 获取数据库中最近一笔“日常支出”的日期
  const { data: lastCost } = await supabase
    .from('cost')
    .select('date')
    .eq('user_id', userId)
    .eq('cost_type', '日常支出')
    .order('date', { ascending: false })
    .limit(1)

  const todayStr = new Date().toISOString().slice(0, 10)
  let startDate = new Date()

  if (lastCost && lastCost.length > 0) {
    startDate = new Date(lastCost[0].date)
    startDate.setDate(startDate.getDate() + 1) // 从最后一笔的后一天开始补
  } else {
    // 如果从来没记过，只记今天
    startDate = new Date(todayStr)
  }

  const today = new Date(todayStr)
  const batchRecords = []

  // 2. 循环补齐从 startDate 到 today 的所有日期
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    dailyTemplate.forEach(item => {
      batchRecords.push({
        user_id: userId,
        date: dateStr,
        category: item.name,
        amount: toNum(item.quantity) * toNum(item.unit_price),
        quantity: toNum(item.quantity),
        unit_price: toNum(item.unit_price),
        cost_type: '日常支出'
      })
    })
  }

  if (batchRecords.length > 0) {
    console.log(`正在自动补齐 ${batchRecords.length / dailyTemplate.length} 天的成本记录...`)
    await supabase.from('cost').insert(batchRecords)
    return true
  }
  return false
}

const syncData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  // 🔴 增加读取 Limit 到 500，防止数据被截断
  const [incRes, costRes, setRes] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
    supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ])

  if (setRes.data) {
    settings.value = setRes.data
    templateCopy.value = JSON.parse(JSON.stringify(setRes.data.daily_template || []))
    
    // 🔴 每次同步数据时，顺便检查并补齐缺失的成本账单
    const filled = await autoFillMissingCosts(user.id, setRes.data.daily_template)
    if (filled) {
      // 如果补齐了数据，重新拉取一次 cost 列表
      const { data: newCost } = await supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500)
      cost.value = newCost || []
    } else {
      cost.value = costRes.data || []
    }
  }

  if (incRes.data) income.value = incRes.data
}

const saveTemplate = async () => {
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('settings').update({ daily_template: templateCopy.value }).eq('user_id', user.id)
    if (syncStartDate.value && syncEndDate.value) {
      await supabase.from('cost').delete().eq('user_id', user.id).eq('cost_type', '日常支出').gte('date', syncStartDate.value).lte('date', syncEndDate.value)
      const batchRecords = []
      const start = new Date(syncStartDate.value); const end = new Date(syncEndDate.value)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        templateCopy.value.forEach(item => { batchRecords.push({ user_id: user.id, date: dateStr, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price), quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出' }) })
      }
      if (batchRecords.length > 0) await supabase.from('cost').insert(batchRecords)
    } else {
      await supabase.from('cost').delete().eq('user_id', user.id).eq('date', today).eq('cost_type', '日常支出')
      const dailyRecords = templateCopy.value.map(item => ({ user_id: user.id, date: today, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price), quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出' }))
      if (dailyRecords.length > 0) await supabase.from('cost').insert(dailyRecords)
    }
    ElMessage.success('保存成功')
    showTemplate.value = false; syncStartDate.value = ''; syncEndDate.value = ''; syncData()
  } catch (e) { ElMessage.error('保存失败') } finally { saving.value = false }
}

const openMilk = () => {
  if (!addModalRef.value) return
  if (hasTodayMilk.value) {
    ElMessageBox.confirm('今天交奶已经记过了，要去历史里改吗？', '今日已交', { confirmButtonText: '去历史修改', cancelButtonText: '不用了' }).then(() => router.push('/history'))
    return
  }
  addModalRef.value.openWithScene('卖奶')
}
const openFeed = () => addModalRef.value.openWithScene('买饲料')
const openExtra = () => addModalRef.value.openWithScene('其他')
const openSettings = () => settingsRef.value.open()
const openAIImport = async () => { if (!importModalRef.value) await nextTick(); importModalRef.value.open() }

onMounted(async () => {
  await syncData()
  setTimeout(() => { if (wizardRef.value) wizardRef.value.check() }, 1000)
})

watch(() => route.query.action, async (val) => {
  if (val === 'bulkImport') { openAIImport() }
  setTimeout(() => { router.replace({ path: '/', query: {} }) }, 500)
}, { immediate: true })
</script>

<style scoped>
.font-black { font-family: system-ui, -apple-system, sans-serif; }
</style>