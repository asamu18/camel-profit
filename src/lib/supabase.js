import { createClient } from '@supabase/supabase-js'

const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const rawUrl = import.meta.env.VITE_SUPABASE_URL

// 核心逻辑：
// 1. 如果是生产环境 (PROD)，使用当前网站域名 + /api/supabase 作为代理地址
// 2. 如果是本地开发，直接使用原始 URL
const supabaseUrl = import.meta.env.PROD 
  ? (window.location.origin + '/api/supabase') 
  : rawUrl

// 安全检查
if (!supabaseKey) {
  throw new Error('Supabase Key 未配置')
}

export const supabase = createClient(supabaseUrl, supabaseKey)