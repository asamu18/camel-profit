<template>
  <div class="space-y-6">
    <!-- 顶部设置入口 -->
    <div class="flex justify-between items-center px-1">
      <div class="text-xs text-gray-400">当前版本 v1.0</div>
      <button @click="openSettings" class="text-[#8B5E3C] text-sm flex items-center gap-1">
        <el-icon><Setting /></el-icon> 经营设置/重置
      </button>
    </div>

    <!-- AI 建议位 -->
    <div class="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
      <div class="text-2xl">🐫</div>
      <p class="text-amber-900 text-sm font-medium">{{ advice }}</p>
    </div>

    <!-- 数据看板 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden">
        <span class="text-gray-400 text-sm">今日交奶实收</span>
        <div>
          <span class="text-2xl font-bold" :class="hasTodayMilk ? 'text-emerald-500' : 'text-gray-300'">
            ￥{{ todayIncome }}
          </span>
          <p v-if="!hasTodayMilk" class="text-[10px] text-orange-400 mt-1">
            预计可收: ￥{{ (toNum(settings?.milk_quantity_per_time) * toNum(settings?.milk_price) / toNum(settings?.milk_frequency || 1)).toFixed(0) }}
          </p>
        </div>
        <div v-if="hasTodayMilk" class="absolute -right-2 -bottom-2 opacity-10 text-emerald-500 scale-150 rotate-12">
          <el-icon :size="60"><CircleCheckFilled /></el-icon>
        </div>
      </div>
      <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32">
        <span class="text-gray-400 text-sm">每日固定成本</span>
        <span class="text-2xl font-bold text-rose-500">￥{{ dailyFixedCost }}</span>
      </div>
    </div>

    <!-- 动态利润预估卡片 -->
    <div class="bg-[#8B5E3C] p-6 rounded-[2.5rem] shadow-xl text-white">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg opacity-80">本月利润 (动态)</h3>
          <p class="text-3xl font-bold mt-1">￥{{ formatNum(monthlyProfit) }}</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded-full block mb-1">已计入实际收支</span>
          <span class="text-[10px] text-white/50">月额外支出: ￥{{ monthlyExtra }}</span>
        </div>
      </div>
      <div class="pt-4 border-t border-white/10 flex items-center justify-between">
        <div>
          <p class="text-[10px] opacity-70">预计年利润 (基于当前规模)</p>
          <p class="text-lg font-bold">￥{{ formatNum(monthlyProfit * 12) }}</p>
        </div>
        <div class="text-right"><p class="text-[10px] opacity-50 italic">*实际收入越高，预估越准</p></div>
      </div>
    </div>

    <!-- 快捷操作区：改为 3 个按钮或调整布局 -->
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-4">
    <button @click="openMilk" :class="hasTodayMilk ? 'bg-gray-400' : 'bg-[#F59E0B]'" class="py-5 rounded-3xl font-bold text-lg shadow-md text-white flex flex-col items-center">
      <span>{{ hasTodayMilk ? '✅ 今日已交' : '🥛 刚交了奶' }}</span>
    </button>
    <button @click="openFeed" class="bg-emerald-600 text-white py-5 rounded-3xl font-bold text-lg shadow-md flex flex-col items-center">
      <span>🌾 进大车料</span>
    </button>
  </div>
  <button @click="openExtra" class="w-full bg-[#C4A484] text-white py-4 rounded-3xl font-bold text-lg shadow-md">
    🚜 其他额外开销 (兽药、维修等)
  </button>
</div>

    <!-- 弹窗组件 -->
    <AddRecordModal ref="addModalRef" @success="syncData" />
    <SetupWizard ref="wizardRef" @finish="syncData" />
    <SettingsModal ref="settingsRef" @saved="syncData" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { CircleCheckFilled, Setting } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus' // 引入弹窗
import AddRecordModal from './AddRecordModal.vue'
import SetupWizard from './SetupWizard.vue'
import SettingsModal from './SettingsModal.vue'
import { useRoute, useRouter } from 'vue-router' // 引入 useRouter

const addModalRef = ref(null)
const wizardRef = ref(null)
const settingsRef = ref(null)
const route = useRoute()
const router = useRouter()

// 核心状态
const income = ref([])
const cost = ref([])
const settings = ref(null)

const toNum = (val) => Number(val) || 0

// --- 计算属性 ---

const todayIncome = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return income.value
    .filter(i => i.date === today && i.category === '驼奶销售')
    .reduce((s, i) => s + toNum(i.amount), 0)
})

const hasTodayMilk = computed(() => todayIncome.value > 0)

