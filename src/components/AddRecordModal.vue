<template>
  <!-- 🔴 删除了之前冗余的空 dialog 标签 -->
  <el-dialog 
    v-model="visible" 
    :title="sceneTitle" 
    width="95%" 
    style="max-width: 500px;" 
    center 
    destroy-on-close
    append-to-body
  >
    <el-form :model="form" label-position="top">
      
      <!-- 场景 A: 卖奶 -->
      <div v-if="scene === '卖奶'" class="space-y-4">
        <el-form-item label="交奶日期">
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large" />
        </el-form-item>
        
        <el-form-item label="这是几天的量？">
          <el-input-number v-model="form.duration" :min="1" :max="30" class="!w-full giant-stepper" size="large" />
        </el-form-item>

        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="一共多少公斤" class="mb-0">
            <el-input-number v-model="form.quantity" :min="0.1" class="!w-full giant-stepper" size="large" :controls="false" placeholder="输入重量" />
          </el-form-item>
          <el-form-item label="单价 (元/公斤)" class="mb-0">
            <el-input-number v-model="form.unit_price" :min="0.1" :precision="2" class="!w-full" size="large" :controls="false" placeholder="单价" />
          </el-form-item>
        </div>
        <div class="bg-blue-50 p-5 rounded-3xl text-center text-blue-800 font-black text-2xl mt-4 border border-blue-100 shadow-inner">
          总收入: ¥ {{ (toNum(form.quantity) * toNum(form.unit_price)).toFixed(2) }}
        </div>
      </div>

      <!-- 场景 B: 进饲料 -->
      <div v-if="scene === '买饲料'" class="space-y-4">
        <el-form-item label="进货日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
        </el-form-item>
        <el-form-item label="饲料名字 (点开选或直接输)">
           <el-select 
             v-model="form.category" 
             filterable 
             allow-create 
             default-first-option
             placeholder="输入或选择饲料" 
             size="large" 
             class="!w-full"
           >
             <el-option v-for="item in feedOptions" :key="item.name" :label="item.name" :value="item.name" />
           </el-select>
        </el-form-item>

        <el-form-item label="买了多少吨">
          <el-input-number v-model="form.weight" :min="0.001" :precision="3" class="!w-full giant-stepper" size="large" @change="calcByWeight" />
        </el-form-item>

        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="一吨多少钱" class="mb-0">
            <el-input-number v-model="form.unit_price" :min="0" class="!w-full" size="large" :controls="false" @input="calcByUnitPrice" />
          </el-form-item>
          <el-form-item label="一共花了多少钱" class="mb-0">
            <el-input-number v-model="form.amount" :min="0" class="!w-full" size="large" :controls="false" @input="calcByAmount" />
          </el-form-item>
        </div>
      </div>

      <!-- 场景 E: 家里还有多少料 -->
      <div v-if="scene === '录入库存'">
        <div class="bg-blue-50 p-4 rounded-2xl mb-4 text-xs text-blue-800 border border-blue-100 font-bold">
          💡 以后每天喂多少草会自动减去，现在请写下目前家里剩的总量。
        </div>

        <el-form-item label="饲料名字">
          <el-select v-model="form.category" filterable allow-create placeholder="选一个" size="large" class="!w-full">
             <el-option v-for="item in feedOptions" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>

        <div class="mb-4">
          <el-radio-group v-model="inputMode" size="large" class="w-full flex">
            <el-radio-button label="total" class="flex-1">按吨算</el-radio-button>
            <el-radio-button label="bag" class="flex-1">按袋算</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="inputMode === 'total'" class="grid grid-cols-2 gap-4 animate-in fade-in">
          <el-form-item label="还有多少吨">
            <el-input-number v-model="form.weight" :min="0" :precision="2" class="!w-full giant-stepper" size="large" />
          </el-form-item>
          <el-form-item label="当时买的单价">
            <el-input-number v-model="form.unit_price" :min="0" class="!w-full" size="large" :controls="false" />
          </el-form-item>
        </div>

        <div v-else class="space-y-4 animate-in fade-in">
          <div class="grid grid-cols-2 gap-4">
            <el-form-item label="还有多少袋">
              <el-input-number v-model="form.bags" :min="0" class="!w-full giant-stepper" size="large" />
            </el-form-item>
            <el-form-item label="一袋多重(公斤)">
              <el-input-number v-model="form.kg_per_bag" :min="1" class="!w-full giant-stepper" size="large" />
            </el-form-item>
          </div>
          <el-form-item label="当时买的一袋多少钱">
            <el-input-number v-model="form.price_per_bag" :min="0" class="!w-full" size="large" :controls="false" />
          </el-form-item>
        </div>
      </div>

      <!-- 场景 D: 其他 -->
      <div v-if="scene === '其他'" class="space-y-4">
  <!-- 🔴 修复：改用分段切换器样式，解决离得远、一大一小的问题 -->
  <div class="bg-gray-100 p-1 rounded-xl flex items-center h-12 mb-4">
    <button 
      type="button"
      @click="form.type = 'cost'"
      class="flex-1 h-full rounded-lg text-sm font-bold transition-all"
      :class="form.type === 'cost' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'"
    >
      支出 (常用)
    </button>
    <button 
      type="button"
      @click="form.type = 'income'"
      class="flex-1 h-full rounded-lg text-sm font-bold transition-all"
      :class="form.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'"
    >
      额外收入
    </button>
  </div>

  <el-form-item label="做什么用了？">
    <el-input v-model="form.category" placeholder="如：修车、买药" size="large" />
  </el-form-item>
  <el-form-item label="一共多少钱">
    <el-input-number v-model="form.amount" :min="0" class="!w-full giant-stepper" size="large" :controls="false" />
  </el-form-item>
