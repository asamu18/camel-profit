
/**
 * 格式化金额，保留千分位
 * @param {number|string} n - 要格式化的数字
 * @returns {string} - 格式化后的字符串 (e.g. "1,234")
 */
export const formatNum = (n) => {
  if (n === null || n === undefined) return '0'
  const rounded = Math.round(Number(n))
  // 即使是负数，toLocaleString 默认也会带负号，但之前可能因为 Math.abs 移除了
  // 修改为：如果是负数，手动保留负号
  return rounded.toLocaleString('en-US')
}

/**
 * 格式化日期为中文格式
 * @param {string|Date} dateStr 
 * @returns {string} (e.g. "2024年1月1日")
 */
export const formatDateCN = (dateStr) => {
  if (!dateStr) return '请选择日期'
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
