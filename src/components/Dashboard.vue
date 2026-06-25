<template>
  <div class="space-y-6">
    <!-- 顶部 -->
    <div class="flex justify-between items-center px-1">
      <div class="text-xs text-gray-400">版本 v1.6 - 极简导览版</div>
      <button id="guide-settings" @click="openSettings" class="text-[#8B5E3C] text-sm flex items-center gap-1 font-bold">
        <el-icon><Setting /></el-icon> 经营设置/重置
      </button>
    </div>

    <!-- 1. 今天到手净赚 (ID: guide-profit) -->
    <div id="guide-profit" class="bg-white p-6 rounded-[2.5rem] shadow-sm border border-orange-100 flex flex-col justify-between h-44 relative overflow-hidden">
      <span class="text-gray-500 text-base font-bold">今天到手净赚</span>
      
      <!-- 骨架屏 -->
      <div v-if="loading" class="animate-pulse space-y-4">
        <div class="h-12 bg-gray-200 rounded-xl w-3/4"></div>
        <div class="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
      
      <template v-else>
        <div :class="todayProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          <span class="text-5xl font-black">
            ¥ <CountTo :value="todayProfit" />
          </span>
        </div>
        <div class="flex justify-between items-center">
          <p class="text-xs text-gray-400 font-medium italic">
            {{ hasTodayMilk ? `* 已按 ${todayMilkDuration} 天产量平摊` : '* 这是今天的预估' }}
          </p>
          <div class="opacity-10"><el-icon :size="40"><TrendCharts /></el-icon></div>
        </div>
      </template>
    </div>

    <!-- 数据面板 (ID: guide-cards) -->
    <div id="guide-cards" class="grid gap-4" :class="hasTodayMilk ? 'grid-cols-2' : 'grid-cols-1'">
      <div v-if="hasTodayMilk" class="bg-white p-5 rounded-3xl border border-gray-50 flex flex-col justify-between h-32 relative overflow-hidden">
        <span class="text-gray-400 text-sm font-bold">今日交奶实收</span>
        
        <div v-if="loading" class="animate-pulse mt-2">
          <div class="h-8 bg-gray-200 rounded-lg w-2/3"></div>
        </div>
        <span v-else class="text-2xl font-black text-emerald-500">
          ¥ <CountTo :value="todayIncome" />
        </span>
        
        <div class="absolute -right-2 -bottom-2 opacity-10 text-emerald-500 scale-150 rotate-12"><el-icon :size="60"><CircleCheckFilled /></el-icon></div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-gray-50 flex flex-col justify-between h-32 active:bg-gray-50 transition-all">
        <div class="h-5 flex justify-between items-center">
          <span class="text-gray-400 text-sm font-bold">每天固定成本</span>
        </div>
        
        <div v-if="loading" class="animate-pulse mt-auto">
           <div class="h-8 bg-gray-200 rounded-lg w-2/3"></div>
        </div>
        <div v-else>
          <span class="text-2xl font-black text-rose-500">
            ¥ <CountTo :value="dailyFixedCost" />
          </span>
        </div>
      </div>
    </div>

    <!-- 本月利润卡片 -->
    <div class="bg-[#8B5E3C] p-6 rounded-[2.5rem] shadow-xl text-white">
      <div v-if="loading" class="animate-pulse space-y-6">
         <div class="space-y-2">
           <div class="h-4 bg-white/20 rounded w-1/3"></div>
           <div class="h-10 bg-white/30 rounded-xl w-2/3"></div>
         </div>
         <div class="pt-4 border-t border-white/10 flex justify-between">
            <div class="h-8 bg-white/20 rounded w-1/3"></div>
            <div class="h-4 bg-white/10 rounded w-1/4"></div>
         </div>
      </div>
      
      <template v-else>
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg opacity-80 font-bold">本月利润预估</h3>
            <p class="text-4xl font-black mt-1">
              ¥ <CountTo :value="monthlyProfit" />
            </p>
          </div>
          <div class="text-right">
            <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full block mb-1">实账+预估</span>
            <span class="text-[10px] text-white/50 font-bold">杂费: ¥{{ formatNum(monthlyExtra) }}</span>
          </div>
        </div>
        <div class="pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <p class="text-[10px] opacity-70 font-bold">预计一年能赚</p>
            <p class="text-xl font-black">
              ¥ <CountTo :value="monthlyProfit * 12" />
            </p>
          </div>
          <div class="text-right"><p class="text-[10px] opacity-50 italic">* 基于平摊逻辑计算</p></div>
        </div>
      </template>
    </div>

    <!-- 巨大动作按钮 (ID: guide-actions) -->
    <div id="guide-actions" class="space-y-4">
      <button id="open-milk-btn" @click="openMilk" :class="hasTodayMilk ? 'bg-gray-400' : 'bg-[#F59E0B]'" class="w-full py-7 rounded-3xl font-black text-2xl shadow-lg text-white flex items-center justify-center gap-3 active:scale-95 transition-all">
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
    <SettingsModal ref="settingsRef" @saved="syncData" @showGuide="startTutorial" />
    <ImportMilkModal ref="importModalRef" @success="syncData" />
    <UserGuide ref="uiGuideRef" :steps="uiSteps" @finish="handleGuideFinish" />

    <!-- 喂草弹窗 -->
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
            <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-white rounded-xl border border-blue-200 h-12 overflow-hidden">
                <span class="text-[8px] text-blue-400">从哪天起</span><span class="text-xs font-black text-blue-700">{{ syncStartDate || '点此选日期' }}</span>
                <input type="date" v-model="syncStartDate" class="absolute inset-0 opacity-0 w-full h-full" />
            </div>
            <div class="text-blue-300">-</div>
            <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-white rounded-xl border border-blue-200 h-12 overflow-hidden">
                <span class="text-[8px] text-blue-400">到哪天止</span><span class="text-xs font-black text-blue-700">{{ syncEndDate || '点此选日期' }}</span>
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
import UserGuide from './UserGuide.vue'
import CountTo from './CountTo.vue' // 新增引入
import { formatNum } from '../utils/format' // 新增引入
import { useRoute, useRouter } from 'vue-router'

