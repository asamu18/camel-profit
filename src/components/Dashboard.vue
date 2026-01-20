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
        <!-- 统一符号 ¥ 和三位逗号格式 -->
        <span class="text-3xl font-bold">¥ {{ formatNum(todayProfit) }}</span>
      </div>
      <div class="flex justify-between items-center">
  <p class="text-[10px] text-gray-300 italic">
    {{ hasTodayMilk ? '* 基于今日实账计算' : '* 基于模板预估' }}
  </p>
  <div class="opacity-10">
    <el-icon :size="24" :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
      <TrendCharts />
    </el-icon>
  </div>
</div>
    </div>

    <!-- 数据看板 -->
    <div class="grid grid-cols-2 gap-4">
      <!-- 2. 今日交奶实收 -->
      <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden">
        <span class="text-gray-400 text-sm">今日交奶实收</span>
        <div>
          <span class="text-2xl font-bold" :class="hasTodayMilk ? 'text-emerald-500' : 'text-gray-300'">
            <!-- 这里也统一加上 ¥ 和 formatNum -->
            ¥ {{ formatNum(todayIncome) }}
          </span>
          <!-- 🔴 关键修复：无论是否有数据，都保持一行高度，确保数值不上移或下沉 -->
      <div class="h-4 mt-1">
          <p v-if="!hasTodayMilk" class="text-[10px] text-orange-400 mt-1">
            预计: ¥ {{ formatNum(dailyPotentialIncome) }}
          </p>
          <!-- 已交奶时，放一个透明的占位符保持高度一致 -->
        <p v-else class="text-[10px] opacity-0">占位</p>
        </div>
        </div>
        <div v-if="hasTodayMilk" class="absolute -right-2 -bottom-2 opacity-10 text-emerald-500 scale-150 rotate-12">
          <el-icon :size="60"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <!-- 3. 每日固定成本卡片 -->
      <div @click="showTemplate = true" class="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col justify-between h-32 active:bg-gray-50 transition-colors">
        <div class="flex justify-between items-center">
          <span class="text-gray-400 text-sm">每日固定成本</span>
          <el-icon class="text-gray-300"><ArrowRight /></el-icon>
        </div>
        <div>
          <span class="text-2xl font-bold text-rose-500">¥ {{ formatNum(dailyFixedCost) }}</span>
          <p class="text-[10px] text-blue-400 mt-1">点击修改明细</p>
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
          <span>{{ hasTodayMilk ? '✅ 今日已交' : '🥛 刚交了奶' }}</span>
          <!-- 🔴 增加一个小字入口 -->
  <span @click.stop="openAIImport" class="text-[10px] mt-1 underline opacity-80">批量文字导入</span>
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

    <!-- 弹窗部分保持不变 -->
    <AddRecordModal ref="addModalRef" @success="syncData" />
    <SetupWizard ref="wizardRef" @finish="syncData" />
    <SettingsModal ref="settingsRef" @saved="syncData" />

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
<!-- 底部挂载新组件 -->
<ImportMilkModal ref="importModalRef" @success="syncData" />


<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { CircleCheckFilled, Setting, ArrowRight, Delete, TrendCharts, EditPen } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import AddRecordModal from './AddRecordModal.vue'
import SetupWizard from './SetupWizard.vue'
import SettingsModal from './SettingsModal.vue'
import { useRoute, useRouter } from 'vue-router'



const addModalRef = ref(null)
const wizardRef = ref(null)
const settingsRef = ref(null)
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

// --- 修复点：核心格式化函数 ---
const formatNum = (n) => {
  if (n === null || n === undefined) return '0'
  const rounded = Math.round(n)
  const isNegative = rounded < 0
  // 强制使用美国英语格式以确保三位一个逗号，同时手动处理负号
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

const todayExtraCost = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return cost.value
    .filter(c => c.date === today && c.cost_type !== '日常支出' && c.cost_type !== '库存进货')
    .reduce((s, i) => s + toNum(i.amount), 0)
})

// 2. 修改今日预计净利润：实账优先，模板保底
const todayProfit = computed(() => {
  // 收入部分：如果今天交了奶，就用今天实际交奶的钱；否则，用模板预估的日收入
  const currentIncome = hasTodayMilk.value ? todayIncome.value : dailyPotentialIncome.value
  
  // 支出部分：固定成本模板 + 今日发生的额外支出
  const currentCost = dailyFixedCost.value + todayExtraCost.value
  
  return currentIncome - currentCost
})

const todayIncome = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return income.value.filter(i => i.date === today && i.category === '驼奶销售').reduce((s, i) => s + toNum(i.amount), 0)
})

const hasTodayMilk = computed(() => todayIncome.value > 0)

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

const advice = computed(() => hasTodayMilk.value ? "今日已交奶，平摊后的利润已更新！" : "点击下方黄色按钮记录交奶实账。")

// --- 方法同步 ---
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

// src/components/Dashboard.vue 中的 saveTemplate 方法
const saveTemplate = async () => {
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)

    // 1. 更新设置表中的模板
    const { error: setErr } = await supabase
      .from('settings')
      .update({ daily_template: templateCopy.value })
      .eq('user_id', user.id)
    if (setErr) throw setErr

    // 2. 🔴 关键逻辑：将模板同步为今天的“实账”
    // 先删除今天已有的旧“日常支出”，防止重复
    await supabase.from('cost').delete().eq('user_id', user.id).eq('date', today).eq('cost_type', '日常支出')

    // 插入新的明细记录
    const dailyRecords = templateCopy.value.map(item => ({
      user_id: user.id,
      date: today,
      category: item.name,
      amount: toNum(item.quantity) * toNum(item.unit_price),
      quantity: toNum(item.quantity),
      unit_price: toNum(item.unit_price),
      cost_type: '日常支出' // 标记为模板生成的日常开支
    }))

    if (dailyRecords.length > 0) {
      const { error: costErr } = await supabase.from('cost').insert(dailyRecords)
      if (costErr) throw costErr
    }

    ElMessage.success('模板已更新，今日账单已同步')
    showTemplate.value = false
    syncData() // 刷新首页数据
  } catch (err) {
    ElMessage.error('保存失败: ' + err.message)
  } finally {
    saving.value = false
  }
}

const openMilk = () => {
  if (hasTodayMilk.value) {
    ElMessageBox.confirm('今日已记账，如需修改请前往历史页面。', '提示', { confirmButtonText: '去历史', cancelButtonText: '取消' })
      .then(() => router.push('/history'))
    return
  }
  addModalRef.value.openWithScene('卖奶')
}
const openFeed = () => addModalRef.value.openWithScene('买饲料')
const openExtra = () => addModalRef.value.openWithScene('其他')
const openSettings = () => settingsRef.value.open()

onMounted(async () => {
  // 1. 先同步一次数据
  await syncData()

  // 2. 稍微延迟一下，确保组件 ref 已挂载
  setTimeout(() => {
    if (wizardRef.value) {
      console.log("正在执行向导自动检查...")
      wizardRef.value.check()
    }
  }, 500) // 500ms 足够了
})
watch(() => route.query.action, (val) => { if (val === 'addMilk') openMilk() })


</script>

<style scoped>
/* 🔴 移除 font-mono，确保符号 ¥ 在默认字体下呈现双横线形态 */
.font-bold {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>