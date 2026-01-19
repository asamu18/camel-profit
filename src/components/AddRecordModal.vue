<template>
  <el-dialog
    v-model="visible"
    title="新增记账"
    width="90%" 
    style="max-width: 500px;" 
    center
    destroy-on-close
    @open="loadCategories" 
  >
    <el-form :model="form" label-width="80px">
      <!-- 1. 收支类型 -->
      <el-form-item label="类型">
        <el-radio-group v-model="form.type" @change="handleTypeChange">
          <el-radio-button label="income">收入</el-radio-button>
          <el-radio-button label="cost">成本</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 2. 分类 (支持自定义) -->
      <el-form-item label="分类">
        <el-select
          v-model="form.category"
          placeholder="选择或输入新分类"
          style="width: 100%"
          filterable
          allow-create
          default-first-option
          @change="autoFillCostType"
        >
          <el-option
            v-for="opt in dynamicOptions"
            :key="opt"
            :label="opt"
            :value="opt"
          />
        </el-select>
      </el-form-item>

      <!-- 3. 数量 & 单价 (收入和成本现在共用此逻辑) -->
      <div class="bg-gray-50 p-4 rounded mb-4">
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" @change="calculateAmount" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.unit_price" :min="0" :precision="2" style="width: 100%" @change="calculateAmount" />
        </el-form-item>
        <div class="text-right text-gray-500 text-sm mt-2">
          {{ form.type === 'income' ? '预计收入' : '预计支出' }}: 
          <span :class="form.type === 'income' ? 'text-green-600' : 'text-orange-600'" class="font-bold text-lg">
            ¥ {{ form.amount.toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- 4. 成本特有：属性 -->
      <div v-if="form.type === 'cost'">
        <el-form-item label="属性">
          <el-radio-group v-model="form.cost_type">
             <el-radio label="变动成本">变动成本 (饲料/药)</el-radio>
             <el-radio label="固定成本">固定成本 (租金/设备)</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <el-form-item label="日期">
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          :clearable="false"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm">
          确认录入
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataService } from '../api/dataService'

// 基础预设 (作为兜底)
const defaultIncomeOpts = ['驼奶销售', '种驼交易', '观光门票']
const defaultCostOpts = ['饲料', '医疗', '水电', '工资', '租金']

const visible = ref(false)
const loading = ref(false)
const userCategories = ref([]) // 用户历史分类
const emit = defineEmits(['success'])

const form = reactive({
  type: 'income',
  category: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  cost_type: '变动成本',
  date: new Date().toISOString().slice(0, 10)
})

// 动态合并预设和用户历史分类
const dynamicOptions = computed(() => {
  const defaults = form.type === 'income' ? defaultIncomeOpts : defaultCostOpts
  // 合并并去重
  return [...new Set([...defaults, ...userCategories.value])]
})

// 加载历史分类
const loadCategories = async () => {
  userCategories.value = await dataService.getUniqueCategories(form.type)
}

const open = () => {
  visible.value = true
  form.category = ''
  form.quantity = 1
  form.unit_price = 0
  form.amount = 0
}

const handleTypeChange = () => {
  form.category = ''
  loadCategories() // 切换类型时重新加载分类
}

const calculateAmount = () => {
  form.amount = form.quantity * form.unit_price
}

const autoFillCostType = (val) => {
  // 简单的自动判断逻辑，如果包含特定关键词
  if (['租金', '折旧', '固定'].some(k => val.includes(k))) {
    form.cost_type = '固定成本'
  } else {
    form.cost_type = '变动成本'
  }
}

const submitForm = async () => {
  if (!form.category) return ElMessage.warning('请选择或输入分类')
  
  loading.value = true
  try {
    const baseData = {
      date: form.date,
      category: form.category,
      quantity: form.quantity,
      unit_price: form.unit_price,
      amount: form.amount
    }

    if (form.type === 'income') {
      await dataService.addIncome(baseData)
    } else {
      baseData.cost_type = form.cost_type
      await dataService.addCost(baseData)
    }

    ElMessage.success('录入成功')
    visible.value = false
    emit('success')
  } catch (error) {
    console.error(error)
    ElMessage.error('录入失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>