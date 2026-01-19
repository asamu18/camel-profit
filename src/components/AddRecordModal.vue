<template>
  <el-dialog v-model="visible" :title="sceneTitle" width="90%" style="max-width: 500px;" center destroy-on-close>
    
    <el-form :model="form" label-position="top">
      
      <!-- 场景 A: 卖奶 (保持不变) -->
      <div v-if="scene === '卖奶'">
        <!-- ... 原有卖奶代码保持不变 ... -->
         <el-form-item label="日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
        </el-form-item>
        <div class="flex gap-4">
          <el-form-item label="数量 (公斤)" class="flex-1">
            <el-input-number v-model="form.quantity" :min="1" style="width: 100%" size="large" />
          </el-form-item>
          <el-form-item label="单价 (元/公斤)" class="flex-1">
            <el-input-number v-model="form.unit_price" :min="0.1" :precision="2" style="width: 100%" size="large" />
          </el-form-item>
        </div>
        <div class="bg-blue-50 p-3 rounded text-center text-blue-800 font-bold mb-4">
          总收入: ¥ {{ (form.quantity * form.unit_price).toFixed(2) }}
        </div>
      </div>

      <!-- 🔴 场景 B: 进大车饲料 (重写) 🔴 -->
      <div v-if="scene === '买饲料'">
        <div class="bg-green-50 p-3 rounded-lg mb-4 text-xs text-green-800 border border-green-200">
          <el-icon><InfoFilled /></el-icon> 
          系统会根据您的初始化模板，自动计算这车饲料能吃多久。
        </div>

        <el-form-item label="进货日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large"/>
        </el-form-item>
        
        <!-- 1. 选择饲料 (从模板里读，方便计算) -->
        <el-form-item label="饲料名称 (选择或输入)">
           <el-select 
             v-model="form.category" 
             filterable 
             allow-create 
             default-first-option
             placeholder="请选择" 
             size="large"
             style="width: 100%"
             @change="calculateDuration"
           >
             <el-option 
               v-for="item in feedOptions" 
               :key="item.name" 
               :label="item.name" 
               :value="item.name" 
             />
           </el-select>
        </el-form-item>

        <!-- 2. 金额与重量 -->
        <div class="flex gap-3">
          <el-form-item label="总金额 (元)" class="flex-1">
            <el-input-number v-model="form.amount" :min="0" style="width: 100%" size="large" @change="calculateDuration" />
          </el-form-item>
          <el-form-item label="总重量 (吨)" class="flex-1">
            <el-input-number v-model="form.weight" :min="0" :precision="2" style="width: 100%" size="large" />
          </el-form-item>
        </div>

        <!-- 3. 智能计算结果 -->
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div class="text-xs text-gray-500 mb-2">库存预估 (自动计算)</div>
          
          <div v-if="dailyUsageInfo" class="flex justify-between items-center mb-2 text-sm">
             <span>日消耗标准:</span>
             <span class="font-bold">¥{{ dailyUsageInfo.cost }}/天 ({{ dailyUsageInfo.weight }}kg)</span>
          </div>

          <el-form-item label="预计可用天数" class="mb-0">
             <el-slider v-model="form.duration" :min="1" :max="365" show-input />
          </el-form-item>
          <div class="text-right text-xs text-orange-500 mt-1" v-if="form.duration > 0">
            约 {{ (form.duration/30).toFixed(1) }} 个月
          </div>
        </div>
      </div>

      <!-- 场景 C: 骆驼交易 (保持不变) -->
      <div v-if="scene === '骆驼交易'">
        <el-tabs type="card" v-model="camelType">
          <el-tab-pane label="卖骆驼 (收入)" name="sell"></el-tab-pane>
          <el-tab-pane label="买骆驼 (支出)" name="buy"></el-tab-pane>
        </el-tabs>
        <el-form-item label="交易日期">
           <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large" />
        </el-form-item>
        <el-form-item label="数量 (头/峰)">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" size="large" />
        </el-form-item>
        <el-form-item label="总金额 (元)">
          <el-input-number v-model="form.amount" :min="0" style="width: 100%" size="large" />
        </el-form-item>
      </div>

      <!-- 场景 D: 其他 (保持不变) -->
      <div v-if="scene === '其他'">
        <el-radio-group v-model="form.type" class="mb-4">
          <el-radio-button label="income">收入</el-radio-button>
          <el-radio-button label="cost">支出</el-radio-button>
        </el-radio-group>
        <el-form-item label="项目名称">
          <el-input v-model="form.category" placeholder="如：兽药、水电费" size="large" />
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
      <el-button type="primary" :loading="loading" @click="submit" size="large" class="w-32">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { dataService } from '../api/dataService'
