<template>
  <span>{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { formatNum } from '../utils/format'

const props = defineProps({
  value: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: Number,
    default: 1000 // 动画持续时间 (ms)
  },
  prefix: {
    type: String,
    default: ''
  }
})

const current = ref(0)
const displayValue = computed(() => {
  return props.prefix + formatNum(current.value)
})

let startTime = null
let startValue = 0
let endValue = 0
let animationFrame = null

const easeOutQuart = (x) => {
  return 1 - Math.pow(1 - x, 4)
}

const animate = (timestamp) => {
  if (!startTime) startTime = timestamp
  const progress = timestamp - startTime
  const percentage = Math.min(progress / props.duration, 1)
  
  // 应用缓动函数
  const easedProgress = easeOutQuart(percentage)
  
  current.value = startValue + (endValue - startValue) * easedProgress

  if (percentage < 1) {
    animationFrame = requestAnimationFrame(animate)
  } else {
    current.value = endValue
  }
}

const startAnimation = (newVal, oldVal) => {
  startValue = oldVal
  endValue = newVal
  startTime = null
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(animate)
}

watch(() => props.value, (newVal, oldVal) => {
  startAnimation(newVal, oldVal || 0)
})

onMounted(() => {
  current.value = 0 // 从 0 开始
  startAnimation(props.value, 0)
})
</script>