const addModalRef = ref(null)
const wizardRef = ref(null)
const settingsRef = ref(null)
const importModalRef = ref(null)
const uiGuideRef = ref(null)
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
const loading = ref(true) // 🔴 增加 loading 状态
const uiSteps = [
  { targetId: 'guide-profit', title: '1. 核心账本', content: '这里显示你扣除喂草费后，每天平均真正落袋的钱。' },
  { targetId: 'guide-settings', title: '2. 经营设置', content: '点这里可以打开设置弹窗，详细配置你的驼群数量、交奶价格以及每天的固定开支。', onEnter: () => { openSettings() } }, 
  { targetId: 'setting-camels', title: '2.1 驼群规模', content: '输入你家现在有多少峰骆驼，有多少峰正在产奶。' },
  { targetId: 'setting-milk', title: '2.2 交奶设置', content: '设置你平常几天交一次奶，一次大概多少公斤，多少钱一公斤。用于算预估收入。' },
  { targetId: 'setting-daily', title: '2.3 固定开支', content: '这里可以展开，把你每天雷打不动要花的钱（如雇人、草料费）一项项记进去。' },
  { targetId: 'open-milk-btn', title: '3. 每天交奶点这里', content: '重要！每天交完奶，点这个大灰色按钮（平常没交奶时是橙色的）。不要去点底部的那个小按钮！', onEnter: () => { settingsRef.value.visible = false } },
  { targetId: 'nav-import', title: '4. 只有批量导入才点它', content: '底部的这个按钮是用来一次性批量导入你的历史交奶记录的。平时记账不要用它。' },
  { targetId: 'nav-history', title: '5. 查旧账点这里', content: '想看上个月赚了多少？点这里进入历史账本。' }
]

const toNum = (val) => Number(val) || 0
// formatNum 已经从外部引入，删除本地定义

const dailyPotentialIncome = computed(() => settings.value ? (toNum(settings.value.milk_quantity_per_time) * toNum(settings.value.milk_price)) / toNum(settings.value.milk_frequency || 1) : 0)
const dailyFixedCost = computed(() => (settings.value?.daily_template || []).reduce((s, i) => s + (toNum(i.quantity) * toNum(i.unit_price)), 0))
const todayIncome = computed(() => { const today = new Date().toISOString().slice(0, 10); return income.value.filter(i => i.date === today && i.category === '驼奶销售').reduce((s, i) => s + toNum(i.amount), 0) })
const hasTodayMilk = computed(() => todayIncome.value > 0)
const todayMilkDuration = computed(() => { const today = new Date().toISOString().slice(0, 10); const record = income.value.find(i => i.date === today && i.category === '驼奶销售'); return record ? (toNum(record.duration) || 1) : 1 })
const todayExtraCost = computed(() => { const today = new Date().toISOString().slice(0, 10); return cost.value.filter(c => c.date === today && c.cost_type !== '日常支出' && c.cost_type !== '库存进货').reduce((s, i) => s + toNum(i.amount), 0) })
const todayProfit = computed(() => (hasTodayMilk.value ? (todayIncome.value / todayMilkDuration.value) : dailyPotentialIncome.value) - dailyFixedCost.value - todayExtraCost.value)
const monthlyProfit = computed(() => { if (!settings.value) return 0; const now = new Date(); const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); let totalActualIncome = 0; let totalDaysCovered = 0; income.value.forEach(i => { const d = new Date(i.date); if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && i.category === '驼奶销售') { totalActualIncome += toNum(i.amount); totalDaysCovered += Math.max(1, toNum(i.duration || 1)) } }); const remainingDays = Math.max(0, daysInMonth - totalDaysCovered); const totalProjectedIncome = totalActualIncome + (remainingDays * dailyPotentialIncome.value); const totalFixedCost = dailyFixedCost.value * daysInMonth; const totalExtraCost = cost.value.filter(c => { const d = new Date(c.date); return d.getMonth() === now.getMonth() && c.cost_type !== '日常支出' && c.cost_type !== '库存进货' }).reduce((s, v) => s + toNum(v.amount), 0); return totalProjectedIncome - totalFixedCost - totalExtraCost })
const monthlyExtra = computed(() => { const now = new Date(); return cost.value.filter(c => { const d = new Date(c.date); return d.getMonth() === now.getMonth() && c.cost_type !== '日常支出' && c.cost_type !== '库存进货' }).reduce((s, i) => s + toNum(i.amount), 0) })

