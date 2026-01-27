<template>
  <el-dialog 
    v-model="visible" 
    title="初始化您的驼场" 
    width="95%" 
    center 
    :close-on-click-modal="false" 
    :show-close="false" 
    append-to-body
    destroy-on-close
  >
    <div class="h-[60vh] overflow-y-auto px-1">
      <!-- 第一步：规模 -->
      <div class="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100" id="guide-total">
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
          
          <div class="bg-white p-3 rounded-lg border border-blue-200" id="guide-income">
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
      <div class="bg-orange-50 p-4 rounded-xl border border-orange-100" id="guide-template">
        <h3 class="font-bold text-orange-800 mb-3 text-sm flex justify-between items-center">
          <span>💰 每天喂草开支模板</span>
          <span class="text-xs font-normal bg-orange-100 px-2 py-0.5 rounded text-orange-600">可改名</span>
        </h3>
        
        <div v-for="(item, index) in form.template" :key="index" class="mb-3 bg-white p-3 rounded shadow-sm border border-orange-100">
          <div class="flex justify-between items-center mb-2 gap-2">
            <el-input v-model="item.name" placeholder="项目名称" size="small" class="font-bold" />
            <el-button type="danger" link size="small" @click="removeItem(index)">删除</el-button>
          </div>
          
          <div class="flex gap-2">
             <div class="flex-1">
               <div class="text-xs text-gray-400 mb-1">数量</div>
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
        
        <el-button class="w-full mt-2 border-dashed bg-white font-bold h-10" @click="addItem">
          + 添加其他支出项
        </el-button>
      </div>
    </div>

    <div class="py-4 bg-white border-t mt-2">
      <div class="flex justify-between text-sm mb-4 px-2">
        <span class="text-gray-500 font-bold">预计日净利:</span>
        <span class="font-black text-xl" :class="toNum(dailyProfit) >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          ¥ {{ dailyProfit }}
        </span>
      </div>
      <el-button type="primary" size="large" class="w-full font-black text-xl h-14 !rounded-2xl shadow-lg" @click="saveSettings" :loading="loading">
        保存并开始记账
      </el-button>
    </div>

    <!-- 挂载引导组件 -->
    <UserGuide ref="guideRef" :steps="wizardSteps" />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'
import UserGuide from './UserGuide.vue'

const visible = ref(false)
const loading = ref(false)
const guideRef = ref(null)
const emit = defineEmits(['finish'])

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
  milk_frequency: 1,
  milk_quantity_per_time: 40,
  milk_price: 30,
  template: JSON.parse(JSON.stringify(defaultItems))
})

const wizardSteps = [
  { targetId: 'guide-total', title: '第1步：写下规模', content: '输入你骆驼的总数。系统会根据这个数帮你算出每年的开支基准。' },
  { targetId: 'guide-income', title: '第2步：记下卖奶频率', content: '设置你几天交一次奶。系统会自动把每一桶奶的钱平摊到每一天。' },
  { targetId: 'guide-template', title: '第3步：喂草开支', content: '这里是每天必须花的钱。如果有变动，改一下数字就行。' }
]

const toNum = (val) => Number(val) || 0
const dailyMilkIncome = computed(() => {
  if (!form.milk_frequency) return 0
  return ((form.milk_quantity_per_time / form.milk_frequency) * form.milk_price).toFixed(0)
})
const totalDailyCost = computed(() => form.template.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))
const dailyProfit = computed(() => (toNum(dailyMilkIncome.value) - totalDailyCost.value).toFixed(0))

// 🔴 修复语法错误的 check 函数
const check = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase.from('settings').select('daily_template').eq('user_id', user.id).maybeSingle()

  if (!data || !data.daily_template || data.daily_template.length === 0) {
    visible.value = true
    setTimeout(() => {
      ElMessageBox.confirm('欢迎来到驼账宝！需要我带你一步步填写这个表吗？', '新同学你好', {
        confirmButtonText: '带带我',
        cancelButtonText: '我自己填',
        type: 'info',
        center: true,
        appendToBody: true
      }).then(() => {
        guideRef.value.start()
      }).catch(() => {})
    }, 1000)
  }
}

const addItem = () => form.template.push({ name: '', quantity: 1, unit_price: 0 })
const removeItem = (index) => form.template.splice(index, 1)

const saveSettings = async () => {
  if (form.template.some(item => !item.name.trim())) return ElMessage.warning('项目名称不能为空')
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    
    await supabase.from('settings').upsert({
      user_id: user.id, total_camels: form.total_camels, milking_camels: form.milking_camels,
      daily_template: form.template, milk_price: form.milk_price,
      milk_frequency: form.milk_frequency, milk_quantity_per_time: form.milk_quantity_per_time
    }, { onConflict: 'user_id' })

    const costRecords = form.template.map(item => ({ user_id: user.id, date: today, category: item.name, quantity: item.quantity, unit_price: item.unit_price, amount: item.quantity * item.unit_price, cost_type: '日常支出' }))
    await supabase.from('cost').insert(costRecords)

    if (form.milk_quantity_per_time > 0) {
      await supabase.from('income').insert([{ user_id: user.id, date: today, category: '驼奶销售', quantity: form.milk_quantity_per_time, unit_price: form.milk_price, amount: form.milk_quantity_per_time * form.milk_price, duration: form.milk_frequency }])
    }

    localStorage.setItem('is_new_user', 'true')
    ElMessage.success('设置成功！')
    visible.value = false
    emit('finish')
  } catch (err) { ElMessage.error('保存失败') } finally { loading.value = false }
}

const openManual = () => { visible.value = true }
defineExpose({ check, openManual })
</script>