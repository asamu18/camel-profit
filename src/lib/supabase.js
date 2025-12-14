import { createClient } from '@supabase/supabase-js'

// 必须直接读取环境变量，不能有任何 /api/supabase 的逻辑
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('变量未读取到')
}

export const supabase = createClient(supabaseUrl, supabaseKey)