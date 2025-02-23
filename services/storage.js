const BILL_KEY = 'BILL_LIST'
const CATEGORY_KEY = 'CATEGORY_LIST'
const request = require('../utils/request')

// 默认分类数据
const defaultCategories = [
  // 支出分类
  { id: 1, name: '餐饮', icon: '🍱', type: 'expense' },
  { id: 2, name: '交通', icon: '🚊', type: 'expense' },
  { id: 3, name: '购物', icon: '🛍️', type: 'expense' },
  { id: 4, name: '娱乐', icon: '🎮', type: 'expense' },
  { id: 5, name: '居住', icon: '🏠', type: 'expense' },
  { id: 6, name: '医疗', icon: '💊', type: 'expense' },
  { id: 7, name: '教育', icon: '📚', type: 'expense' },
  { id: 8, name: '日用', icon: '🧴', type: 'expense' },
  
  // 收入分类
  { id: 9, name: '工资', icon: '💵', type: 'income' },
  { id: 10, name: '兼职', icon: '💼', type: 'income' },
  { id: 11, name: '理财', icon: '📈', type: 'income' },
  { id: 12, name: '奖金', icon: '🎁', type: 'income' },
  { id: 13, name: '退款', icon: '🔄', type: 'income' }
]

// 账单相关操作
const billStorage = {
  // 获取月度账单
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
      console.error('获取月度账单失败:', error)
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
  async addBill(bill) {
    try {
      return await request.post('/bills', bill)
    } catch (error) {
      console.error('添加账单失败:', error)
      throw error
    }
  },
  
  // 删除账单
  async deleteBill(id) {
    try {
      await request.delete(`/bills/${id}`)
    } catch (error) {
      console.error('删除账单失败:', error)
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

// 分类相关操作
const categoryStorage = {
  // 获取分类列表
  getCategories() {
    try {
      let categories = wx.getStorageSync(CATEGORY_KEY)
      if (!categories) {
        wx.setStorageSync(CATEGORY_KEY, defaultCategories)
        categories = defaultCategories
      }
      return categories
    } catch (error) {
      console.error('获取分类失败:', error)
      return defaultCategories
    }
  },
  
  // 添加分类
  addCategory(category) {
    try {
      const categories = this.getCategories()
      categories.push({
        id: new Date().getTime(),
        ...category
      })
      wx.setStorageSync(CATEGORY_KEY, categories)
    } catch (error) {
      console.error('添加分类失败:', error)
      throw error
    }
  },

  // 重置分类列表
  resetCategories() {
    try {
      wx.setStorageSync(CATEGORY_KEY, defaultCategories)
      return defaultCategories
    } catch (error) {
      console.error('重置分类失败:', error)
      return defaultCategories
    }
  }
}

module.exports = {
  billStorage,
  categoryStorage
} 