<template>
  <el-dialog v-model="visible" :title="isCreateMode ? '确认/修改支出' : '修改账单'" width="90%" style="max-width: 400px;" center destroy-on-close>
    
    <el-form label-position="top">
      
      <!-- 1. 基本信息 -->
      <el-form-item label="项目名称">
        <el-input v-model="form.category" size="large" />
      </el-form-item>
      
      <!-- 2. 金额修改 -->
      <div class="flex gap-3">
        <el-form-item label="单价" class="flex-1">
          <el-input-number v-model="form.unit_price" :min="0" style="width: 100%" :controls="false" size="large" @change="calcTotal" />
        </el-form-item>
        <el-form-item label="数量" class="flex-1">
          <el-input-number v-model="form.quantity" :min="0" style="width: 100%" :controls="false" size="large" @change="calcTotal" />
        </el-form-item>
      </div>

      <el-form-item label="总金额 (元)">
        <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" size="large" />
      </el-form-item>

      <!-- 3. 日期修改 -->
      <el-form-item label="日期">
        <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" size="large" />
      </el-form-item>

      <div v-if="form.weight > 0">
        <el-form-item label="重量 (吨)">
          <el-input-number v-model="form.weight" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </div>

    </el-form>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- 只有已存在的记录才能删除 -->
        <el-button v-if="!isCreateMode" type="danger" link @click="handleDelete" :loading="loading">删除此条</el-button>
        <span v-else></span> <!-- 占位符 -->
        
        <div>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="loading">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { dataService } from '../api/dataService'
import { supabase } from '../lib/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const visible = ref(false)
const loading = ref(false)
const emit = defineEmits(['refresh'])

const currentRow = ref(null) 
const form = reactive({ category: '', amount: 0, date: '', quantity: 0, weight: 0, unit_price: 0 })

// 判断模式：有没有 ID？无 ID 则是从模板点击进来的“创建模式”
const isCreateMode = computed(() => !currentRow.value?.id)

const open = (row) => {
  currentRow.value = row
  // 初始化表单
  form.category = row.category
  form.amount = row.amount
  form.date = row.date || new Date().toISOString().slice(0, 10)
  form.quantity = row.quantity || 1
  form.unit_price = row.unit_price || row.amount // 如果没有单价，暂时用总价代替
  form.weight = row.weight || 0
  
  visible.value = true
}

const calcTotal = () => {
  form.amount = form.quantity * form.unit_price
}

const handleSave = async () => {
  loading.value = true
  try {
    const table = 'cost' // 这里主要是支出编辑，如果是收入逻辑要单独判断，但目前主要是改成本
    
    if (isCreateMode.value) {
      // --- 新增模式 (从模板转实账) ---
      const { data: { user } } = await supabase.auth.getUser()
      const record = {
        user_id: user.id,
        date: form.date,
        category: form.category,
        quantity: form.quantity,
        unit_price: form.unit_price,
        amount: form.amount,
        weight: form.weight,
        cost_type: currentRow.value.cost_type || '日常支出'
      }
      await dataService.addCost(record)
      ElMessage.success('已入账')
    } else {
      // --- 更新模式 ---
      await dataService.updateRecord(table, currentRow.value.id, {
        category: form.category,
        amount: form.amount,
        date: form.date,
        quantity: form.quantity,
        unit_price: form.unit_price,
        weight: form.weight
      })
      ElMessage.success('修改成功')
    }

    visible.value = false
    emit('refresh')
  } catch (e) {
    console.error(e)
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = () => {
  ElMessageBox.confirm('确定要删除这条记录吗？', '警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    try {
      await dataService.deleteRecord('cost', currentRow.value.id)
      ElMessage.success('删除成功')
      visible.value = false
      emit('refresh')
    } catch (e) {
      ElMessage.error('删除失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

defineExpose({ open })
</script>