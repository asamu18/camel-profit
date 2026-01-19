<template>
  <div class="p-4 max-w-lg mx-auto min-h-screen pb-20 bg-gray-50">
    
    <!-- 1. 顶部：工具栏 -->
    <div class="flex justify-between items-center mb-4 pt-2">
      <el-button type="danger" link size="small" @click="handleDebugReset">
        <el-icon class="mr-1"><RefreshRight /></el-icon>重置系统(测试)
      </el-button>
      <div class="flex gap-2">
         <el-button type="success" plain size="small" round @click="openFeedStats">
          <el-icon class="mr-1"><Search /></el-icon>查饲料
        </el-button>
        <el-button type="info" plain size="small" circle @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 2. 核心业务卡片：今日交奶 (简化版) -->
    <div class="bg-blue-600 rounded-2xl p-5 shadow-lg text-white mb-6 relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute -right-6 -top-6 w-24 h-24 bg-blue-500 rounded-full opacity-30 pointer-events-none"></div>
      
      <div class="flex justify-between items-center mb-4 relative z-10">
        <div class="font-bold flex items-center gap-2">
          <span class="text-2xl">🥛</span> 
          <span class="text-lg">今日交奶</span>
        </div>
        <!-- 显示上次记录时间，但不让改间隔了 -->
        <div class="text-xs opacity-80 bg-blue-700 px-2 py-1 rounded">
           上一次: {{ herdSize.milk_frequency }}天前
        </div>
      </div>

      <!-- 参数输入行 (只填重量和单价) -->
      <div class="flex gap-4 mb-5 relative z-10">
        <div class="flex-1">
           <div class="text-xs text-blue-100 mb-1 opacity-80">交奶量 (公斤)</div>
           <el-input-number 
             v-model="herdSize.milk_quantity_per_time" 
             :min="0" 
             size="large" 
             style="width: 100%" 
             :controls="false" 
             class="!text-lg font-bold"
           />
        </div>
        <div class="flex-1">
           <div class="text-xs text-blue-100 mb-1 opacity-80">单价 (元)</div>
           <el-input-number 
             v-model="herdSize.milk_price" 
             :min="0" 
             size="large" 
             style="width: 100%" 
             :controls="false"
             class="!text-lg font-bold" 
           />
        </div>
      </div>

      <!-- 底部计算与按钮 -->
      <div class="flex justify-between items-center border-t border-blue-500/50 pt-4 relative z-10">
        <div>
          <span class="text-xs text-blue-200">本次收入</span>
          <div class="font-bold text-2xl">¥ {{ (herdSize.milk_quantity_per_time * herdSize.milk_price).toFixed(0) }}</div>
        </div>
        <el-button type="warning" size="large" class="!font-bold !px-8 !border-none !shadow-lg" @click="saveMilkIncome" :loading="milkLoading">
          确认入账
        </el-button>
      </div>
    </div>

    <!-- 3. 效益预估看板 (重点展示月/年利润) -->
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
       <div class="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
         <div class="text-gray-800 font-bold flex items-center gap-1">
           <el-icon class="text-orange-500"><DataAnalysis /></el-icon> 效益预估
         </div>
         <el-tag size="small" type="info" effect="plain" class="scale-90">基于当前规模与模板</el-tag>
       </div>
       
       <!-- 月利润 & 年利润 -->
       <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
            <div class="text-xs text-gray-500 mb-1">预估月利润</div>
            <div class="text-2xl font-bold text-green-700">¥ {{ projected.monthProfit }}</div>
          </div>
          <div class="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
            <div class="text-xs text-gray-500 mb-1">预估年利润</div>
            <div class="text-2xl font-bold text-orange-700">¥ {{ projected.yearProfit }}</div>
          </div>
       </div>
       
       <!-- 底部详情 -->
       <div class="flex justify-between text-xs text-gray-400 px-1">
          <span>日均产值: ¥{{ projected.dayIncome }}</span>
          <span>日均成本: ¥{{ projected.dayCost }}</span>
       </div>
    </div>

    <!-- 4. 今日额外账单 -->
    <div v-if="extraCosts.length > 0" class="mb-6 animate-fade-in">
      <div class="flex justify-between items-center mb-2 px-1">
        <h3 class="font-bold text-gray-800 text-lg flex items-center">
          <span class="text-xl mr-1">⚡</span> 今日新增账单
        </h3>
        <span class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-bold">
          共 ¥{{ extraCostTotal }}
        </span>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
         <div v-for="item in extraCosts" :key="item.id" class="p-3 border-b border-gray-50 last:border-0 flex justify-between items-center cursor-pointer hover:bg-gray-50" @click="editRecord(item)">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 text-xs font-bold">
                {{ item.category.slice(0,1) }}
              </div>
              <div>
                <div class="font-bold text-gray-700 text-sm">
                  {{ item.category }}
                  <span v-if="item.cost_type === '库存进货'" class="text-[10px] bg-green-100 text-green-700 px-1 rounded ml-1">库存</span>
                </div>
                <div class="text-xs text-gray-400" v-if="item.weight > 0">{{ item.weight }}吨 | 可用{{ item.duration }}天</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-gray-800">¥ {{ formatNumber(item.amount) }}</div>
            </div>
         </div>
      </div>
    </div>

    <!-- 5. 每日支出 (标准) -->
    <div class="flex justify-between items-center mb-3 px-1">
      <h3 class="font-bold text-gray-800 text-lg">每日支出 (标准)</h3>
      <div class="text-xs text-gray-400">
        <span class="text-gray-600 font-bold">¥ {{ templateTotalCost }}</span> /天
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div class="grid grid-cols-4 bg-gray-50 p-3 text-xs text-gray-500 font-medium">
        <div class="col-span-2">项目 (点击修改)</div>
        <div class="text-center">数量</div>
        <div class="text-right">金额</div>
      </div>

      <div class="divide-y divide-gray-50">
        <div 
          v-for="(item, idx) in mergedDailyList" 
          :key="idx" 
          @click="editRecord(item)"
          class="grid grid-cols-4 p-3 items-center text-sm cursor-pointer hover:bg-orange-50 transition-colors"
        >
          <div class="col-span-2 font-bold flex items-center relative">
            <div 
              class="w-2 h-2 rounded-full mr-2"
              :class="item.isReal ? 'bg-green-500' : 'bg-gray-300'"
            ></div>
            <span :class="item.isReal ? 'text-gray-900' : 'text-gray-500'">
              {{ item.category }}
            </span>
          </div>
          
          <div class="text-center" :class="item.isReal ? 'text-gray-600' : 'text-gray-400'">
             <span v-if="item.quantity">x{{ item.quantity }}</span>
             <span v-else>-</span>
          </div>
          
          <div class="text-right font-bold" :class="item.isReal ? 'text-gray-900' : 'text-gray-400'">
            ¥ {{ formatNumber(item.amount) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 6. 快捷入口 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <button @click="openModal('买饲料')" class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-transform h-24 group hover:border-green-200 relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-bl-lg">库存</div>
        <div class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">🌿</div>
        <span class="font-bold text-gray-700 text-sm">进大车饲料</span>
      </button>

      <button @click="openModal('骆驼交易')" class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-transform h-24 group hover:border-orange-200">
        <div class="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">🐪</div>
        <span class="font-bold text-gray-700 text-sm">骆驼买卖</span>
      </button>

      <button @click="openModal('其他')" class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-transform h-24 group hover:border-purple-200 col-span-2">
        <div class="flex items-center justify-center gap-2">
           <div class="text-xl">📝</div>
           <span class="font-bold text-gray-700 text-sm">记一笔 (额外零花)</span>
        </div>
      </button>
    </div>

    <!-- 组件 -->
    <SetupWizard ref="wizardRef" @finish="initData" />
    <AddRecordModal ref="addModalRef" @success="refreshAll" />
    <FeedStatModal ref="feedStatRef" />
    <EditRecordModal ref="editRecordRef" @refresh="refreshAll" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { RefreshRight, Search, SwitchButton, DataAnalysis } from '@element-plus/icons-vue'
import { supabase } from '../lib/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dataService } from '../api/dataService'

import SetupWizard from './SetupWizard.vue'
import AddRecordModal from './AddRecordModal.vue'
import FeedStatModal from './FeedStatModal.vue'
import EditRecordModal from './EditRecordModal.vue'

const wizardRef = ref(null)
const addModalRef = ref(null)
const feedStatRef = ref(null)
const editRecordRef = ref(null)

const herdSize = reactive({ 
  total: 0, milking: 0, 
  milk_frequency: 1, milk_quantity_per_time: 0, milk_price: 0 
})
const dailyTemplate = ref([]) 
const rawTodayCosts = ref([]) 
const milkLoading = ref(false)

// --- 数据计算逻辑 ---

// 1. 每日支出模板总额
const templateTotalCost = computed(() => {
  return dailyTemplate.value.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(0)
})

// 2. 预估效益计算 (基于模板，非今日实账)
// 公式：(日均收入 - 日均支出) * 30 or 365
const projected = computed(() => {
  // 日均收入 = (每次量 / 间隔天数) * 单价
  const freq = herdSize.milk_frequency || 1
  const dailyIncome = (herdSize.milk_quantity_per_time / freq) * herdSize.milk_price
  
  // 日均支出 = 模板总额 (不含额外大额支出)
  const dailyCost = Number(templateTotalCost.value)
  
  const dailyProfit = dailyIncome - dailyCost
  
  return {
    dayIncome: formatNumber(dailyIncome),
    dayCost: formatNumber(dailyCost),
    monthProfit: formatNumber(dailyProfit * 30),
    yearProfit: formatNumber(dailyProfit * 365)
  }
})

// 3. 混合列表与额外账单逻辑 (保持不变)
const mergedDailyList = computed(() => {
  const list = []
  dailyTemplate.value.forEach(tpl => {
    const realItem = rawTodayCosts.value.find(r => r.category === tpl.name && r.cost_type === '日常支出')
    if (realItem) {
      list.push({ ...realItem, isReal: true })
    } else {
      list.push({
        category: tpl.name,
        quantity: tpl.quantity,
        unit_price: tpl.unit_price,
        amount: tpl.quantity * tpl.unit_price,
        weight: tpl.name.includes('草') || tpl.name.includes('料') ? (tpl.quantity * 0.001) : 0,
        isReal: false,
        cost_type: '日常支出'
      })
    }
  })
  return list.sort((a, b) => b.amount - a.amount)
})

const extraCosts = computed(() => {
  return rawTodayCosts.value.filter(item => {
    if (['库存进货', '固定成本', '其他'].includes(item.cost_type)) return true
    const isInTemplate = dailyTemplate.value.some(tpl => tpl.name === item.category)
    return !isInTemplate
  })
})
const extraCostTotal = computed(() => extraCosts.value.reduce((s, i) => s + Number(i.amount), 0).toFixed(0))


// --- 交互方法 ---

const formatNumber = (n) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 })

