<template>
  <div class="space-y-4 pb-24">
    <!-- 🔴 关键修复：把弹窗挪到最顶层，不要被 v-loading 所在的 div 包裹 -->
    <AddRecordModal ref="addModalRef" @success="fetchData" />
     <!-- 🔴 历史页面的指引组件 -->
    <UserGuide ref="historyGuideRef" :steps="historySteps" />

    <!-- 顶部导航与筛选 -->
    <div class="sticky top-0 bg-[#FDFBF7] z-30 py-2 space-y-3 shadow-sm px-1">
      <div class="flex items-center justify-between px-3">
        <h2 class="text-xl font-bold text-[#8B5E3C]">账务全书</h2>
        <el-tag type="info" size="small" round>共 {{ history.length }} 条</el-tag>
      </div>

      <!-- 分段切换器 -->
      <div class="px-2" id="history-tabs">
        <div class="bg-gray-100 p-1 rounded-xl flex items-center h-10">
          <button 
            v-for="tab in [{ label: '全部', value: 'all' }, { label: '收入', value: 'income' }, { label: '支出', value: 'cost' }, { label: '饲料', value: 'feed' }]" 
            :key="tab.value"
            @click="viewType = tab.value"
            class="flex-1 h-full rounded-lg text-xs font-bold transition-all duration-200"
            :class="viewType === tab.value ? 'bg-[#409EFF] text-white shadow-sm' : 'text-gray-500'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- 滚动日期选择 -->
      <div class="px-2" id="history-date">
        <div class="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-blue-50/50 rounded-xl border border-blue-100 h-12">
            <span class="text-[9px] text-blue-400 mb-0.5">开始日期</span>
            <span class="text-[11px] font-black text-blue-700">{{ formatDateCN(startDate) }}</span>
            <input type="date" v-model="startDate" @change="fetchData" class="absolute inset-0 opacity-0 w-full h-full" />
          </div>
          <div class="text-gray-300 font-bold">-</div>
          <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-blue-50/50 rounded-xl border border-blue-100 h-12">
            <span class="text-[9px] text-blue-400 mb-0.5">结束日期</span>
            <span class="text-[11px] font-black text-blue-700">{{ formatDateCN(endDate) }}</span>
            <input type="date" v-model="endDate" @change="fetchData" class="absolute inset-0 opacity-0 w-full h-full" />
          </div>
          <button @click="resetDate" class="p-2 text-gray-400">
             <el-icon :size="18"><RefreshRight /></el-icon>
          </button>
        </div>

        <div class="flex gap-2 overflow-x-auto py-2 no-scrollbar px-1">
          <button v-for="s in shortcuts" :key="s.text" @click="applyShortcut(s.value)" class="whitespace-nowrap px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] text-gray-500 active:bg-blue-600 active:text-white">
            {{ s.text }}
          </button>
        </div>
      </div>
    </div>

    <!-- 列表展示 -->
    <div id="history-summary" class="px-2 space-y-4 min-h-[40vh]">
      <!-- 骨架屏加载态 -->
      <div v-if="loading" class="animate-pulse space-y-4">
        <!-- 模拟汇总卡片 -->
        <div class="h-32 bg-gray-200 rounded-2xl w-full"></div>
        <!-- 模拟列表组 -->
        <div class="space-y-4">
           <div class="h-5 bg-gray-200 w-20 rounded"></div>
           <div class="bg-white p-5 rounded-3xl border border-gray-100 h-24"></div>
           <div class="bg-white p-5 rounded-3xl border border-gray-100 h-24"></div>
        </div>
      </div>

      <template v-else>
      <!-- 汇总卡片区 -->
      <div v-if="viewType === 'all'" class="bg-[#8B5E3C] p-6 rounded-[2.5rem] shadow-xl text-white mb-6 animate-in fade-in">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-sm opacity-80 font-bold mb-1">净利润</h3>
            <p class="text-4xl font-black">
              ¥ <CountTo :value="stats.totalIncome - stats.totalCost" />
            </p>
          </div>
          <div class="text-right">
             <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full block mb-1"> {{ startDate && endDate ? '选定区间' : '全部历史' }} </span>
          </div>
        </div>
        <div class="pt-4 border-t border-white/10 flex items-center justify-between">
          <div class="flex-1">
            <p class="text-[10px] opacity-70 font-bold mb-1">总收入</p>
            <p class="text-lg font-black text-emerald-300">
              + ¥ <CountTo :value="stats.totalIncome" />
            </p>
          </div>
          <div class="w-[1px] h-8 bg-white/10 mx-4"></div>
          <div class="flex-1 text-right">
            <p class="text-[10px] opacity-70 font-bold mb-1">总支出</p>
            <p class="text-lg font-black text-rose-300">
              - ¥ <CountTo :value="stats.totalCost" />
            </p>
          </div>
        </div>
      </div>

      <div v-if="viewType === 'income'" class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center animate-in fade-in">
        <div>
          <p class="text-xs text-emerald-600">总收入汇总</p>
          <p class="text-xl font-black text-emerald-700">
            ¥ <CountTo :value="stats.totalIncome" />
          </p>
        </div>
        <div class="text-right text-[10px] text-emerald-500 leading-relaxed">🥛 奶款: ¥{{ formatNum(stats.milkIncome) }}<br>🐫 骆驼: ¥{{ formatNum(stats.camelIncome) }}</div>
      </div>

      <div v-if="viewType === 'cost'" class="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center animate-in fade-in">
        <div>
          <p class="text-xs text-rose-600">总支出汇总 (不含进货)</p>
          <p class="text-xl font-black text-rose-700">
            ¥ <CountTo :value="stats.totalCost - stats.feedCost" />
          </p>
        </div>
        <div class="text-right text-[10px] text-rose-500 leading-relaxed">🍴 日常喂食: ¥{{ formatNum(stats.dailyCost) }}<br>🚜 杂项开支: ¥{{ formatNum(stats.extraCost) }}</div>
      </div>

      <div v-if="viewType === 'feed'" class="space-y-4 animate-in fade-in">
        <div id="feed-purchase-stat" class="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
          <div>
            <p class="text-xs text-orange-600">本期进货总支出</p>
            <p class="text-xl font-black text-orange-700">
              ¥ <CountTo :value="stats.feedCost" />
            </p>
          </div>
          <div class="text-right"><p class="text-[10px] text-orange-500 font-bold">{{ stats.feedWeight.toFixed(2) }} 吨</p></div>
        </div>
        <div id="feed-inventory-stat" class="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
          <div class="flex justify-between items-center mb-3 px-1">
            <h3 class="text-sm font-bold text-blue-800 flex items-center gap-1"><el-icon><Box /></el-icon> 自家存货估值</h3>
            <span class="text-xs font-black text-blue-600">
              总估值: ¥ <CountTo :value="totalInventoryValue" />
            </span>
          </div>
          <div class="space-y-2 px-1">
            <div v-for="item in inventoryList" :key="item.id" class="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-700 text-sm">{{ item.category }}</span>
                <div class="text-right"><span class="font-black text-gray-900 text-sm">≈ ¥{{ formatNum(item.quantity * item.unit_price) }}</span></div>
              </div>
              <div class="flex justify-between items-center text-[10px]">
                <div class="text-gray-400">当前库存: <span class="text-gray-600 font-bold">{{ Number(item.quantity).toFixed(2) }} 吨</span></div>
                <div v-if="getDaysLeft(item)" class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">预计用 {{ getDaysLeft(item) }} 天</div>
                <div v-else class="text-gray-300 italic">不在每日模板中</div>
              </div>
            </div>
          </div>
          <el-button type="primary" plain class="!w-full mt-4 !rounded-xl !h-12 font-bold" @click="openInventoryModal">
            盘点 / 录入自家库存
          </el-button>
        </div>
      </div>

      <!-- 列表数据 -->
      <div v-for="(group, month) in groupedHistory" :key="month" class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <span class="text-sm font-black text-gray-400">{{ month }}</span>
          <div class="h-[1px] flex-1 ml-4 bg-gray-100"></div>
        </div>
        <div v-for="item in group.items" :key="item.id || item.category" class="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden">
          <div class="p-5 flex items-center justify-between active:bg-gray-50" @click="toggleExpand(item)">
            <div class="flex items-center gap-4">
              <div :class="getItemStyle(item).bg" class="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm">{{ getItemStyle(item).emoji }}</div>
              <div>
                <p class="font-black text-gray-800 text-lg">{{ item.category }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-sm text-gray-400 font-bold">{{ item.isAggregated ? '本月累计' : item.date }}</span>
                  <span v-if="item.totalQuantity || item.quantity" class="text-xs text-[#409EFF] font-bold">&nbsp;(¥{{ formatNum(item.unit_price) }} × {{ item.totalQuantity || item.quantity }})</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p :class="item.isIncome ? 'text-emerald-500' : 'text-rose-500'" class="text-xl font-black">¥ {{ formatNum(item.amount) }}</p>
              <button v-if="!item.isAggregated" @click.stop="handleDelete(item)" class="text-xs text-rose-300 font-bold mt-1">删除</button>
              <span v-else class="text-xs text-blue-400 font-bold mt-1">查明细</span>
            </div>
          </div>
          <!-- 展开明细 -->
          <div v-if="isExpanded(item)" class="bg-gray-50 border-t border-dashed border-gray-200 px-5 py-3 space-y-3">
             <div v-for="child in item.children" :key="child.id" class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                <div class="font-bold text-gray-500">{{ child.date }}</div>
                <div class="text-xs text-gray-400">¥{{ formatNum(child.unit_price) }} × {{ child.quantity }}</div>
                <div class="font-black text-rose-400">¥{{ formatNum(child.amount) }}</div>
                <button @click="handleDelete(child)" class="ml-4 text-rose-300 font-bold">删除</button>
             </div>
          </div>
        </div>
      </div>
      <div v-if="history.length === 0" class="py-20 text-center text-gray-300 text-sm">此时间段暂无记录</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, nextTick } from 'vue' // 🔴 确保引入了 nextTick
