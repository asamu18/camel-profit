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
    const { data, error } = await supabase.from('cost').insert([{ ...record, user_id }]).select()
    if (error) throw error
    return data
  },

  // 3. 更新记录
  async updateRecord(table, id, updates) {
    const { error } = await supabase.from(table).update(updates).eq('id', id)
    if (error) throw error
    return true
  },

  // 4. 获取历史分类
  async getUniqueCategories(type) {
    const table = type === 'income' ? 'income' : 'cost'
    const { data, error } = await supabase.from(table).select('category')
    if (error) return []
    return [...new Set(data.map(item => item.category))]
  },

  // 5. 按月份获取
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

  // 6. 获取趋势数据
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
  
  // 7. 删除记录
  async deleteRecord(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  },

  // 8. 清空所有数据
  async clearAllUserData() {
    const user_id = await this._getUserId()
    if (!user_id) return
    const promises = [
      supabase.from('income').delete().eq('user_id', user_id),
      supabase.from('cost').delete().eq('user_id', user_id),
      supabase.from('settings').delete().eq('user_id', user_id),
      supabase.from('posts').delete().eq('user_id', user_id),
      supabase.from('inventory').delete().eq('user_id', user_id)
    ]
    const results = await Promise.all(promises)
    const error = results.find(r => r.error)?.error
    if (error) throw error
    localStorage.removeItem('cache_inc')
    localStorage.removeItem('cache_cost')
    localStorage.removeItem('cache_set')
    return true
  },

  // 9. 获取全量账单记录
  async getFullHistory({ page = 0, pageSize = 20, type = 'all', startDate, endDate }) {
    const user_id = await this._getUserId();
    let incQuery = supabase.from('income').select('*', { count: 'exact' }).eq('user_id', user_id);
    let costQuery = supabase.from('cost').select('*', { count: 'exact' }).eq('user_id', user_id);
    if (startDate) {
      incQuery = incQuery.gte('date', startDate);
      costQuery = costQuery.gte('date', startDate);
    }
    if (endDate) {
      incQuery = incQuery.lte('date', endDate);
      costQuery = costQuery.lte('date', endDate);
    }
    const [incRes, costRes] = await Promise.all([incQuery, costQuery]);
    let combined = [
      ...(incRes.data || []).map(x => ({ ...x, isIncome: true })),
      ...(costRes.data || []).map(x => ({ ...x, isIncome: false }))
    ];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    const start = page * pageSize;
    return {
      data: combined.slice(start, start + pageSize),
      total: combined.length,
      hasMore: start + pageSize < combined.length
    };
  },

  // 10. 获取当前库存
  async getInventory() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('inventory').select('*').eq('user_id', user.id)
    if (error) throw error
    return data || []
  },

  // 11. 录入/更新库存
  async updateInventory(record) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('inventory').upsert({
      user_id: user.id,
      category: record.category,
      quantity: record.quantity,
      unit_price: record.unit_price,
      updated_at: new Date()
    }, { onConflict: 'user_id, category' })
    if (error) throw error
    return true
  }
}