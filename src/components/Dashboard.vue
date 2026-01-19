<template>
  <div class="p-6 max-w-7xl mx-auto min-h-screen">
    
    <!-- 顶部栏 -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
  <!-- 左侧标题：手机端居中，电脑端居左 -->
  <div class="flex items-center w-full md:w-auto justify-center md:justify-start">
    <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 flex-shrink-0">驼</div>
    <div>
      <h1 class="text-xl font-bold text-gray-800 whitespace-nowrap">驼场利润系统</h1>
      <p class="text-xs text-gray-500 text-left">数据月份：{{ currentMonth }}</p>
    </div>
  </div>

  <!-- 右侧操作栏：手机端允许换行 (flex-wrap)，并居中 -->
  <div class="flex flex-wrap justify-center md:justify-end gap-2 w-full md:w-auto">
    <!-- 日期选择器：手机端设为稍微宽一点 -->
    <el-date-picker 
      v-model="currentMonth" type="month" value-format="YYYY-MM" :clearable="false"
      @change="refreshAll" placeholder="月份" 
      style="width: 130px;" 
      class="mb-2 sm:mb-0"
    />
    
    <!-- 按钮组 -->
    <el-button type="success" plain @click="handleExport" class="!ml-0">
      <el-icon class="mr-1"><Download /></el-icon> 导出
    </el-button>
    
    <el-button type="primary" @click="handleAdd" class="!ml-0">
      <el-icon class="mr-1"><Plus /></el-icon> 新增
    </el-button>
    
    <el-button type="info" text @click="handleLogout" class="!ml-0">
      退出
    </el-button>
  </div>
