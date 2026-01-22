<template>
  <div class="space-y-4 pb-24">
    <!-- 顶部导航与筛选 -->
    <div class="sticky top-0 bg-[#FDFBF7] z-30 py-2 space-y-3 shadow-sm px-1">
      <div class="flex items-center justify-between px-3">
        <h2 class="text-xl font-bold text-[#8B5E3C]">账务全书</h2>
        <el-tag type="info" size="small" round>共 {{ history.length }} 条</el-tag>
      </div>

      <!-- 分段切换器 -->
      <div class="px-2">
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

      <!-- 滚动日期选择区 -->
      <div class="px-2">
        <div class="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-blue-50/50 rounded-xl border border-blue-100">
            <span class="text-[9px] text-blue-400 mb-0.5">开始日期</span>
            <span class="text-[13px] font-black text-blue-700">{{ formatDateCN(startDate) }}</span>
            <input type="date" v-model="startDate" @change="fetchData" class="absolute inset-0 opacity-0 w-full h-full" />
          </div>
          <div class="text-gray-300 font-bold">-</div>
          <div class="flex-1 relative flex flex-col items-center justify-center p-1 bg-blue-50/50 rounded-xl border border-blue-100">
            <span class="text-[9px] text-blue-400 mb-0.5">结束日期</span>
            <span class="text-[13px] font-black text-blue-700">{{ formatDateCN(endDate) }}</span>
            <input type="date" v-model="endDate" @change="fetchData" class="absolute inset-0 opacity-0 w-full h-full" />
          </div>
          <button @click="resetDate" class="p-2 text-gray-400 active:text-blue-500">
             <el-icon :size="18"><RefreshRight /></el-icon>
          </button>
        </div>

        <!-- 快捷选项：已增加“本月” -->
        <div class="flex gap-2 overflow-x-auto py-2 no-scrollbar px-1">
          <button 
            v-for="s in shortcuts" :key="s.text"
            @click="applyShortcut(s.value)"
            class="whitespace-nowrap px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] text-gray-500 active:bg-blue-600 active:text-white"
          >
            {{ s.text }}
          </button>
        </div>
      </div>
    </div>

    <!-- 汇总统计卡片区 -->
    <div class="px-2 space-y-4">
      <!-- 全部视图汇总 -->
      <div v-if="viewType === 'all'" class="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in">
        <div class="flex justify-between items-center mb-4 px-1">
          <span class="text-xs font-bold text-gray-600">本段历史概览</span>
          <span class="text-[10px] text-gray-300 italic">按筛选范围计算</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="text-center">
            <p class="text-[10px] text-gray-400 mb-1">总收入</p>
            <p class="text-sm font-bold text-emerald-500">¥ {{ formatNum(stats.totalIncome) }}</p>
          </div>
          <div class="text-center border-x border-gray-50">
            <p class="text-[10px] text-gray-400 mb-1">总支出</p>
            <p class="text-sm font-bold text-rose-500">¥ {{ formatNum(stats.totalCost) }}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] text-gray-400 mb-1">净利润</p>
            <p class="text-sm font-bold" :class="(stats.totalIncome - stats.totalCost) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
              ¥ {{ formatNum(stats.totalIncome - stats.totalCost) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 收入汇总 -->
      <div v-if="viewType === 'income'" class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center animate-in fade-in">
        <div><p class="text-xs text-emerald-600">总收入汇总</p><p class="text-xl font-black text-emerald-700">¥ {{ formatNum(stats.totalIncome) }}</p></div>
        <div class="text-right text-[10px] text-emerald-500 leading-relaxed">🥛 奶款: ¥{{ formatNum(stats.milkIncome) }}<br>🐫 骆驼: ¥{{ formatNum(stats.camelIncome) }}</div>
      </div>

      <!-- 支出汇总 -->
      <div v-if="viewType === 'cost'" class="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center animate-in fade-in">
        <div><p class="text-xs text-rose-600">总支出汇总 (不含进货)</p><p class="text-xl font-black text-rose-700">¥ {{ formatNum(stats.totalCost - stats.feedCost) }}</p></div>
        <div class="text-right text-[10px] text-rose-500 leading-relaxed">🍴 日常喂食: ¥{{ formatNum(stats.dailyCost) }}<br>🚜 杂项开支: ¥{{ formatNum(stats.extraCost) }}</div>
      </div>

      <!-- 饲料专项 -->
      <div v-if="viewType === 'feed'" class="space-y-4 animate-in fade-in">
        <div class="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
          <div><p class="text-xs text-orange-600">本期进货总支出</p><p class="text-xl font-black text-orange-700">¥ {{ formatNum(stats.feedCost) }}</p></div>
          <div class="text-right"><p class="text-[10px] text-orange-500 font-bold">{{ stats.feedWeight.toFixed(2) }} 吨</p></div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-bold text-blue-800 flex items-center gap-1"><el-icon><Box /></el-icon> 自家存货估值</h3>
            <span class="text-xs font-black text-blue-600">总估值: ¥ {{ formatNum(totalInventoryValue) }}</span>
          </div>
          <div class="space-y-2">
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
          <el-button size="small" class="w-full mt-3 border-dashed" @click="openInventoryModal">盘点/录入自家库存</el-button>
        </div>
      </div>
    </div>

    <!-- 列表展示 -->
    <div v-loading="loading" class="space-y-6 px-2">
      <div v-for="(group, month) in groupedHistory" :key="month">
        <!-- 🔴 简化后的月份分割线：删除了重复的统计数字 -->
        <div class="flex items-center justify-between px-2 mb-3">
          <span class="text-sm font-black text-gray-400">{{ month }}</span>
          <div class="h-[1px] flex-1 ml-4 bg-gray-100"></div>
        </div>

        <div class="space-y-3">
          <div v-for="item in group.items" :key="item.id || item.category" class="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden transition-all">
            <div class="p-4 flex items-center justify-between active:bg-gray-50" @click="toggleExpand(item)">
              <div class="flex items-center gap-3">
                <div :class="getItemStyle(item).bg" class="w-10 h-10 rounded-full flex items-center justify-center text-lg">{{ getItemStyle(item).emoji }}</div>
                <div>
                  <p class="font-bold text-gray-800 text-sm">
                    {{ item.category }}
                    <el-icon v-if="item.isAggregated" class="ml-1 text-[10px] text-gray-400">
                      <ArrowDown v-if="!isExpanded(item)" /><ArrowUp v-else />
                    </el-icon>
                  </p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span class="text-[10px] text-gray-400">{{ item.isAggregated ? '本月累计' : item.date }}</span>
                    <span v-if="item.totalQuantity || item.quantity" class="text-[10px] text-[#409EFF] flex items-center">&nbsp;(¥{{ formatNum(item.unit_price) || '-' }} × {{ item.totalQuantity || item.quantity }})</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <p :class="item.isIncome ? 'text-emerald-500' : 'text-rose-500'" class="font-black">¥ {{ formatNum(item.amount) }}</p>
                <button v-if="!item.isAggregated" @click.stop="handleDelete(item)" class="text-[10px] text-gray-300">删除</button>
                <span v-else class="text-[10px] text-blue-400">明细</span>
              </div>
            </div>
            <div v-if="isExpanded(item)" class="bg-gray-50 border-t border-dashed border-gray-200 px-4 py-2 space-y-2">
              <div v-for="child in item.children" :key="child.id" class="flex justify-between items-center py-2 text-xs border-b border-gray-100 last:border-0">
                <div class="text-gray-500">{{ child.date }}</div>
                <div class="flex-1 px-4 text-gray-400 text-[10px]">数量: {{ child.quantity }} | 单价: ¥{{ formatNum(child.unit_price) }}</div>
                <div class="font-bold text-rose-400">¥{{ formatNum(child.amount) }}</div>
                <button @click="handleDelete(child)" class="ml-3 text-rose-300">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AddRecordModal ref="addModalRef" @success="fetchData" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessageBox, ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Box, RefreshRight, Calendar } from '@element-plus/icons-vue'
import { dataService } from '../api/dataService'
import AddRecordModal from './AddRecordModal.vue'

const loading = ref(false)
const history = ref([])
const inventoryList = ref([])
const settings = ref(null)
const viewType = ref('all')
const startDate = ref('')
const endDate = ref('')
const expandedKeys = reactive(new Set())
const addModalRef = ref(null)

// 🔴 优化后的快捷选项：增加了“本月”
const shortcuts = [
  { text: '全部历史', value: null },
  { text: '本月', value: () => { 
    const end = new Date(); 
    const start = new Date(end.getFullYear(), end.getMonth(), 1); 
    return [start, end] 
  }},
  { text: '最近30天', value: () => { 
    const end = new Date(); 
    const start = new Date(); 
    start.setDate(start.getDate() - 30); 
    return [start, end] 
  }},
  { text: '本年', value: () => { 
    const end = new Date(); 
    const start = new Date(new Date().getFullYear(), 0, 1); 
    return [start, end] 
  }}
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
    if (i.isIncome) {
      s.totalIncome += i.amount
      if (i.category.includes('奶')) s.milkIncome += i.amount
      else if (i.category.includes('骆驼')) s.camelIncome += i.amount
    } else {
      s.totalCost += i.amount
      if (i.cost_type === '库存进货') { s.feedCost += i.amount; s.feedWeight += (Number(i.weight) || 0) }
      else if (i.cost_type === '日常支出') s.dailyCost += i.amount
      else s.extraCost += i.amount
    }
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
        if (!aggMap[key]) {
          aggMap[key] = { category: key, amount: 0, totalQuantity: 0, isIncome: false, cost_type: item.cost_type, isAggregated: true, unit_price: item.unit_price, children: [] }
        }
        aggMap[key].amount += item.amount; aggMap[key].totalQuantity += (Number(item.quantity) || 0); aggMap[key].children.push(item)
      })
      groups[month].items = Object.values(aggMap).sort((a,b) => b.amount - a.amount)
    } else { groups[month].items = groups[month]._rawItems }
  })
  return groups
})

