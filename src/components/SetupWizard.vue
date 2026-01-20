<template>
  <el-dialog v-model="visible" title="初始化您的驼场" width="95%" center :close-on-click-modal="false" :show-close="false" destroy-on-close>
    
    <div class="h-[60vh] overflow-y-auto px-1">
      <!-- 第一步：规模与收入参数 -->
      <div class="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
        <h3 class="font-bold text-blue-800 mb-3 text-sm flex items-center">
          <span class="text-lg mr-2">🐪</span> 基础规模与收入预估
        </h3>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <el-form-item label="总驼数 (峰)">
              <el-input-number v-model="form.total_camels" :min="1" style="width:100%" :controls="false" />
            </el-form-item>
            <el-form-item label="产奶驼数 (峰)">
              <el-input-number v-model="form.milking_camels" :min="0" style="width:100%" :controls="false" />
            </el-form-item>
          </div>
          
          <div class="bg-white p-3 rounded-lg border border-blue-200">
            <div class="text-xs text-blue-500 font-bold mb-2">卖奶情况</div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm text-gray-600 whitespace-nowrap">每</span>
              <el-input-number v-model="form.milk_frequency" :min="1" size="small" style="width: 60px" :controls="false" />
              <span class="text-sm text-gray-600 whitespace-nowrap">天，交一次奶</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600 whitespace-nowrap">每次交</span>
              <el-input-number v-model="form.milk_quantity_per_time" :min="0" size="small" style="width: 70px" :controls="false" />
              <span class="text-sm text-gray-600 whitespace-nowrap">公斤 (单价:</span>
              <el-input-number v-model="form.milk_price" :min="0" size="small" style="width: 50px" :controls="false" />
              <span class="text-sm text-gray-600">元)</span>
            </div>
            <div class="mt-2 text-right text-xs text-blue-600 font-bold border-t border-blue-100 pt-1">
              日均收入: ¥ {{ dailyMilkIncome }}
            </div>
          </div>
        </div>
      </div>

      <!-- 第二步：支出模板 -->
      <div class="bg-orange-50 p-4 rounded-xl border border-orange-100">
        <h3 class="font-bold text-orange-800 mb-3 text-sm flex justify-between items-center">
          <span>💰 每日固定支出模板</span>
          <span class="text-xs font-normal bg-orange-100 px-2 py-0.5 rounded text-orange-600">可自由修改名称</span>
        </h3>
        
        <div v-for="(item, index) in form.template" :key="index" class="mb-3 bg-white p-3 rounded shadow-sm border border-orange-100">
          <div class="flex justify-between items-center mb-2 gap-2">
            <el-input v-model="item.name" placeholder="请输入项目名称" size="small" class="font-bold" />
            <el-button type="danger" link size="small" @click="removeItem(index)">删除</el-button>
          </div>
          
          <div class="flex gap-2">
             <div class="flex-1">
               <div class="text-xs text-gray-400 mb-1">数量/重量</div>
               <el-input-number v-model="item.quantity" :min="0" size="small" style="width:100%" :controls="false" />
             </div>
             <div class="flex-1">
               <div class="text-xs text-gray-400 mb-1">单价</div>
               <el-input-number v-model="item.unit_price" :min="0" size="small" style="width:100%" :controls="false" />
             </div>
             <div class="w-16 text-right">
               <div class="text-xs text-gray-400 mb-1">小计</div>
               <div class="font-bold text-orange-600 pt-1">¥{{ (item.quantity * item.unit_price).toFixed(0) }}</div>
             </div>
          </div>
        </div>
        
        <el-button class="w-full mt-2 border-dashed bg-white" @click="addItem">
          <span class="text-orange-500 font-bold">+ 添加其他支出项</span>
        </el-button>
      </div>
    </div>

    <div class="py-4 bg-white border-t mt-2">
      <div class="flex justify-between text-sm mb-2 px-2">
        <span class="text-gray-500">预估日净利 (收入-支出):</span>
        <span class="font-bold text-lg" :class="dailyProfit >= 0 ? 'text-green-600' : 'text-red-500'">
          ¥ {{ dailyProfit }}
        </span>
      </div>
      <el-button type="primary" size="large" class="w-full font-bold" @click="saveSettings" :loading="loading">
        保存并自动生成今日账单
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const loading = ref(false)
const emit = defineEmits(['finish'])

