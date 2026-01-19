<template>
  <el-dialog v-model="visible" title="饲料成本统计" width="90%" center>
    
    <div class="flex gap-2 mb-4">
      <el-date-picker 
        v-model="dateRange" 
        type="daterange" 
        range-separator="至" 
        start-placeholder="开始" 
        end-placeholder="结束"
        value-format="YYYY-MM-DD"
        size="small"
        :clearable="false"
        style="width: 100%"
        @change="fetchStats"
      />
    </div>

    <div v-loading="loading">
      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-green-50 p-3 rounded-lg text-center border border-green-100">
          <div class="text-xs text-gray-500">总重量 (吨)</div>
          <div class="text-xl font-bold text-green-700">{{ totalWeight }}</div>
        </div>
        <div class="bg-orange-50 p-3 rounded-lg text-center border border-orange-100">
          <div class="text-xs text-gray-500">总花费 (元)</div>
          <div class="text-xl font-bold text-orange-700">{{ totalCost }}</div>
        </div>
      </div>

      <!-- 列表 -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div v-for="(item, idx) in list" :key="idx" class="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
          <span class="font-bold text-gray-700">{{ item.name }}</span>
          <div class="text-right">
            <div class="text-xs text-gray-500">{{ item.weight }} 吨</div>
            <div class="font-medium text-gray-900">¥ {{ item.amount }}</div>
          </div>
        </div>
      </div>
    </div>

  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const visible = ref(false)
const loading = ref(false)
// 默认查最近30天
const end = new Date()
const start = new Date()
start.setDate(start.getDate() - 30)
const dateRange = ref([start.toISOString().slice(0,10), end.toISOString().slice(0,10)])
const rawData = ref([])

const open = () => {
  visible.value = true
  fetchStats()
}

const fetchStats = async () => {
  if (!dateRange.value) return
  loading.value = true
  // 查找所有饲料相关的支出
  const { data } = await supabase
    .from('cost')
    .select('*')
    .gte('date', dateRange.value[0])
    .lte('date', dateRange.value[1])
    .or('category.ilike.%饲料%,category.ilike.%草%,category.ilike.%豆%,category.ilike.%料%') // 模糊匹配常见饲料名

  rawData.value = data || []
  loading.value = false
}

const totalWeight = computed(() => rawData.value.reduce((s, i) => s + (Number(i.weight)||0), 0).toFixed(2))
const totalCost = computed(() => rawData.value.reduce((s, i) => s + Number(i.amount), 0).toFixed(0))

// 按名称分组统计
const list = computed(() => {
  const map = {}
  rawData.value.forEach(i => {
    if (!map[i.category]) map[i.category] = { name: i.category, weight: 0, amount: 0 }
    map[i.category].weight += (Number(i.weight) || 0)
    map[i.category].amount += Number(i.amount)
  })
  return Object.values(map).sort((a,b) => b.amount - a.amount)
})

defineExpose({ open })
</script>