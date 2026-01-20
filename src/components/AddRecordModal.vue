<template>
  <el-dialog v-model="visible" :title="sceneTitle" width="90%" style="max-width: 500px;" center destroy-on-close>
    
    <el-form :model="form" label-position="top">
      
      <!-- 场景 A: 卖奶 -->
      <div v-if="scene === '卖奶'">
         <el-form-item label="交奶日期">
    <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
  </el-form-item>
  
  <!-- 🔴 新增：交奶涵盖的天数 -->
  <el-form-item label="这笔钱是几天的奶？">
    <el-input-number v-model="form.duration" :min="1" :max="30" style="width: 100%" size="large" />
    <p class="text-[10px] text-gray-400 mt-1">系统将自动平摊这 {{form.duration}} 天的利润</p>
  </el-form-item>

  <div class="flex gap-4">
    <el-form-item label="数量 (公斤)" class="flex-1">
      <el-input-number v-model="form.quantity" :min="0.1" style="width: 100%" size="large" />
    </el-form-item>
    <el-form-item label="单价 (元/公斤)" class="flex-1">
      <el-input-number v-model="form.unit_price" :min="0.1" style="width: 100%" size="large" />
    </el-form-item>
  </div>
        <div class="bg-blue-50 p-3 rounded text-center text-blue-800 font-bold mb-4">
          总收入: ¥ {{ (form.quantity * form.unit_price).toFixed(2) }}
        </div>
      </div>

      <!-- 场景 B: 买饲料 -->
      <div v-if="scene === '买饲料'">
        <div class="bg-green-50 p-3 rounded-lg mb-4 text-xs text-green-800 border border-green-200">
          <el-icon><InfoFilled /></el-icon> 系统会根据您的模板自动预估可用天数。
        </div>
        <el-form-item label="进货日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
        </el-form-item>
        <el-form-item label="饲料名称">
           <el-select v-model="form.category" filterable allow-create default-first-option placeholder="请选择" size="large" style="width: 100%">
             <el-option v-for="item in feedOptions" :key="item.name" :label="item.name" :value="item.name" />
           </el-select>
        </el-form-item>
        <div class="flex gap-3">
          <el-form-item label="总金额 (元)" class="flex-1">
            <el-input-number v-model="form.amount" :min="0" style="width: 100%" size="large" />
          </el-form-item>
          <el-form-item label="总重量 (吨)" class="flex-1">
            <el-input-number v-model="form.weight" :min="0" :precision="2" style="width: 100%" size="large" />
          </el-form-item>
        </div>
      </div>

      <!-- 场景 C: 骆驼交易 -->
      <div v-if="scene === '骆驼交易'">
        <el-tabs type="card" v-model="camelType">
          <el-tab-pane label="卖骆驼 (收入)" name="sell"></el-tab-pane>
          <el-tab-pane label="买骆驼 (支出)" name="buy"></el-tab-pane>
        </el-tabs>
        <el-form-item label="日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" size="large" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="form.amount" :min="0" style="width: 100%" size="large" />
        </el-form-item>
      </div>

      <!-- 场景 D: 其他 -->
      <div v-if="scene === '其他'">
        <el-radio-group v-model="form.type" class="mb-4">
          <el-radio-button label="income">收入</el-radio-button>
          <el-radio-button label="cost">支出</el-radio-button>
        </el-radio-group>
        <el-form-item label="项目名称">
          <el-input v-model="form.category" placeholder="如：兽药、水电" size="large" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="form.amount" :min="0" style="width: 100%" size="large" />
        </el-form-item>
        <el-form-item label="日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large" />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false" size="large">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit" size="large" class="w-32">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { dataService } from '../api/dataService'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

const visible = ref(false)
const scene = ref('卖奶') 
const loading = ref(false)
const camelType = ref('sell') 
const emit = defineEmits(['success'])
const userTemplate = ref([])

const form = reactive({
  date: '', quantity: 1, unit_price: 30, amount: 0, category: '', type: 'income', duration: 30, weight: 0
})

const feedOptions = computed(() => {
  return userTemplate.value.filter(item => 
    item.name.includes('草') || item.name.includes('料') || item.name.includes('豆')
  )
})

const sceneTitle = computed(() => {
  return { '卖奶': '今日卖奶', '买饲料': '进大车饲料', '骆驼交易': '骆驼买卖', '其他': '记一笔' }[scene.value]
})

const openWithScene = async (s) => {
  scene.value = s
  visible.value = true
  form.date = new Date().toISOString().slice(0, 10)
  form.amount = 0
  form.quantity = 1
  form.category = ''

  const { data: { user } } = await supabase.auth.getUser()
  if (s === '卖奶') {
  form.category = '驼奶销售'
  // 🔴 默认带入模板里的频率
  const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  if (data) {
    form.unit_price = data.milk_price || 30
    form.duration = data.milk_frequency || 1 // 默认天数
  }
}
  if (s === '买饲料') {
    const { data } = await supabase.from('settings').select('daily_template').eq('user_id', user.id).maybeSingle()
    if (data) userTemplate.value = data.daily_template || []
  }
}

const submit = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (scene.value === '卖奶') {
      // 🔴 关键逻辑：数据库查重
      const { count } = await supabase
        .from('income')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', form.date)
        .eq('category', '驼奶销售')

      if (count > 0) {
        throw new Error(`${form.date} 已有交奶记录，请勿重复提交`)
      }

       await dataService.addIncome({
    date: form.date, 
    category: '驼奶销售', 
    quantity: form.quantity, 
    unit_price: form.unit_price, 
    amount: form.quantity * form.unit_price,
    duration: form.duration // 🔴 存入这个天数
  })
    } 
    else if (scene.value === '买饲料') {
      await dataService.addCost({
        date: form.date, category: form.category || '饲料', 
        amount: form.amount, weight: form.weight, cost_type: '库存进货'
      })
    }
    else if (scene.value === '骆驼交易') {
      const isSell = camelType.value === 'sell'
      const data = { date: form.date, category: isSell ? '卖骆驼' : '买骆驼', quantity: form.quantity, amount: form.amount }
      if (isSell) await dataService.addIncome(data)
      else await dataService.addCost({ ...data, cost_type: '固定成本' })
    }
    else {
      const data = { date: form.date, category: form.category, amount: form.amount }
      if (form.type === 'income') await dataService.addIncome(data)
      else await dataService.addCost({ ...data, cost_type: '其他' })
    }

    ElMessage.success('记好了！')
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

defineExpose({ openWithScene })
</script>