const request = require('../utils/request')

// 账单存储相关的常量
const BILL_STORAGE_KEY = 'ACCOUNTING_BILLS'
const LAST_SYNC_TIME_KEY = 'BILL_LAST_SYNC_TIME'

const billStorage = {
  // 获取月账单
  async getMonthlyBills(year, month) {
    try {
      const response = await request.get(`/bills/monthly/${year}/${month}`)
      return response || {
        bills: [],
        stats: { income: 0, expense: 0, balance: 0 },
        categories: {
          income: { total: 0, items: [] },
          expense: { total: 0, items: [] }
        }
      }
    } catch (error) {
      console.error('获取月账单失败:', error)
      return {
        bills: [],
        stats: { income: 0, expense: 0, balance: 0 },
        categories: {
          income: { total: 0, items: [] },
          expense: { total: 0, items: [] }
        }
      }
    }
  },

  // 获取日账单
  async getDailyBills(date) {
    try {
      // 确保日期格式为 YYYY-MM-DD
      const formattedDate = date instanceof Date ? 
        date.toISOString().split('T')[0] : 
        date

      const response = await request.get(`/bills/daily/${formattedDate}`)
      return response || { bills: [], stats: { income: 0, expense: 0, balance: 0 } }
    } catch (error) {
      console.error('获取日账单失败:', error)
      return { bills: [], stats: { income: 0, expense: 0, balance: 0 } }
    }
  },

  // 添加账单
  async addBill(billData) {
    try {
      // 构造符合API要求的请求数据
      const requestData = {
        amount: Number(billData.amount),
        category: billData.category,
        type: billData.type,
        date: billData.date instanceof Date ? 
          billData.date.toISOString().split('T')[0] : 
          billData.date,
        description: billData.remark || ''  // 将remark字段映射为description
      }

      const response = await request.post('/bills', requestData)
      return response
    } catch (error) {
      console.error('添加账单失败:', error)
      throw error
    }
  },

  // 获取月度统计数据
  async getMonthlyStats(year, month) {
    try {
      const response = await request.get(`/bills/stats/${year}/${month}`)
      return response || { daily: [] }
    } catch (error) {
      console.error('获取月度统计失败:', error)
      return { daily: [] }
    }
  }
}

module.exports = {
  billStorage
} 