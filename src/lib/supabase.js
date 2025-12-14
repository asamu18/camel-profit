import { createClient } from '@supabase/supabase-js'

const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const rawUrl = import.meta.env.VITE_SUPABASE_URL

// 判断：如果是生产环境(线上)，就用代理路径；如果是本地，就用原始URL
const supabaseUrl = import.meta.env.PROD 
  ? '/api/supabase' 
  : rawUrl

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase 变量未配置')
}

export const supabase = createClient(supabaseUrl, supabaseKey)