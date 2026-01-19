import { supabase } from '../lib/supabase'

export const dataService = {
  // 获取当前用户ID
  async _getUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  },

  // 1. 新增收入 (自动带入 user_id)
  async addIncome(record) {
    const user_id = await this._getUserId()
    const { data, error } = await supabase.from('income').insert([{ ...record, user_id }]).select()
    if (error) throw error
    return data
  },

  // 2. 新增成本 (支持数量、单价，自动带入 user_id)
  async addCost(record) {
    const user_id = await this._getUserId()
    // record 应该包含 quantity, unit_price, cost_type, category, amount, date
    const { data, error } = await supabase.from('cost').insert([{ ...record, user_id }]).select()
    if (error) throw error
    return data
  },

  // 3. 更新记录 (NEW: 用于行内编辑)
  async updateRecord(table, id, updates) {
    // table: 'income' 或 'cost'
    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // 4. 获取历史分类 (NEW: 用于自定义分类下拉提示)
  async getUniqueCategories(type) {
    const table = type === 'income' ? 'income' : 'cost'
    // 获取当前用户该表下所有的分类，用于前端去重
    const { data, error } = await supabase.from(table).select('category')
    if (error) return []
    // 简单的去重逻辑
    return [...new Set(data.map(item => item.category))]
  },

  // 5. 按月份获取 (保持不变)
  async getDataByMonth(monthStr) {
    const [year, month] = monthStr.split('-')
    const lastDay = new Date(year, month, 0).getDate() 
    const startDate = `${monthStr}-01`
    const endDate = `${monthStr}-${lastDay}`

    const [incomeRes, costRes] = await Promise.all([
      supabase.from('income').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('cost').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false })
    ])

    if (incomeRes.error) throw incomeRes.error
    if (costRes.error) throw costRes.error

    return { income: incomeRes.data, cost: costRes.data }
  },

  // 6. 获取趋势数据 (保持不变)
  async getTrendData() {
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    d.setDate(1)
    const startDate = d.toISOString().slice(0, 10)

    const [incomeRes, costRes] = await Promise.all([
      supabase.from('income').select('date, amount').gte('date', startDate),
      supabase.from('cost').select('date, amount').gte('date', startDate)
    ])
    
    return { income: incomeRes.data, cost: costRes.data }
  },
  
  // 7. 删除记录 (保持不变)
  async deleteRecord(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  }
}