</div>

    <!-- 指标卡 (保持不变) -->
    <el-row :gutter="20" class="mb-6">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="border-l-4 border-green-500">
          <template #header><span class="text-gray-500 text-sm">本月总收入</span></template>
          <div class="text-3xl font-bold text-gray-800">¥ {{ formatNumber(stats.income) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="border-l-4 border-gray-400">
          <template #header><span class="text-gray-500 text-sm">固定成本</span></template>
          <div class="text-3xl font-bold text-gray-800">¥ {{ formatNumber(stats.fixedCost) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="border-l-4 border-orange-400">
          <template #header><span class="text-gray-500 text-sm">变动成本</span></template>
          <div class="text-3xl font-bold text-gray-800">¥ {{ formatNumber(stats.variableCost) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="bg-gray-800 text-white border-none">
          <template #header><span class="text-gray-300 text-sm">本月净利润</span></template>
          <div class="text-4xl font-bold" :class="stats.profit >= 0 ? 'text-green-400' : 'text-red-400'">
            ¥ {{ formatNumber(stats.profit) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- NEW: 每日收支趋势图 -->
    <el-row class="mb-6">
      <el-col :span="24">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-700 mb-4 border-l-4 border-purple-500 pl-2">本月每日收支详情</h3>
          <div id="dailyChart" style="height: 300px; width: 100%;"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 原有图表区 -->
    <el-row :gutter="20" class="mb-6">
      <el-col :xs="24" :md="12" class="mb-6 md:mb-0">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-700 mb-4 border-l-4 border-orange-500 pl-2">本月成本结构</h3>
          <div id="pieChart" style="height: 350px; width: 100%;"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-2">近半年利润趋势</h3>
          <div id="barChart" style="height: 350px; width: 100%;"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 明细报表区 (支持行内编辑) -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 收入表格 -->
        <el-tab-pane label="收入明细" name="income">
          <el-table :data="rawIncome" stripe style="width: 100%" height="400">
            <el-table-column prop="date" label="日期" width="120" sortable />
            
            <el-table-column label="品类" width="160">
              <template #default="{ row }">
                <el-input v-if="isEditing(row.id)" v-model="editForm.category" size="small" />
                <el-tag v-else effect="light">{{ row.category }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <el-input-number v-if="isEditing(row.id)" v-model="editForm.quantity" size="small" :min="1" :controls="false" style="width:80px" />
                <span v-else>{{ row.quantity }}</span>
              </template>
            </el-table-column>

            <el-table-column label="单价" width="100">
               <template #default="{ row }">
                <el-input-number v-if="isEditing(row.id)" v-model="editForm.unit_price" size="small" :min="0" :controls="false" style="width:80px" />
                <span v-else>{{ row.unit_price }}</span>
              </template>
            </el-table-column>

            <el-table-column label="总金额" sortable>
              <template #default="{ row }">
                <!-- 编辑时自动计算显示，不让直接改总金额 -->
                <span v-if="isEditing(row.id)" class="text-gray-400">¥ {{ (editForm.quantity * editForm.unit_price).toFixed(2) }}</span>
                <span v-else class="font-bold text-green-600">+ ¥{{ formatNumber(row.amount) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <div v-if="isEditing(row.id)">
                  <el-button type="success" size="small" link @click="saveEdit('income', row.id)">保存</el-button>
                  <el-button type="info" size="small" link @click="cancelEdit">取消</el-button>
                </div>
                <div v-else>
                  <el-button type="primary" size="small" link @click="startEdit(row)">修改</el-button>
                  <el-button type="danger" size="small" link @click="handleDelete(row, 'income')">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <!-- 成本表格 -->
        <el-tab-pane label="成本明细" name="cost">
          <el-table :data="rawCost" stripe style="width: 100%" height="400">
            <el-table-column prop="date" label="日期" width="120" sortable />
            
            <el-table-column label="项目" width="160">
              <template #default="{ row }">
                <el-input v-if="isEditing(row.id)" v-model="editForm.category" size="small" />
                <span v-else>{{ row.category }}</span>
              </template>
            </el-table-column>

             <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <el-input-number v-if="isEditing(row.id)" v-model="editForm.quantity" size="small" :min="1" :controls="false" style="width:80px" />
                <span v-else>{{ row.quantity || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="单价" width="100">
               <template #default="{ row }">
                <el-input-number v-if="isEditing(row.id)" v-model="editForm.unit_price" size="small" :min="0" :controls="false" style="width:80px" />
                <span v-else>{{ row.unit_price || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="支出金额" sortable>
              <template #default="{ row }">
                <span v-if="isEditing(row.id)" class="text-gray-400">¥ {{ (editForm.quantity * editForm.unit_price).toFixed(2) }}</span>
                <span v-else class="font-bold text-red-500">- ¥{{ formatNumber(row.amount) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <div v-if="isEditing(row.id)">
                  <el-button type="success" size="small" link @click="saveEdit('cost', row.id)">保存</el-button>
                  <el-button type="info" size="small" link @click="cancelEdit">取消</el-button>
                </div>
                <div v-else>
                  <el-button type="primary" size="small" link @click="startEdit(row)">修改</el-button>
                  <el-button type="danger" size="small" link @click="handleDelete(row, 'cost')">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <AddRecordModal ref="addModalRef" @success="refreshAll" />
  </div>
</template>

<script setup>
import { Plus, Download, Delete } from '@element-plus/icons-vue' 
import { ref, onMounted, computed, reactive, nextTick } from 'vue'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'

import AddRecordModal from './AddRecordModal.vue'
import { dataService } from '../api/dataService'
import { supabase } from '../lib/supabase' // 用于登出

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref('income')
const addModalRef = ref(null)
const rawIncome = ref([])
const rawCost = ref([])

let pieChartInstance = null
let barChartInstance = null
let dailyChartInstance = null // NEW

// 编辑状态管理
const editingId = ref(null)
const editForm = reactive({})

// 核心计算
const stats = computed(() => {
  const incomeTotal = rawIncome.value.reduce((sum, item) => sum + Number(item.amount), 0)
  const fixedTotal = rawCost.value.filter(i => i.cost_type === '固定成本').reduce((sum, i) => sum + Number(i.amount), 0)
  const variableTotal = rawCost.value.filter(i => i.cost_type === '变动成本').reduce((sum, i) => sum + Number(i.amount), 0)
  return { income: incomeTotal, fixedCost: fixedTotal, variableCost: variableTotal, profit: incomeTotal - fixedTotal - variableTotal }
})

const formatNumber = (num) => Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const handleAdd = () => addModalRef.value.open()
const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.reload()
}

// 获取数据
const fetchMonthData = async () => {
  const { income, cost } = await dataService.getDataByMonth(currentMonth.value)
  rawIncome.value = income
  rawCost.value = cost
  updatePieChart()
  updateDailyChart() // NEW
}

const fetchTrendData = async () => {
  const { income, cost } = await dataService.getTrendData()
  updateBarChart(income, cost)
}

const refreshAll = () => {
  fetchMonthData()
  fetchTrendData()
}

// --- 行内编辑逻辑 ---
const isEditing = (id) => editingId.value === id

const startEdit = (row) => {
  editingId.value = row.id
  // 复制当前行数据到编辑表单
  Object.assign(editForm, {
    category: row.category,
    quantity: row.quantity || 1,
    unit_price: row.unit_price || row.amount // 兼容旧数据
  })
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (table, id) => {
  try {
    const newAmount = editForm.quantity * editForm.unit_price
    await dataService.updateRecord(table, id, {
      category: editForm.category,
      quantity: editForm.quantity,
      unit_price: editForm.unit_price,
      amount: newAmount
    })
    ElMessage.success('更新成功')
    editingId.value = null
    refreshAll()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

// --- 图表逻辑 ---

// NEW: 每日图表更新
const updateDailyChart = () => {
  if (!dailyChartInstance) return
  
  // 1. 获取当月所有天数
  const [year, month] = currentMonth.value.split('-')
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1) // [1, 2, ..., 30]

  // 2. 映射每日收入和支出
  const dailyIncome = new Array(daysInMonth).fill(0)
  const dailyCost = new Array(daysInMonth).fill(0)

  rawIncome.value.forEach(item => {
    const day = parseInt(item.date.split('-')[2])
    if (day) dailyIncome[day-1] += Number(item.amount)
  })
  
  rawCost.value.forEach(item => {
    const day = parseInt(item.date.split('-')[2])
    if (day) dailyCost[day-1] += Number(item.amount)
  })

   dailyChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { 
      data: ['收入', '支出'],
      top: '0%', // 🔴 修复1：图例置顶
      left: 'center'
    },
    grid: { 
      top: '40px',   // 🔴 修复2：图表主体下移 40px，防止重叠
      left: '2%', 
      right: '4%', 
      bottom: '3%', 
      containLabel: true 
    },
    xAxis: { type: 'category', data: days.map(d => `${d}日`) },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: dailyIncome, itemStyle: { color: '#3ba272' }, areaStyle: { opacity: 0.1 } },
      { name: '支出', type: 'line', smooth: true, data: dailyCost, itemStyle: { color: '#ee6666' }, areaStyle: { opacity: 0.1 } }
    ]
  })
}

const updatePieChart = () => {
  if (!pieChartInstance) return
  const dist = {}
  rawCost.value.forEach(item => {
    dist[item.category] = (dist[item.category] || 0) + Number(item.amount)
  })
  const data = Object.keys(dist).map(k => ({ name: k, value: dist[k] }))

  pieChartInstance.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', 
      radius: ['40%', '60%'],
      center: ['50%', '50%'],
      data: data.length ? data : [{ name: '无数据', value: 0 }]
    }]
  })
}

const updateBarChart = (allIncome, allCost) => {
  if (!barChartInstance) return
  const months = []
  const d = new Date()
  for (let i = 0; i < 6; i++) {
    months.unshift(d.toISOString().slice(0, 7))
    d.setMonth(d.getMonth() - 1)
  }
  const values = months.map(m => {
    const inc = allIncome.filter(i => i.date.startsWith(m)).reduce((s, i) => s + Number(i.amount), 0)
    const cst = allCost.filter(c => c.date.startsWith(m)).reduce((s, c) => s + Number(c.amount), 0)
    return (inc - cst).toFixed(0)
  })

  barChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: '15%', bottom: '5%', left: '2%', right: '2%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{
      data: values, type: 'bar', barWidth: '40%',
      itemStyle: { color: params => params.value >= 0 ? '#3ba272' : '#ee6666', borderRadius: [4, 4, 0, 0] }
    }]
  })
}

const handleExport = () => {
  const summaryData = [
    ['报表月份', currentMonth.value],
    ['总收入', stats.value.income],
    ['净利润', stats.value.profit]
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  const incomeRows = rawIncome.value.map(item => ({
    日期: item.date, 类型: '收入', 分类: item.category, 
    数量: item.quantity, 单价: item.unit_price, 金额: item.amount
  }))
  const costRows = rawCost.value.map(item => ({
    日期: item.date, 类型: '支出', 分类: item.category, 
    数量: item.quantity, 单价: item.unit_price, 金额: -item.amount
  }))

  const wsDetails = XLSX.utils.json_to_sheet([...incomeRows, ...costRows].sort((a,b)=>a.日期.localeCompare(b.日期)))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, "汇总")
  XLSX.utils.book_append_sheet(wb, wsDetails, "明细")
  XLSX.writeFile(wb, `报表_${currentMonth.value}.xlsx`)
}

const handleDelete = (row, type) => {
  ElMessageBox.confirm('确定删除?', '警告', { type: 'warning' })
    .then(async () => {
      await dataService.deleteRecord(type, row.id)
      ElMessage.success('删除成功')
      refreshAll()
    })
    .catch(() => {})
}

onMounted(() => {
  setTimeout(() => {
    const pieEl = document.getElementById('pieChart')
    const barEl = document.getElementById('barChart')
    const dailyEl = document.getElementById('dailyChart') // NEW

    if (pieEl) pieChartInstance = echarts.init(pieEl)
    if (barEl) barChartInstance = echarts.init(barEl)
    if (dailyEl) dailyChartInstance = echarts.init(dailyEl) // NEW

    window.addEventListener('resize', () => {
      pieChartInstance && pieChartInstance.resize()
      barChartInstance && barChartInstance.resize()
      dailyChartInstance && dailyChartInstance.resize()
    })
    refreshAll()
  }, 100)
})
</script>