const toggleExpand = (item) => {
  if (!item.isAggregated) return
  const key = item.category + item.amount
  if (expandedKeys.has(key)) expandedKeys.delete(key); else expandedKeys.add(key)
}
const isExpanded = (item) => item.isAggregated && expandedKeys.has(item.category + item.amount)

const getItemStyle = (i) => {
  if (i.isIncome) return i.category.includes('骆驼') ? { bg: 'bg-emerald-100 text-emerald-600', emoji: '🐫' } : { bg: 'bg-emerald-50 text-emerald-500', emoji: '🥛' }
  if (i.cost_type === '库存进货') return { bg: 'bg-orange-50 text-orange-500', emoji: '🌾' }
  return (i.cost_type === '日常支出' || i.isAggregated) ? { bg: 'bg-blue-50 text-blue-400', emoji: '🍴' } : { bg: 'bg-gray-50 text-gray-500', emoji: '🚜' }
}

const formatNum = (n) => {
    const rounded = Math.round(n);
    const absN = Math.abs(rounded);
    return (rounded < 0 ? '-' : '') + absN.toLocaleString('en-US');
}

const handleDelete = (item) => {
  ElMessageBox.confirm('确定删除吗？', '提示').then(async () => {
    await dataService.deleteRecord(item.isIncome ? 'income' : 'cost', item.id)
    ElMessage.success('已删除'); fetchData();
  })
}
const openInventoryModal = () => addModalRef.value.openWithScene('录入库存')
onMounted(fetchData)
</script>

<style scoped>
input[type="date"]::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: auto; height: auto; color: transparent; background: transparent; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.font-black { font-family: system-ui, -apple-system, sans-serif; }
</style>