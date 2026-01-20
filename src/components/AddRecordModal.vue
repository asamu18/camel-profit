<template>
  <el-dialog v-model="visible" :title="sceneTitle" width="90%" style="max-width: 500px;" center destroy-on-close>
    
    <el-form :model="form" label-position="top">
      
      <!-- 场景 A: 卖奶 -->
      <div v-if="scene === '卖奶'">
        <el-form-item label="交奶日期">
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
        </el-form-item>
        
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

      <!-- 场景 B: 进饲料 -->
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

        <el-form-item label="总重量 (吨)">
          <el-input-number v-model="form.weight" :min="0.001" :precision="2" style="width: 100%" size="large" @change="calcByWeight" />
        </el-form-item>

        <div class="flex gap-3">
          <el-form-item label="单价 (元/吨)" class="flex-1">
            <el-input-number v-model="form.unit_price" :min="0" :precision="2" style="width: 100%" size="large" :controls="false" @input="calcByUnitPrice" />
          </el-form-item>
          <el-form-item label="总金额 (元)" class="flex-1">
            <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" size="large" :controls="false" @input="calcByAmount" />
          </el-form-item>
        </div>
      </div>

      <!-- 🔴 场景 E: 录入库存 (新增袋数方案) -->
      <div v-if="scene === '录入库存'">
        <div class="bg-blue-50 p-3 rounded-lg mb-4 text-[10px] text-blue-800 border border-blue-100">
          💡 提示：此操作将直接覆盖家里的库存总量，用于定期盘点。
        </div>

        <el-form-item label="饲料名称">
          <el-select v-model="form.category" filterable allow-create placeholder="请选择或输入" size="large" style="width: 100%">
             <el-option v-for="item in feedOptions" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>

        <div class="mb-4">
          <el-radio-group v-model="inputMode" size="small" class="w-full">
            <el-radio-button label="total">按吨录入</el-radio-button>
            <el-radio-button label="bag">按袋录入</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 方案一：按吨 -->
        <div v-if="inputMode === 'total'" class="flex gap-3 animate-in fade-in">
          <el-form-item label="库存重量 (吨)" class="flex-1">
            <el-input-number v-model="form.weight" :min="0" :precision="2" style="width: 100%" size="large" :controls="false" />
          </el-form-item>
          <el-form-item label="估值单价 (元/吨)" class="flex-1">
            <el-input-number v-model="form.unit_price" :min="0" style="width: 100%" size="large" :controls="false" />
          </el-form-item>
        </div>

        <!-- 方案二：按袋 (新) -->
        <div v-else class="space-y-4 animate-in fade-in">
          <div class="grid grid-cols-2 gap-3">
            <el-form-item label="现有袋数" class="mb-0">
              <el-input-number v-model="form.bags" :min="0" style="width: 100%" size="large" placeholder="多少袋" />
            </el-form-item>
            <el-form-item label="每袋重量 (kg)" class="mb-0">
              <el-input-number v-model="form.kg_per_bag" :min="1" style="width: 100%" size="large" placeholder="每袋重" />
            </el-form-item>
          </div>
          <el-form-item label="单袋价格 (元/袋)">
            <el-input-number v-model="form.price_per_bag" :min="0" style="width: 100%" size="large" :controls="false" />
          </el-form-item>
          <div class="bg-gray-50 p-2 rounded text-[11px] text-gray-500 text-center border border-dashed">
            自动换算结果：共 <span class="text-blue-600 font-bold">{{ ((form.bags * form.kg_per_bag) / 1000).toFixed(2) }}</span> 吨，
            折合 ¥<span class="text-blue-600 font-bold">{{ form.kg_per_bag > 0 ? ((form.price_per_bag / form.kg_per_bag) * 1000).toFixed(0) : 0 }}</span>/吨
          </div>
        </div>
      </div>

      <!-- 场景 C: 骆驼交易 (保持不动) -->
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

      <!-- 场景 D: 其他 (保持不动) -->
      <div v-if="scene === '其他'">
        <el-radio-group v-model="form.type" class="mb-4">
          <el-radio-button label="cost">支出</el-radio-button>
          <el-radio-button label="income">额外收入</el-radio-button>
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
const inputMode = ref('total') // total: 吨, bag: 袋
const emit = defineEmits(['success'])
const userTemplate = ref([])

