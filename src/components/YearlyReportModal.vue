<template>
  <el-dialog v-model="visible" title="年度账本 (今年)" width="95%" style="max-width: 500px;" center>
    <div v-loading="loading">
      
      <!-- 1. 饲料专属统计 -->
      <div class="bg-green-50 p-4 rounded-xl mb-6 border border-green-100">
        <h3 class="font-bold text-green-800 mb-2 flex items-center">
          🌿 饲料总计
        </h3>
        <div class="flex justify-between items-end border-b border-green-200 pb-2 mb-2">
          <span class="text-gray-600">总重量</span>
          <span class="text-xl font-bold text-green-700">{{ totalFeedWeight }} 吨</span>
        </div>
        <div class="flex justify-between items-end">
          <span class="text-gray-600">总花费</span>
          <span class="text-xl font-bold text-green-700">¥ {{ formatNumber(totalFeedCost) }}</span>
        </div>
      </div>

      <!-- 2. 分类成本排行榜 -->
      <h3 class="font-bold text-gray-800 mb-3 border-l-4 border-orange-500 pl-2">各项成本排行</h3>
      <div class="space-y-3">
        <div v-for="(item, index) in costRank" :key="index" class="flex items-center justify-between bg-white p-3 rounded shadow-sm border">
          <div class="flex items-center gap-3">
            <span class="text-gray-400 font-bold w-4">{{ index + 1 }}</span>
            <span class="font-bold text-gray-700">{{ item.name }}</span>
          </div>
          <div class="text-right">
             <div class="font-bold">¥ {{ formatNumber(item.value) }}</div>
             <div class="text-xs text-gray-400">{{ ((item.value / totalCost) * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>

    </div>
    <template #footer>
      <el-button @click="visible = false" size="large" class="w-full">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const visible = ref(false)
const loading = ref(false)
const rawCosts = ref([])

const open = () => {
  visible.value = true
  fetchYearData()
}

const fetchYearData = async () => {
  loading.value = true
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString()
  
  const { data } = await supabase
    .from('cost')
    .select('*')
    .gte('date', startOfYear)
  
  rawCosts.value = data || []
  loading.value = false
}

// 统计逻辑
const totalFeedWeight = computed(() => {
  // 筛选所有饲料，累加重量
  const feeds = rawCosts.value.filter(c => c.category.includes('饲料') || c.category.includes('草') || c.category.includes('玉米'))
  return feeds.reduce((sum, item) => sum + (Number(item.weight) || 0), 0)
})

const totalFeedCost = computed(() => {
  const feeds = rawCosts.value.filter(c => c.category.includes('饲料') || c.category.includes('草') || c.category.includes('玉米'))
  return feeds.reduce((sum, item) => sum + Number(item.amount), 0)
})

const totalCost = computed(() => rawCosts.value.reduce((s, i) => s + i.amount, 0))

const costRank = computed(() => {
  const map = {}
  rawCosts.value.forEach(item => {
    // 简单归类：如果是具体饲料名，统一归为“饲料”以便看总数，或者按原名显示
    // 这里按原名显示，用户想看细节
    map[item.category] = (map[item.category] || 0) + item.amount
  })
  return Object.keys(map)
    .map(k => ({ name: k, value: map[k] }))
    .sort((a, b) => b.value - a.value)
})

const formatNumber = (n) => n.toLocaleString()

defineExpose({ open })
</script>