</div>
    </el-form>

    <template #footer>
      <div class="flex gap-4">
        <el-button @click="visible = false" size="large" class="flex-1 rounded-2xl">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submit" size="large" class="flex-1 font-black text-xl rounded-2xl h-14">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { dataService } from '../api/dataService'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const scene = ref('卖奶') 
const loading = ref(false)
const inputMode = ref('total')
const emit = defineEmits(['success'])
const userTemplate = ref([])

const form = reactive({
  date: '', quantity: 1, unit_price: 0, amount: 0, category: '', type: 'cost', duration: 1, weight: 0,
  bags: 0, kg_per_bag: 40, price_per_bag: 0
})

const toNum = (val) => Number(val) || 0
const feedOptions = computed(() => userTemplate.value.filter(item => item.name.includes('草') || item.name.includes('料') || item.name.includes('豆')))
const sceneTitle = computed(() => ({ '卖奶': '刚交了奶', '买饲料': '进饲料', '其他': '记一笔杂费', '录入库存': '家里还有多少料' }[scene.value]))

const calcByUnitPrice = (val) => { form.unit_price = val; if (form.weight > 0) form.amount = Number((form.unit_price * form.weight).toFixed(2)) }
const calcByAmount = (val) => { form.amount = val; if (form.weight > 0) form.unit_price = Number((form.amount / form.weight).toFixed(2)) }
const calcByWeight = (val) => { form.weight = val; if (form.unit_price > 0) form.amount = Number((form.unit_price * form.weight).toFixed(2)); else if (form.amount > 0) form.unit_price = Number((form.amount / form.weight).toFixed(2)) }

const openWithScene = async (s) => {
  scene.value = s
  visible.value = true
  inputMode.value = 'total'
  form.date = new Date().toISOString().slice(0, 10)
  form.weight = 0; form.amount = 0; form.unit_price = 0; form.bags = 0; form.price_per_bag = 0; form.duration = 1; form.quantity = 0

  const { data: { user } } = await supabase.auth.getUser()
  
  if (s === '卖奶') {
    form.category = '驼奶销售'
    // 🔴 核心：记住上一次填写的奶价
    const { data: lastRecord } = await supabase.from('income').select('unit_price, duration').eq('user_id', user.id).eq('category', '驼奶销售').order('date', { ascending: false }).limit(1).maybeSingle()
    const { data: settings } = await supabase.from('settings').select('milk_price, milk_frequency').eq('user_id', user.id).maybeSingle()
    
    form.unit_price = lastRecord?.unit_price || settings?.milk_price || 30
    form.duration = settings?.milk_frequency || 1
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
      let finalWeight = form.weight; let finalUnitPrice = form.unit_price
      if (inputMode.value === 'bag') { finalWeight = (form.bags * form.kg_per_bag) / 1000; finalUnitPrice = form.kg_per_bag > 0 ? (form.price_per_bag / form.kg_per_bag) * 1000 : 0 }
      await dataService.updateInventory({ category: form.category, quantity: finalWeight, unit_price: finalUnitPrice })
    }
    else if (scene.value === '卖奶') {
      const { count } = await supabase.from('income').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', form.date).eq('category', '驼奶销售')
      if (count > 0) throw new Error(`${form.date} 已经记过这笔奶了`)
      await dataService.addIncome({ date: form.date, category: '驼奶销售', quantity: form.quantity, unit_price: form.unit_price, amount: form.quantity * form.unit_price, duration: form.duration })
    } 
    else if (scene.value === '买饲料') {
      const feedName = form.category || '饲料'
      await dataService.addCost({ date: form.date, category: feedName, amount: form.amount, unit_price: form.unit_price, weight: form.weight, cost_type: '库存进货' })
      if (form.weight > 0) await dataService.incrementInventory({ category: feedName, weight: form.weight, unit_price: form.unit_price })
      
      // 🔴 智能保存新饲料到每日模板（如果不存在）
      const { data: currentSet } = await supabase.from('settings').select('daily_template').eq('user_id', user.id).maybeSingle()
      if (currentSet) {
        const tpl = currentSet.daily_template || []
        if (!tpl.some(t => t.name === feedName)) {
          tpl.push({ name: feedName, quantity: 0, unit_price: 0 })
          await supabase.from('settings').update({ daily_template: tpl }).eq('user_id', user.id)
        }
      }
    }
    else {
      const data = { date: form.date, category: form.category, amount: form.amount }
      if (form.type === 'income') await dataService.addIncome(data)
      else await dataService.addCost({ ...data, cost_type: '其他' })
    }
    visible.value = false; emit('success'); ElMessage.success('记好了！')
  } catch (e) { ElMessage.error(e.message) } finally { loading.value = false }
}
defineExpose({ openWithScene })
</script>

<style scoped>
/* 🔴 增大步进器按钮 */
:deep(.giant-stepper .el-input-number__decrease), 
:deep(.giant-stepper .el-input-number__increase) {
  width: 60px !important;
  font-size: 24px !important;
  background: #f8fafc !important;
}
:deep(.giant-stepper .el-input__wrapper) {
  padding-left: 60px !important;
  padding-right: 60px !important;
}
</style>