import { supabase } from '../lib/supabase'
import { ElMessageBox, ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Box, RefreshRight, Calendar } from '@element-plus/icons-vue'
import { dataService } from '../api/dataService'
import AddRecordModal from './AddRecordModal.vue'
import UserGuide from './UserGuide.vue'
import CountTo from './CountTo.vue' // 新增引入
import { formatNum } from '../utils/format' // 新增引入

const historySteps = [
  { targetId: 'history-tabs', title: '分类查看', content: '你可以点这里，专门看卖奶赚的钱，或者专门看买草料花的钱。' },
  { targetId: 'history-date', title: '选日期', content: '想看去年的账？点这里选个日子，系统会自动帮你翻出来。' },
  { targetId: 'history-summary', title: '收支总账', content: '这里会算出你选的这段时间内，一共收入多少、花了多少、净赚多少。', onEnter: () => { viewType.value = 'all' } },
  { targetId: ['history-tabs', 'feed-purchase-stat'], title: '进货支出', content: '这是你买草料花掉的钱，还会帮你统计一共拉了多少吨回来。', onEnter: () => { viewType.value = 'feed' } },
  { targetId: 'feed-inventory-stat', title: '库存估值', content: '这里显示你家里还剩多少草料，大概值多少钱，以及它们还能喂多久。', onEnter: () => { viewType.value = 'feed' } }
]