const dailyFixedCost = computed(() => {
  if (!settings.value?.daily_template) return 0
  return settings.value.daily_template.reduce((s, i) => s + (toNum(i.quantity) * toNum(i.unit_price)), 0)
})

// Dashboard.vue 中的 monthlyProfit 计算属性
const monthlyProfit = computed(() => {
  if (!settings.value) return 0
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // 1. 理想日收入
  const dailyPotentialIncome = (toNum(settings.value.milk_quantity_per_time) * toNum(settings.value.milk_price)) / toNum(settings.value.milk_frequency || 1)

  // 2. 统计本月实账
  let totalActualIncome = 0
  let totalDaysCovered = 0 // 🔴 关键：这笔实账一共代表了多少天

  income.value.forEach(i => {
    const d = new Date(i.date)
    if (d.getFullYear() === year && d.getMonth() === month && i.category === '驼奶销售') {
      totalActualIncome += toNum(i.amount)
      // 如果记账时填了 duration，就累加；没填则默认为 1
      totalDaysCovered += toNum(i.duration || 1) 
    }
  })

  // 3. 计算剩余“真空”天数的预估收入
  // 剩余天数 = 本月总天数 - 实账已经占用的天数
  const remainingDays = Math.max(0, daysInMonth - totalDaysCovered)
  const projectedRemainingIncome = remainingDays * dailyPotentialIncome

  // 4. 总支出（保持不变，按全月算）
  const totalFixedCost = dailyFixedCost.value * daysInMonth
  const totalExtraCost = cost.value.filter(c => {
    const d = new Date(c.date)
    return d.getFullYear() === year && d.getMonth() === month && c.cost_type !== '日常支出' && c.cost_type !== '库存进货'
  }).reduce((s, v) => s + toNum(v.amount), 0)

  return (totalActualIncome + projectedRemainingIncome) - totalFixedCost - totalExtraCost
})

const monthlyExtra = computed(() => {
  const now = new Date()
  return cost.value.filter(c => {
    const d = new Date(c.date)
    return d.getMonth() === now.getMonth() && 
           c.cost_type !== '日常支出' && 
           c.cost_type !== '库存进货' // 🔴 关键：排除进货大额开支，防止利润瞬间变负数
  }).reduce((s, i) => s + toNum(i.amount), 0)
})

// 2. 增加打开进货弹窗的方法
const openFeed = () => addModalRef.value.openWithScene('买饲料')

const advice = computed(() => {
  if (hasTodayMilk.value) return "今日已交奶，平摊后的利润已更新！"
  
  // 如果今天没交奶，看距离上次交奶过了几天（简化版：今天是否需要交奶）
  const freq = toNum(settings.value?.milk_frequency || 1)
  if (freq > 1) {
    return `按计划每 ${freq} 天交一次奶，没交奶的日子也会自动计算预估利润。`
  }
  return "今天还没记交奶账呢，别忘了写上一笔。"
})

const formatNum = (n) => {
  if (isNaN(n)) return '0'
  return Math.round(n).toLocaleString()
}

const syncData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  const [incRes, costRes, setRes] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
    supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ])

  if (incRes.data) { income.value = incRes.data; localStorage.setItem('cache_inc', JSON.stringify(incRes.data)) }
  if (costRes.data) { cost.value = costRes.data; localStorage.setItem('cache_cost', JSON.stringify(costRes.data)) }
  if (setRes.data) { settings.value = setRes.data; localStorage.setItem('cache_set', JSON.stringify(setRes.data)) }
}

// 修改点：增加重复交奶拦截引导
const openMilk = () => {
  if (hasTodayMilk.value) {
    ElMessageBox.confirm(
      '今天已经记过一次交奶账单了。为了数据准确，每天只能记一次。如需修改，请前往历史页面。',
      '今日已交',
      { confirmButtonText: '去历史修改', cancelButtonText: '知道了', type: 'info' }
    ).then(() => {
      router.push('/history')
    }).catch(() => {})
    return
  }
  addModalRef.value.openWithScene('卖奶')
}

const openExtra = () => addModalRef.value.openWithScene('其他')
const openSettings = () => settingsRef.value.open()

onMounted(() => {
  income.value = JSON.parse(localStorage.getItem('cache_inc') || '[]')
  cost.value = JSON.parse(localStorage.getItem('cache_cost') || '[]')
  settings.value = JSON.parse(localStorage.getItem('cache_set') || 'null')
  syncData()
  setTimeout(() => { if (wizardRef.value) wizardRef.value.check() }, 1000)
})

watch(() => route.query.action, (val) => {
  if (val === 'addMilk') openMilk()
})
</script>