const autoFillMissingCosts = async (userId, dailyTemplate) => {
  if (!dailyTemplate || dailyTemplate.length === 0) return false;
  const { data: lastCost } = await supabase.from('cost').select('date').eq('user_id', userId).eq('cost_type', '日常支出').order('date', { ascending: false }).limit(1)
  const todayStr = new Date().toISOString().slice(0, 10); let startDate = new Date()
  if (lastCost?.length > 0) { startDate = new Date(lastCost[0].date); startDate.setDate(startDate.getDate() + 1) } else { startDate = new Date(todayStr) }
  const today = new Date(todayStr); const batch = []
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10); dailyTemplate.forEach(item => { batch.push({ user_id: userId, date: dateStr, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price), quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出' }) })
  }
  if (batch.length > 0) { await supabase.from('cost').insert(batch); return true } return false
}

const syncData = async () => {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { loading.value = false; return } // 记得处理未登录情况
  const [incRes, costRes, setRes] = await Promise.all([
    supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
    supabase.from('cost').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ])
  if (setRes.data) {
    settings.value = setRes.data; templateCopy.value = JSON.parse(JSON.stringify(setRes.data.daily_template || []))
    await autoFillMissingCosts(user.id, setRes.data.daily_template)
  }
  if (incRes.data) income.value = incRes.data
  if (costRes.data) cost.value = costRes.data
  
  loading.value = false // 🔴 数据加载完毕
  
  if (localStorage.getItem('is_new_user') === 'true' && localStorage.getItem('guide_completed') !== 'true') {
    localStorage.removeItem('is_new_user')
    setTimeout(() => { uiGuideRef.value?.start() }, 1000)
  }
}

const saveTemplate = async () => {
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser(); const today = new Date().toISOString().slice(0, 10)
    await supabase.from('settings').update({ daily_template: templateCopy.value }).eq('user_id', user.id)
    if (syncStartDate.value && syncEndDate.value) {
      await supabase.from('cost').delete().eq('user_id', user.id).eq('cost_type', '日常支出').gte('date', syncStartDate.value).lte('date', syncEndDate.value)
      const batch = []; const start = new Date(syncStartDate.value); const end = new Date(syncEndDate.value)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { const dateStr = d.toISOString().slice(0, 10); templateCopy.value.forEach(item => { batch.push({ user_id: user.id, date: dateStr, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price), quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出' }) }) }
      if (batch.length > 0) await supabase.from('cost').insert(batch)
    } else {
      await supabase.from('cost').delete().eq('user_id', user.id).eq('date', today).eq('cost_type', '日常支出')
      const dailyRecords = templateCopy.value.map(item => ({ user_id: user.id, date: today, category: item.name, amount: toNum(item.quantity) * toNum(item.unit_price), quantity: toNum(item.quantity), unit_price: toNum(item.unit_price), cost_type: '日常支出' }))
      if (dailyRecords.length > 0) await supabase.from('cost').insert(dailyRecords)
    }
    ElMessage.success('保存成功'); showTemplate.value = false; syncData()
  } catch (e) { ElMessage.error('失败') } finally { saving.value = false }
}

const startTutorial = () => uiGuideRef.value?.start()
const handleGuideFinish = () => {
  localStorage.setItem('guide_completed', 'true')
}
const openMilk = () => { if (hasTodayMilk.value) { ElMessageBox.confirm('今天已记过，去历史改吗？', '今日已交').then(() => router.push('/history')) } else { addModalRef.value.openWithScene('卖奶') } }
const openFeed = () => addModalRef.value.openWithScene('买饲料')
const openExtra = () => addModalRef.value.openWithScene('其他')
const openSettings = () => settingsRef.value.open()

onMounted(async () => {
  await syncData()
  setTimeout(() => { wizardRef.value?.check() }, 1000)
})

watch(() => route.query.action, async (val) => {
  if (val === 'bulkImport') { 
    if (!importModalRef.value) await nextTick(); 
    importModalRef.value.open() 
    setTimeout(() => { router.replace({ path: '/', query: {} }) }, 500)
  }
}, { immediate: true })

defineExpose({ startTutorial })
</script>