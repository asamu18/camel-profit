import { supabase } from '../lib/supabase'

export const dataService = {
  // 1. 新增收入
  async addIncome(record) {
    const { data, error } = await supabase.from('income').insert([record]).select()
    if (error) throw error
    return data
  },

  // 2. 新增成本
  async addCost(record) {
    const { data, error } = await supabase.from('cost').insert([record]).select()
    if (error) throw error
    return data
  },

  // 3. 按月份获取 (修复版：自动计算月底日期)
  async getDataByMonth(monthStr) {
    // monthStr 格式为 "2025-04"
    const [year, month] = monthStr.split('-')
    
    // JS技巧：new Date(year, month, 0) 会自动得到该月的最后一天
    // 这里的 month 是字符串 "04"，直接转数字作为下个月的索引，刚好符合 Date 的逻辑
    const lastDay = new Date(year, month, 0).getDate() 
    
    const startDate = `${monthStr}-01`
    const endDate = `${monthStr}-${lastDay}` // 动态生成 2025-04-30

    const [incomeRes, costRes] = await Promise.all([
      supabase.from('income').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('cost').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false })
    ])

    if (incomeRes.error) throw incomeRes.error
    if (costRes.error) throw costRes.error

    return { income: incomeRes.data, cost: costRes.data }
  },

  // --- NEW: 4. 获取最近 6 个月的趋势数据 ---
  async getTrendData() {
    // 计算6个月前的日期
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    d.setDate(1)
    const startDate = d.toISOString().slice(0, 10) // 格式 2023-05-01

    // 拉取这期间所有的收支
    const [incomeRes, costRes] = await Promise.all([
      supabase.from('income').select('date, amount').gte('date', startDate),
      supabase.from('cost').select('date, amount').gte('date', startDate)
    ])
    
    return { income: incomeRes.data, cost: costRes.data }
  }
}