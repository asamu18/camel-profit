<template>
  <div class="p-6 max-w-7xl mx-auto min-h-screen">
    
    <!-- 1. 顶部控制栏 (保持不变) -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
      <div class="flex items-center">
        <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">驼</div>
        <div>
          <h1 class="text-xl font-bold text-gray-800">驼场利润计算系统</h1>
          <p class="text-xs text-gray-500">数据月份：{{ currentMonth }}</p>
        </div>
      </div>
      <div class="flex gap-3 w-full md:w-auto overflow-x-auto pb-1">
        <el-date-picker 
          v-model="currentMonth" type="month" value-format="YYYY-MM" :clearable="false"
          @change="refreshAll" placeholder="选择月份" style="width: 140px;"
        />
        <!-- 🆕 新增：导出按钮 -->
        <el-button type="success" plain @click="handleExport">
          <el-icon class="mr-1"><Download /></el-icon> 导出
        </el-button>
        
        <el-button type="primary" @click="handleAdd">
          <el-icon class="mr-1"><Plus /></el-icon> 新增
        </el-button>
      </div>
    </div>

    <!-- 2. 核心指标卡片 (保持不变) -->
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

    <!-- 3. 可视化图表区 (NEW) -->
    <el-row :gutter="20" class="mb-6">
      <!-- 左侧：成本饼图 -->
      <el-col :xs="24" :md="12" class="mb-6 md:mb-0">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <h3 class="font-bold text-gray-700 mb-4 border-l-4 border-orange-500 pl-2">本月成本结构</h3>
          <div id="pieChart" style="height: 350px; width: 100%;"></div>
        </div>
      </el-col>
      <!-- 右侧：趋势柱状图 -->
      <el-col :xs="24" :md="12" class="mb-6 md:mb-0">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-2">近半年利润趋势</h3>
          <div id="barChart" style="height: 350px; width: 100%;"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 4. 明细报表区 (Tab切换) -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="收入明细" name="income">
          <el-table :data="rawIncome" stripe style="width: 100%" height="400">
            <el-table-column prop="date" label="日期" width="120" sortable />
            <el-table-column prop="category" label="品类" width="150">
              <template #default="scope"><el-tag effect="light">{{ scope.row.category }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="120" />
            <el-table-column prop="unit_price" label="单价" width="120" />
            <el-table-column prop="amount" label="总金额" sortable>
              <template #default="scope"><span class="font-bold text-green-600">+ ¥{{ formatNumber(scope.row.amount) }}</span></template>
            </el-table-column>
            <!-- 🆕 新增：删除操作列 -->
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <!-- 修改点：去掉了 link，去掉了 icon，保留 type="danger" -->
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(scope.row, 'income')"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="成本明细" name="cost">
          <el-table :data="rawCost" stripe style="width: 100%" height="400">
            <el-table-column prop="date" label="日期" width="120" sortable />
            <el-table-column prop="category" label="项目" width="150" />
            <el-table-column prop="cost_type" label="类型" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.cost_type === '固定成本' ? 'info' : 'warning'">{{ scope.row.cost_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="支出金额" sortable>
              <template #default="scope"><span class="font-bold text-red-500">- ¥{{ formatNumber(scope.row.amount) }}</span></template>
            </el-table-column>
            <!-- 🆕 新增：删除操作列 -->
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <!-- 修改点：去掉了 link，去掉了 icon，保留 type="danger" -->
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(scope.row, 'cost')"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <AddRecordModal ref="addModalRef" @success="refreshAll" />
  </div>