// 预设模板
const defaultItems = [
  { name: '豆粕', quantity: 1, unit_price: 170 },
  { name: '葵花头', quantity: 1, unit_price: 50 },
  { name: '颗粒饲料', quantity: 1, unit_price: 150 },
  { name: '燕麦草', quantity: 2, unit_price: 50 },
  { name: '苜蓿草', quantity: 3, unit_price: 50 },
  { name: '青储草', quantity: 6, unit_price: 50 },
  { name: '人工工资', quantity: 1, unit_price: 334 },
  { name: '水电费', quantity: 1, unit_price: 30 },
  { name: '燃油', quantity: 1, unit_price: 30 },
]

const form = reactive({
  total_camels: 100,
  milking_camels: 20,
  milk_frequency: 1, // 几天交一次
  milk_quantity_per_time: 40, // 每次交多少
  milk_price: 30,
  template: JSON.parse(JSON.stringify(defaultItems))
})

// 计算日均奶收入
const dailyMilkIncome = computed(() => {
  if (!form.milk_frequency || form.milk_frequency === 0) return 0
  return ((form.milk_quantity_per_time / form.milk_frequency) * form.milk_price).toFixed(0)
})

const totalDailyCost = computed(() => {
  return form.template.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
})

const dailyProfit = computed(() => {
  return (Number(dailyMilkIncome.value) - totalDailyCost.value).toFixed(0)
})

const check = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log("向导检测：用户未登录")
    return
  }

  // 增加强制从服务端拉取，避免缓存
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log("向导检测数据:", data)

  // 🔴 逻辑优化：如果没有数据，或者 daily_template 字段是空的/空数组，就弹出
  if (error || !data || !data.daily_template || data.daily_template.length === 0) {
    console.log("向导检测：未检测到有效配置，开启引导...")
    visible.value = true
  }
}

const addItem = () => {
  form.template.push({ name: '', quantity: 1, unit_price: 0 })
}

const removeItem = (index) => {
  form.template.splice(index, 1)
}

const saveSettings = async () => {
  // 简单校验
  if (form.template.some(item => !item.name || item.name.trim() === '')) {
    return ElMessage.warning('请确保所有支出项都有名称')
  }

  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // 1. 保存设置
    const settingsData = {
      user_id: user.id,
      total_camels: form.total_camels,
      milking_camels: form.milking_camels,
      daily_template: form.template,
      milk_price: form.milk_price,
      milk_frequency: form.milk_frequency,
      milk_quantity_per_time: form.milk_quantity_per_time
    }

    const { error: settingsError } = await supabase.from('settings').upsert(settingsData, { onConflict: 'user_id' })
    if (settingsError) throw settingsError

    // 2. 自动生成今日账单 (实账)
    const today = new Date().toISOString().slice(0, 10)
    // 检查今天是否已经有日常支出了，防止重复生成 (虽然初始化通常是新用户，但防守一下更好)
    const { count } = await supabase.from('cost').select('*', { count: 'exact', head: true }).eq('date', today).eq('cost_type', '日常支出')
    
    if (count === 0) {
      const records = form.template.map(item => ({
        user_id: user.id,
        date: today,
        category: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        cost_type: '日常支出',
        weight: 0 
      }))
      
      const { error: costError } = await supabase.from('cost').insert(records)
      if (costError) throw costError
    }

    ElMessage.success('初始化完成，今日账单已自动生成！')
    visible.value = false
    emit('finish')
    
  } catch (err) {
    console.error(err)
    ElMessage.error('保存失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

defineExpose({ check })
</script>