// 保存奶款 (入账 + 更新默认值，但不改频率，因为频率是初始预设的，日常不用填)
const saveMilkIncome = async () => {
  milkLoading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    const amount = herdSize.milk_quantity_per_time * herdSize.milk_price

    // 1. 记账
    await dataService.addIncome({
      date: today,
      category: '驼奶销售',
      quantity: herdSize.milk_quantity_per_time,
      unit_price: herdSize.milk_price,
      amount: amount
    })

    // 2. 更新设置 (只更新 量 和 价，保留 频率 不变)
    // 这样下次进来，量和价是这次填的，方便微调
    await supabase.from('settings').update({
      milk_quantity_per_time: herdSize.milk_quantity_per_time,
      milk_price: herdSize.milk_price
    }).eq('user_id', user.id)

    ElMessage.success(`已入账 ¥${amount}`)
    refreshAll()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    milkLoading.value = false
  }
}

const editRecord = (item) => {
  editRecordRef.value.open(item)
}

const handleDebugReset = () => {
  ElMessageBox.confirm('这将清空所有账单（保留设置模板），重新开始记账。', '危险操作', {
    confirmButtonText: '确定重置',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('income').delete().eq('user_id', user.id)
    await supabase.from('cost').delete().eq('user_id', user.id)
    await supabase.from('settings').delete().eq('user_id', user.id)
    window.location.reload()
  })
}

// 数据加载
const initData = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: settings } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  
  if (settings) {
    herdSize.total = settings.total_camels
    herdSize.milking = settings.milking_camels
    herdSize.milk_frequency = settings.milk_frequency || 1
    herdSize.milk_quantity_per_time = settings.milk_quantity_per_time || 0
    herdSize.milk_price = settings.milk_price || 0
    dailyTemplate.value = settings.daily_template || []
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: costs } = await supabase.from('cost').select('*').eq('date', today)
  rawTodayCosts.value = costs || []
}

const refreshAll = () => initData()
const openModal = (s) => addModalRef.value.openWithScene(s)
const openFeedStats = () => feedStatRef.value.open()
const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload() }

onMounted(() => {
  setTimeout(() => { if (wizardRef.value) wizardRef.value.check() }, 500)
  initData()
})
</script>

<style>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>