const historyGuideRef = ref(null)
const loading = ref(false)
const history = ref([])
const inventoryList = ref([])
const settings = ref(null)
const viewType = ref('all')
const startDate = ref('')
const endDate = ref('')
const expandedKeys = reactive(new Set())
const addModalRef = ref(null)

// 🔴 增强的弹窗开启函数
const openInventoryModal = async () => {
  console.log("准备打开库存弹窗，当前 Ref:", addModalRef.value)
  if (addModalRef.value) {
    addModalRef.value.openWithScene('录入库存')
  } else {
    // 再次尝试
    await nextTick()
    if (addModalRef.value) {
       addModalRef.value.openWithScene('录入库存')
    } else {
       ElMessage.error('系统繁忙，请稍后再试')
    }
  }
}

// ... 保持 fetchData, stats, groupedHistory, applyShortcut 等逻辑完全不动 ...
const shortcuts = [
  { text: '全部历史', value: null },
  { text: '本月', value: () => { const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth(), 1); return [start, end] }},
  { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 30); return [start, end] }},
  { text: '本年', value: () => { const end = new Date(); const start = new Date(new Date().getFullYear(), 0, 1); return [start, end] }}
]

const applyShortcut = (valFn) => {
  if (!valFn) { startDate.value = ''; endDate.value = ''; } 
  else { const [s, e] = valFn(); startDate.value = s.toISOString().slice(0, 10); endDate.value = e.toISOString().slice(0, 10); }
  fetchData();
}
const resetDate = () => { startDate.value = ''; endDate.value = ''; fetchData(); }
const formatDateCN = (dateStr) => {
  if (!dateStr) return '请选择日期'
  const d = new Date(dateStr); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
const getDaysLeft = (inventoryItem) => {
  if (!settings.value?.daily_template) return null
  const templateItem = settings.value.daily_template.find(t => t.name === inventoryItem.category)
  if (!templateItem || Number(templateItem.quantity) <= 0) return null
  return Math.floor((Number(inventoryItem.quantity) * 1000) / Number(templateItem.quantity))
}
const fetchData = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    let incQuery = supabase.from('income').select('*').eq('user_id', user.id)
    let costQuery = supabase.from('cost').select('*').eq('user_id', user.id)
    if (startDate.value) { incQuery = incQuery.gte('date', startDate.value); costQuery = costQuery.gte('date', startDate.value); }
    if (endDate.value) { incQuery = incQuery.lte('date', endDate.value); costQuery = costQuery.lte('date', endDate.value); }
    const [incRes, costRes, invRes, setRes] = await Promise.all([
      incQuery.order('date', { ascending: false }),
      costQuery.order('date', { ascending: false }),
      dataService.getInventory(),
      supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
    ])
    history.value = [...(incRes.data || []).map(x => ({ ...x, isIncome: true })), ...(costRes.data || []).map(x => ({ ...x, isIncome: false }))].sort((a, b) => new Date(b.date) - new Date(a.date))
    inventoryList.value = invRes; settings.value = setRes.data;
  } finally { loading.value = false }
}
const stats = computed(() => {
  const s = { totalIncome: 0, milkIncome: 0, camelIncome: 0, totalCost: 0, feedCost: 0, dailyCost: 0, extraCost: 0, feedWeight: 0 }
  history.value.forEach(i => {
    if (i.isIncome) { s.totalIncome += i.amount; if (i.category.includes('奶')) s.milkIncome += i.amount; else if (i.category.includes('骆驼')) s.camelIncome += i.amount } 
    else { s.totalCost += i.amount; if (i.cost_type === '库存进货') { s.feedCost += i.amount; s.feedWeight += (Number(i.weight) || 0) } else if (i.cost_type === '日常支出') s.dailyCost += i.amount; else s.extraCost += i.amount }
  })
  return s
})
const totalInventoryValue = computed(() => inventoryList.value.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0))
const groupedHistory = computed(() => {
  const groups = {}
  let baseList = history.value
  if (viewType.value === 'income') baseList = history.value.filter(x => x.isIncome)
  else if (viewType.value === 'cost') baseList = history.value.filter(x => !x.isIncome && x.cost_type !== '库存进货')
  else if (viewType.value === 'feed') baseList = history.value.filter(x => x.cost_type === '库存进货')
  baseList.forEach(item => {
    const month = item.date.substring(0, 7)
    if (!groups[month]) groups[month] = { items: [], income: 0, cost: 0, _rawItems: [] }
    if (item.isIncome) groups[month].income += item.amount; else groups[month].cost += item.amount
    groups[month]._rawItems.push(item)
  })
  Object.keys(groups).forEach(month => {
    if (viewType.value === 'cost') {
      const aggMap = {}
      groups[month]._rawItems.forEach(item => {
        const key = item.category
        if (!aggMap[key]) aggMap[key] = { category: key, amount: 0, totalQuantity: 0, isIncome: false, cost_type: item.cost_type, isAggregated: true, unit_price: item.unit_price, children: [] }
        aggMap[key].amount += item.amount; aggMap[key].totalQuantity += (Number(item.quantity) || 0); aggMap[key].children.push(item)
      })
      groups[month].items = Object.values(aggMap).sort((a,b) => b.amount - a.amount)
    } else { groups[month].items = groups[month]._rawItems }
  })
  return groups
})
const toggleExpand = (item) => { if (!item.isAggregated) return; const key = item.category + item.amount; if (expandedKeys.has(key)) expandedKeys.delete(key); else expandedKeys.add(key) }
const isExpanded = (item) => item.isAggregated && expandedKeys.has(item.category + item.amount)
const getItemStyle = (i) => { if (i.isIncome) return i.category.includes('骆驼') ? { bg: 'bg-emerald-100 text-emerald-600', emoji: '🐫' } : { bg: 'bg-emerald-50 text-emerald-500', emoji: '🥛' }; if (i.cost_type === '库存进货') return { bg: 'bg-orange-50 text-orange-500', emoji: '🌾' }; return (i.cost_type === '日常支出' || i.isAggregated) ? { bg: 'bg-blue-50 text-blue-400', emoji: '🍴' } : { bg: 'bg-gray-50 text-gray-500', emoji: '🚜' } }
// formatNum 已经从外部引入，删除本地定义

const handleDelete = (item) => { ElMessageBox.confirm('确定删除吗？', '提示').then(async () => { await dataService.deleteRecord(item.isIncome ? 'income' : 'cost', item.id); ElMessage.success('已删除'); fetchData(); }) }
onMounted(async () => {
  await fetchData()
  // 🔴 检查是否需要显示历史指引（如果用户是第一次进历史页）
  if (localStorage.getItem('is_first_history') !== 'false') {
    setTimeout(() => {
      historyGuideRef.value?.start()
      localStorage.setItem('is_first_history', 'false')
    }, 1000)
  }
})
const startHistoryGuide = () => historyGuideRef.value?.start()
defineExpose({ startHistoryGuide })
</script>

<style scoped>
input[type="date"]::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: auto; height: auto; color: transparent; background: transparent; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.font-black { font-family: system-ui, -apple-system, sans-serif; }
</style>