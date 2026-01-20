import { createClient } from '@supabase/supabase-js'

const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const rawUrl = import.meta.env.VITE_SUPABASE_URL

// 🔴 修改逻辑：增加对手机环境（Capacitor）的判断
// 如果是原生 App 环境（origin 包含 localhost 且不是开发环境）或者直接强制使用原始 URL
const isApp = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor')

const supabaseUrl = (import.meta.env.PROD && !isApp)
  ? (window.location.origin + '/api/supabase') 
  : rawUrl

// 安全检查
if (!supabaseKey || !rawUrl) {
  throw new Error('Supabase 配置未完成，请检查环境变量')
}

export const supabase = createClient(supabaseUrl, supabaseKey)