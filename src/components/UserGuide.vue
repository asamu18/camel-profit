<template>
  <Teleport to="body">
    <div v-if="active" class="fixed inset-0 z-[2147483647] pointer-events-none">
      <!-- 黑色遮罩底层 -->
      <div class="absolute inset-0 bg-transparent pointer-events-auto" @click.stop></div>

      <!-- 高亮挖孔区 -->
      <div 
        class="absolute transition-all duration-300 bg-transparent border-4 border-dashed border-yellow-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
        :style="highlightStyle"
      ></div>

      <!-- 指引文字卡片 -->
      <div 
        class="absolute left-6 right-6 bg-white rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-10"
        :style="cardPosition"
      >
        <div class="flex items-start gap-4">
          <div class="text-4xl">🐫</div>
          <div class="flex-1">
            <h4 class="font-black text-gray-800 text-xl mb-2">{{ currentStepData.title }}</h4>
            <p class="text-gray-600 text-base leading-relaxed font-bold">{{ currentStepData.content }}</p>
          </div>
        </div>
        
        <div class="mt-8 flex gap-4">
          <el-button v-if="showPrev" @click="prev" size="large" class="flex-1 !rounded-2xl h-14 font-bold">上一步</el-button>
          <el-button type="primary" @click="next" size="large" class="flex-1 !rounded-2xl h-14 font-black text-lg">
            {{ isLast ? '结束指引' : '下一步' }}
          </el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  steps: { type: Array, default: () => [] }
})

const emit = defineEmits(['finish'])

const active = ref(false)
const currentIndex = ref(0)
const highlightStyle = ref({ top: 0, left: 0, width: 0, height: 0 })
const cardPosition = ref({ bottom: '10%' })

const currentStepData = computed(() => props.steps[currentIndex.value] || {})
const showPrev = computed(() => currentIndex.value > 0)
const isLast = computed(() => currentIndex.value === props.steps.length - 1)

const updateHighlight = async () => {
  await nextTick()
  
  const step = currentStepData.value
  const targetIds = Array.isArray(step.targetId) ? step.targetId : [step.targetId]
  
  // 延迟执行，确保弹窗等动画完成且元素已渲染
  setTimeout(() => {
    const els = targetIds.map(id => document.getElementById(id)).filter(Boolean)
    
    if (els.length > 0) {
      // 滚动到第一个元素
      els[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      
      // 再次延迟以等待滚动完成，然后计算位置
      setTimeout(() => {
        // 计算所有元素的并集区域
        let minTop = Infinity, minLeft = Infinity, maxBottom = -Infinity, maxRight = -Infinity
        
        els.forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.top < minTop) minTop = r.top
          if (r.left < minLeft) minLeft = r.left
          if (r.bottom > maxBottom) maxBottom = r.bottom
          if (r.right > maxRight) maxRight = r.right
        })
        
        const width = maxRight - minLeft
        const height = maxBottom - minTop
        const rect = { top: minTop, left: minLeft, width, height, bottom: maxBottom }

        const padding = 5
        const viewportHeight = window.innerHeight
        
        // 1. 更新高亮框位置
        // 限制高亮框最大高度不超过视口高度，避免大元素导致高亮框过大
        const maxH = viewportHeight - 40
        const finalHeight = Math.min(rect.height + padding * 2, maxH)
        // 如果元素高度超过视口，调整 top 确保高亮框居中或在视口内
        let finalTop = rect.top - padding
        if (rect.height > maxH) {
          // 对于超大元素，让高亮框在视口居中
          finalTop = (viewportHeight - finalHeight) / 2
        }

        highlightStyle.value = {
          top: `${finalTop}px`,
          left: `${rect.left - padding}px`,
          width: `${rect.width + padding * 2}px`,
          height: `${finalHeight}px`
        }
        
        // 2. 优化描述卡片位置计算（解决位置不精准问题）
        // 如果目标元素过高（超过屏幕 60%），强制卡片显示在底部，避免计算出的位置跑出屏幕
        if (rect.height > viewportHeight * 0.6) {
          cardPosition.value = { 
            bottom: '40px', 
            top: 'auto' 
          }
        } else {
          // 判断目标在屏幕的上半部还是下半部，并留出至少 20px 的安全间距
          if (rect.top > viewportHeight / 2) {
            // 目标在下半部分，卡片显示在上方
            cardPosition.value = { 
              bottom: `${viewportHeight - rect.top + 20}px`,
              top: 'auto'
            }
          } else {
            // 目标在上半部分，卡片显示在下方
            cardPosition.value = { 
              top: `${rect.bottom + 20}px`,
              bottom: 'auto'
            }
          }
        }
      }, 300)
    }
  }, 300)
}

const start = async () => {
  currentIndex.value = 0
  active.value = true
  
  const step = props.steps[0]
  if (step && typeof step.onEnter === 'function') {
    await step.onEnter()
  }

  updateHighlight()
}

const next = async () => {
  if (isLast.value) {
    active.value = false
    emit('finish')
  } else {
    currentIndex.value++
    
    const step = props.steps[currentIndex.value]
    if (step && typeof step.onEnter === 'function') {
      await step.onEnter()
    }

    updateHighlight()
  }
}

const prev = async () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    
    const step = props.steps[currentIndex.value]
    if (step && typeof step.onEnter === 'function') {
      await step.onEnter()
    }

    updateHighlight()
  }
}

defineExpose({ start })
</script>