import { supabase } from '../lib/supabase' // 引入 supabase
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

const visible = ref(false)
const scene = ref('卖奶') 
const loading = ref(false)
const camelType = ref('sell') 
const emit = defineEmits(['success'])

// 存储用户的设置模板，用于计算饲料消耗
const userTemplate = ref([])

const form = reactive({
  date: '', quantity: 1, unit_price: 30, amount: 0, category: '', type: 'income', duration: 30, weight: 0
})

// 过滤出模板里的饲料选项
const feedOptions = computed(() => {
  return userTemplate.value.filter(item => 
    item.name.includes('草') || 
    item.name.includes('料') || 
    item.name.includes('豆') || 
    item.name.includes('玉米')
  )
})

// 当前选中的饲料的日消耗信息
const dailyUsageInfo = computed(() => {
  if (scene.value !== '买饲料' || !form.category) return null
  const tplItem = userTemplate.value.find(i => i.name === form.category)
  if (!tplItem) return null
  return {
    cost: (tplItem.quantity * tplItem.unit_price).toFixed(0),
    weight: tplItem.quantity // 假设模板里的 quantity 就是每天喂的公斤数/单位数
  }
})

const sceneTitle = computed(() => {
  return { '卖奶': '今日卖奶', '买饲料': '进大车饲料', '骆驼交易': '骆驼买卖', '其他': '记一笔' }[scene.value]
})

// 打开弹窗时，先去拉取最新的设置，为了计算准
const openWithScene = async (s) => {
  scene.value = s
  visible.value = true
  
  // 重置表单
  form.date = new Date().toISOString().slice(0, 10)
  form.amount = 0
  form.quantity = 1
  form.duration = 30 
  form.weight = 0
  form.category = ''

  if (s === '卖奶') {
    form.category = '驼奶销售'
    // 这里可以优化：去读 herdSize 里的默认奶价，暂略
    form.unit_price = 30 
  }

  // 🔴 关键：拉取用户模板 🔴
  if (s === '买饲料') {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('settings').select('daily_template').eq('user_id', user.id).single()
    if (data && data.daily_template) {
      userTemplate.value = data.daily_template
    }
  }
}

// 自动计算持续天数
const calculateDuration = () => {
  if (!dailyUsageInfo.value || form.amount <= 0) return
  
  const dailyCost = Number(dailyUsageInfo.value.cost)
  if (dailyCost > 0) {
    // 总金额 / 每天消耗金额 = 能吃几天
    const days = Math.round(form.amount / dailyCost)
    form.duration = days > 0 ? days : 1
  }
}

const submit = async () => {
  loading.value = true
  try {
    if (scene.value === '卖奶') {
      await dataService.addIncome({
        date: form.date, category: '驼奶销售', 
        quantity: form.quantity, unit_price: form.unit_price, 
        amount: form.quantity * form.unit_price
      })
    } 
    else if (scene.value === '买饲料') {
      if (!form.category) form.category = '未知饲料'
      await dataService.addCost({
        date: form.date, 
        category: form.category, 
        amount: form.amount, 
        weight: form.weight, // 记录重量
        cost_type: '库存进货', // 标记类型
        duration: form.duration // 存入可用天数 (影响进度条)
      })
    }
    else if (scene.value === '骆驼交易') {
      const isSell = camelType.value === 'sell'
      const data = {
        date: form.date, category: isSell ? '卖骆驼' : '买骆驼',
        quantity: form.quantity, amount: form.amount
      }
      if (isSell) await dataService.addIncome(data)
      else await dataService.addCost({ ...data, cost_type: '固定成本' })
    }
    else {
      // 其他
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