</template>
import * as XLSX from 'xlsx' // 引入 Excel 处理库
<script setup>
// 1. 引入 Delete 图标
import { Plus, Download, Delete } from '@element-plus/icons-vue' 
import { ref, onMounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import AddRecordModal from './AddRecordModal.vue'
import * as XLSX from 'xlsx'
import { dataService } from '../api/dataService'
// 2. 引入消息确认框
import { ElMessage, ElMessageBox } from 'element-plus'

// --- 状态定义 ---
const currentMonth = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref('income')
const addModalRef = ref(null)
const rawIncome = ref([])
const rawCost = ref([])

// 图表实例
let pieChartInstance = null
let barChartInstance = null

// --- 核心计算 ---
const stats = computed(() => {
  const incomeTotal = rawIncome.value.reduce((sum, item) => sum + Number(item.amount), 0)
  const fixedTotal = rawCost.value.filter(i => i.cost_type === '固定成本').reduce((sum, i) => sum + Number(i.amount), 0)
  const variableTotal = rawCost.value.filter(i => i.cost_type === '变动成本').reduce((sum, i) => sum + Number(i.amount), 0)
  return { income: incomeTotal, fixedCost: fixedTotal, variableCost: variableTotal, profit: incomeTotal - fixedTotal - variableTotal }
})

// --- 方法 ---
const formatNumber = (num) => Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const handleAdd = () => addModalRef.value.open()

// 1. 获取当月数据 (用于指标卡、表格、饼图)
const fetchMonthData = async () => {
  const { income, cost } = await dataService.getDataByMonth(currentMonth.value)
  rawIncome.value = income
  rawCost.value = cost
  updatePieChart() // 数据回来后更新饼图
}

// 2. 获取趋势数据 (用于柱状图)
const fetchTrendData = async () => {
  const { income, cost } = await dataService.getTrendData()
  updateBarChart(income, cost)
}

// 刷新所有数据
const refreshAll = () => {
  fetchMonthData()
  fetchTrendData()
}

// --- 图表逻辑 ---

// 更新饼图：基于当月 rawCost
// 更新饼图
const updatePieChart = () => {
  if (!pieChartInstance) return
  
  const dist = {}
  rawCost.value.forEach(item => {
    dist[item.category] = (dist[item.category] || 0) + Number(item.amount)
  })
  
  const data = Object.keys(dist).map(k => ({ name: k, value: dist[k] }))

  pieChartInstance.setOption({
    tooltip: { trigger: 'item' },
    legend: { 
      bottom: '0%',
      left: 'center' 
    },
    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
    series: [{
      type: 'pie', 
      radius: ['40%', '60%'], // 稍微调大一点点，看着更饱满
      center: ['50%', '50%'], // ⚠️ 关键修复：强制在容器正中间
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { 
        show: true, 
        formatter: '{b}: {c}'
      },
      data: data.length ? data : [{ name: '无数据', value: 0 }]
    }]
  })
}

// 更新柱状图：基于历史趋势数据
// 更新柱状图：基于历史趋势数据
const updateBarChart = (allIncome, allCost) => {
  if (!barChartInstance) return

  // 1. 生成最近 6 个月的月份标签
  const months = []
  const d = new Date()
  for (let i = 0; i < 6; i++) {
    months.unshift(d.toISOString().slice(0, 7))
    d.setMonth(d.getMonth() - 1)
  }

  // 2. 计算每个月的利润
  const values = months.map(m => {
    const inc = allIncome.filter(i => i.date.startsWith(m)).reduce((s, i) => s + Number(i.amount), 0)
    const cst = allCost.filter(c => c.date.startsWith(m)).reduce((s, c) => s + Number(c.amount), 0)
    return (inc - cst).toFixed(0)
  })

  barChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    // ⚠️ 关键修复：显式定义网格，containLabel: true 会自动计算文字宽度，防止溢出或错位
    grid: { 
      top: '15%', 
      bottom: '5%', 
      left: '2%', 
      right: '2%', 
      containLabel: true 
    },
    xAxis: { 
      type: 'category', 
      data: months,
      axisTick: { alignWithLabel: true } // 让刻度线和标签对齐
    },
    yAxis: { type: 'value' },
    series: [{
      data: values, 
      type: 'bar', 
      barWidth: '40%',
      itemStyle: { 
        color: params => {
          // 进阶优化：盈利绿色，亏损红色 (可选)
          return params.value >= 0 ? '#3ba272' : '#ee6666'
        },
        borderRadius: [4, 4, 0, 0] 
      },
      label: { show: true, position: 'top' }
    }]
  })
}

// --- 导出 Excel ---
const handleExport = () => {
  // 1. 准备 Sheet1：月度汇总数据
  const summaryData = [
    ['报表月份', currentMonth.value],
    ['生成时间', new Date().toLocaleString()],
    [], // 空行
    ['项目', '金额 (元)'],
    ['总收入', stats.value.income],
    ['固定成本', stats.value.fixedCost],
    ['变动成本', stats.value.variableCost],
    ['净利润', stats.value.profit]
  ]
  // 将数组转换为工作表
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  // 2. 准备 Sheet2：详细流水数据
  // 合并收入和支出，整理成扁平格式
  const incomeRows = rawIncome.value.map(item => ({
    日期: item.date,
    收支类型: '收入',
    项目分类: item.category,
    数量: item.quantity,
    单价: item.unit_price,
    成本属性: '-',
    金额: item.amount
  }))

  const costRows = rawCost.value.map(item => ({
    日期: item.date,
    收支类型: '支出',
    项目分类: item.category,
    数量: '-',
    单价: '-',
    成本属性: item.cost_type,
    金额: 0 - item.amount // 支出显示为负数，方便会计核对
  }))

  // 合并并按日期排序
  const allRows = [...incomeRows, ...costRows].sort((a, b) => new Date(a.日期) - new Date(b.日期))
  const wsDetails = XLSX.utils.json_to_sheet(allRows)

  // 3. 创建工作簿并添加 Sheet
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, "月度汇总")
  XLSX.utils.book_append_sheet(wb, wsDetails, "收支明细")

  // 4. 触发下载
  XLSX.writeFile(wb, `驼场利润报表_${currentMonth.value}.xlsx`)
}
// --- 删除逻辑 ---
const handleDelete = (row, type) => {
  ElMessageBox.confirm(
    '确定要删除这条记录吗？删除后无法恢复。',
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      // 调用 API 删除
      // type 传入 'income' 或 'cost'
      await dataService.deleteRecord(type, row.id)
      
      ElMessage.success('删除成功')
      // 核心：删除后立即刷新所有数据
      refreshAll()
    } catch (error) {
      console.error(error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户点击了取消，不做任何事
  })
}

// 初始化
onMounted(() => {
  // 使用 setTimeout 确保 DOM 布局已经完全稳定
  setTimeout(() => {
    const pieEl = document.getElementById('pieChart')
    const barEl = document.getElementById('barChart')

    if (pieEl && barEl) {
      pieChartInstance = echarts.init(pieEl)
      barChartInstance = echarts.init(barEl)
      
      window.addEventListener('resize', () => {
        pieChartInstance && pieChartInstance.resize()
        barChartInstance && barChartInstance.resize()
      })

      refreshAll()
    }
  }, 100) // 延时 100ms
})
</script>