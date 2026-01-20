<template>
  <el-dialog v-model="visible" title="智能识别导入" width="95%" style="max-width: 500px;" center destroy-on-close>
    
    <div class="space-y-4">
      <div class="bg-blue-50 p-3 rounded-lg text-[11px] text-blue-700 leading-relaxed border border-blue-100">
        <p class="font-bold mb-1 text-xs">🚀 极速模式：粘贴即可，系统自动计算跨度</p>
        <p>系统会根据您粘贴的日期范围自动平摊利润，历史记录将保持原始数据不变。</p>
      </div>

      <!-- 输入框 -->
      <el-input
        v-model="rawText"
        type="textarea"
        :rows="10"
        placeholder="请在此粘贴交奶记录，例如：
1月1号 交奶50kg 价格30
1月5号 交奶48kg 价格30
..."
        @input="parseText"
      />

      <!-- 识别预览 -->
      <div v-if="parsedRecords.length > 0" class="space-y-2 animate-in fade-in">
        <div class="flex justify-between items-end">
          <p class="text-xs font-bold text-gray-500">识别预览 ({{ parsedRecords.length }}笔)</p>
          <div class="text-right">
            <p class="text-[10px] text-orange-500">自动识别跨度: {{ autoSpan }} 天</p>
            <p class="text-xs font-black text-emerald-600">总额: ¥{{ totalParsedAmount }}</p>
          </div>
        </div>
        
        <div class="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-2 bg-gray-50">
          <div v-for="(item, idx) in parsedRecords" :key="idx" class="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-gray-800">{{ item.date }}</div>
              <div class="text-gray-400 mt-0.5">{{ item.quantity }}kg × ¥{{ item.unit_price }}</div>
            </div>
            <div class="text-right">
              <div class="font-black text-emerald-600">¥{{ (item.amount).toLocaleString() }}</div>
              <div class="text-[9px] text-blue-400">计入 {{ item.duration }} 天份额</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <el-button @click="visible = false" class="flex-1">取消</el-button>
        <el-button 
          type="primary" 
          :loading="loading" 
          :disabled="parsedRecords.length === 0" 
          class="flex-1 font-bold h-12" 
          @click="submitImport"
        >
          立即录入真实账单
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const rawText = ref('')
const loading = ref(false)
const parsedRecords = ref([])
const autoSpan = ref(0) // 自动识别的总天数跨度

const emit = defineEmits(['success'])

const totalParsedAmount = computed(() => {
  return parsedRecords.value.reduce((s, r) => s + r.amount, 0).toLocaleString()
})

const open = () => {
  visible.value = true
  rawText.value = ''
  parsedRecords.value = []
  autoSpan.value = 0
}

const parseText = async () => {
  const lines = rawText.value.split('\n').filter(l => l.trim())
  const results = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')

  lines.forEach(line => {
    let date = ''
    const dateMatch = line.match(/(\d{4}[-/年])?(\d{1,2})[-/月](\d{1,2})[号日]?/)
    if (dateMatch) {
      const y = dateMatch[1] ? dateMatch[1].replace(/[年/-]/, '') : currentYear
      const m = dateMatch[2].padStart(2, '0')
      const d = dateMatch[3].padStart(2, '0')
      date = `${y}-${m}-${d}`
    } else {
      const dayMatch = line.match(/(\d{1,2})[号日]/)
      if (dayMatch) date = `${currentYear}-${currentMonth}-${dayMatch[1].padStart(2, '0')}`
      else date = now.toISOString().slice(0, 10)
    }

    let quantity = 0
    const qtyMatch = line.match(/(\d+(\.\d+)?)\s*(kg|公斤|k|斤)/i) || line.match(/(交奶|数量)\s*(\d+(\.\d+)?)/)
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1] || qtyMatch[2])
      if (line.includes('斤') && !line.includes('公斤')) quantity = quantity / 2 
    }

    let unitPrice = 0
    const priceMatch = line.match(/(单价|价格|每公斤|元\/kg)\s*(\d+(\.\d+)?)/) || line.match(/(\d+(\.\d+)?)\s*(元|块)/)
    if (priceMatch) {
      unitPrice = parseFloat(priceMatch[2] || priceMatch[1])
    }

    if (quantity > 0 && unitPrice > 0) {
      results.push({ date, quantity, unit_price: unitPrice, amount: quantity * unitPrice, duration: 1 })
    }
  })

  if (results.length > 0) {
    // 🔴 智能跨度计算逻辑
    results.sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(results[0].date)
    const lastDate = new Date(results[results.length - 1].date)
    const diffTime = Math.abs(lastDate - firstDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    
    autoSpan.value = diffDays

    // 如果只有一条记录，读设置里的频率
    if (results.length === 1) {
      const { data } = await supabase.from('settings').select('milk_frequency').maybeSingle()
      results[0].duration = data?.milk_frequency || 1
      autoSpan.value = results[0].duration
    } else {
      // 多条记录，将总跨度平均分配到每一笔上，确保 Dashboard 的 totalDaysCovered 总和等于跨度
      const perDuration = Math.max(1, Math.floor(diffDays / results.length))
      results.forEach((r, idx) => {
        // 最后一条记录补齐余数
        if (idx === results.length - 1) r.duration = diffDays - (perDuration * (results.length - 1))
        else r.duration = perDuration
      })
    }
  }

  parsedRecords.value = results
}

const submitImport = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const finalData = parsedRecords.value.map(r => ({
      ...r,
      user_id: user.id,
      category: '驼奶销售'
    }))

    const { error } = await supabase.from('income').insert(finalData)
    if (error) throw error

    ElMessage.success(`导入成功，已识别日期跨度 ${autoSpan.value} 天`)
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error('导入失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

const removeRecord = (idx) => {
  parsedRecords.value.splice(idx, 1)
}

defineExpose({ open })
</script>