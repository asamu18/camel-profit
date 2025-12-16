<template>
  <el-dialog
    v-model="visible"
    title="新增记账"
    width="90%" 
    style="max-width: 500px;" 
    center
    destroy-on-close
  >
    <el-form :model="form" label-width="80px">
      <!-- 1. 收支类型切换 -->
      <el-form-item label="类型">
        <el-radio-group v-model="form.type" @change="handleTypeChange">
          <el-radio-button label="income">收入 (如驼奶)</el-radio-button>
          <el-radio-button label="cost">成本 (如饲料)</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 2. 具体分类 (根据类型动态变) -->
      <el-form-item label="分类">
        <el-select
          v-model="form.category"
          placeholder="请选择"
          style="width: 100%"
          @change="autoFillCostType"
        >
          <el-option
            v-for="opt in currentOptions"
            :key="opt"
            :label="opt"
            :value="opt"
          />
        </el-select>
      </el-form-item>

      <!-- 3. 收入特有字段：数量 x 单价 -->
      <div v-if="form.type === 'income'" class="bg-gray-50 p-4 rounded mb-4">
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.unit_price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <div class="text-right text-gray-500 text-sm mt-2">
          预计收入: <span class="text-green-600 font-bold text-lg">¥ {{ (form.quantity * form.unit_price).toFixed(2) }}</span>
        </div>
      </div>

      <!-- 4. 成本特有字段：属性 + 总额 -->
      <div v-if="form.type === 'cost'">
        <el-form-item label="属性">
          <el-tag :type="form.cost_type === '固定成本' ? 'info' : 'warning'">
            {{ form.cost_type || '请选择分类' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="总金额">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
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
import { dataService } from '../api/dataService' // 引入昨天的API

// --- 1. 字典定义 ---
const incomeOptions = ['驼奶销售', '种驼交易', '观光门票', '其他']
const costOptions = ['饲料', '医疗', '水电', '工资', '租金', '设备折旧']
const costMap = {
  '饲料': '变动成本', '医疗': '变动成本', '水电': '变动成本',
  '工资': '变动成本', '租金': '固定成本', '设备折旧': '固定成本'
}

// --- 2. 状态定义 ---
const visible = ref(false)
const loading = ref(false)
const emit = defineEmits(['success']) // 定义成功事件，通知父组件刷新

const form = reactive({
  type: 'income',
  category: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  cost_type: '',
  date: new Date().toISOString().slice(0, 10)
})

// --- 3. 计算属性 ---
const currentOptions = computed(() => form.type === 'income' ? incomeOptions : costOptions)

// --- 4. 逻辑方法 ---
const open = () => {
  visible.value = true
  // 重置部分数据，保留日期
  form.category = ''
  form.amount = 0
}

const handleTypeChange = () => {
  form.category = ''
  form.amount = 0
  form.cost_type = ''
}

// 自动填充成本属性（演示亮点）
const autoFillCostType = () => {
  if (form.type === 'cost') {
    form.cost_type = costMap[form.category] || '变动成本'
  }
}

const submitForm = async () => {
  if (!form.category) return ElMessage.warning('请选择分类')
  
  loading.value = true
  try {
    // 准备数据对象
    const baseData = {
      date: form.date,
      category: form.category,
      amount: form.amount
    }

    if (form.type === 'income') {
      // 收入：计算总额
      baseData.quantity = form.quantity
      baseData.unit_price = form.unit_price
      baseData.amount = form.quantity * form.unit_price // 核心：计算后入库
      await dataService.addIncome(baseData)
    } else {
      // 成本：带上cost_type
      baseData.cost_type = form.cost_type
      await dataService.addCost(baseData)
    }

    ElMessage.success('录入成功！')
    visible.value = false
    emit('success') // 核心：告诉父组件“我存好了，快刷新”
  } catch (error) {
    console.error(error)
    ElMessage.error('录入失败，请查看控制台')
  } finally {
    loading.value = false
  }
}

// 暴露 open 方法给父组件调用
defineExpose({ open })
</script>