const form = reactive({
  date: '', quantity: 1, unit_price: 0, amount: 0, category: '', type: 'income', duration: 1, weight: 0,
  bags: 0, kg_per_bag: 40, price_per_bag: 0 // 新增袋装字段
})

const feedOptions = computed(() => {
  return userTemplate.value.filter(item => 
    item.name.includes('草') || item.name.includes('料') || item.name.includes('豆')
  )
})

const sceneTitle = computed(() => {
  return { '卖奶': '今日卖奶', '买饲料': '进饲料', '其他': '记一笔', '录入库存': '自家存货盘点' }[scene.value]
})

// --- 进饲料场景换算逻辑 ---
const calcByUnitPrice = (val) => {
  form.unit_price = val
  if (form.weight > 0) form.amount = Number((form.unit_price * form.weight).toFixed(2))
}
const calcByAmount = (val) => {
  form.amount = val
  if (form.weight > 0) form.unit_price = Number((form.amount / form.weight).toFixed(2))
}
const calcByWeight = (val) => {
  form.weight = val
  if (form.unit_price > 0) form.amount = Number((form.unit_price * form.weight).toFixed(2))
  else if (form.amount > 0) form.unit_price = Number((form.amount / form.weight).toFixed(2))
}

const openWithScene = async (s) => {
  scene.value = s
  visible.value = true
  inputMode.value = 'total' // 重置模式
  form.date = new Date().toISOString().slice(0, 10)
  form.weight = 0
  form.amount = 0
  form.unit_price = 0
  form.bags = 0
  form.price_per_bag = 0

  if (s === '其他') { form.type = 'cost'; form.category = '' }

  const { data: { user } } = await supabase.auth.getUser()
  if (s === '卖奶') {
    form.category = '驼奶销售'
    const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
    if (data) { form.unit_price = data.milk_price || 30; form.duration = data.milk_frequency || 1 }
  }
  if (s === '买饲料' || s === '录入库存') {
    const { data } = await supabase.from('settings').select('daily_template').eq('user_id', user.id).maybeSingle()
    if (data) userTemplate.value = data.daily_template || []
  }
}

const submit = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (scene.value === '录入库存') {
      if (!form.category) throw new Error('请选择饲料名称')
      
      let finalWeight = form.weight
      let finalUnitPrice = form.unit_price

      // 🔴 关键逻辑：按袋换算
      if (inputMode.value === 'bag') {
        finalWeight = (form.bags * form.kg_per_bag) / 1000
        finalUnitPrice = form.kg_per_bag > 0 ? (form.price_per_bag / form.kg_per_bag) * 1000 : 0
      }

      await dataService.updateInventory({
        category: form.category,
        quantity: finalWeight,
        unit_price: finalUnitPrice
      })
      ElMessage.success('库存盘点已完成')
    }
    else if (scene.value === '卖奶') {
      const { count } = await supabase.from('income').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', form.date).eq('category', '驼奶销售')
      if (count > 0) throw new Error(`${form.date} 已有交奶记录`)
      await dataService.addIncome({ date: form.date, category: '驼奶销售', quantity: form.quantity, unit_price: form.unit_price, amount: form.quantity * form.unit_price, duration: form.duration })
    } 
    else if (scene.value === '买饲料') {
      await dataService.addCost({ date: form.date, category: form.category || '饲料', amount: form.amount, unit_price: form.unit_price, weight: form.weight, cost_type: '库存进货' })
      if (form.weight > 0 && form.category) {
        await dataService.incrementInventory({ category: form.category, weight: form.weight, unit_price: form.unit_price })
      }
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