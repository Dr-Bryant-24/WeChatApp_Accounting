const BILL_KEY = 'BILL_LIST'
const CATEGORY_KEY = 'CATEGORY_LIST'
const request = require('../utils/request')

// 默认分类数据
const defaultCategories = [
  { id: 1, name: '餐饮', icon: 'food', type: 'expense' },
  { id: 2, name: '交通', icon: 'car', type: 'expense' },
  { id: 3, name: '购物', icon: 'shopping', type: 'expense' },
  { id: 4, name: '工资', icon: 'salary', type: 'income' },
  { id: 5, name: '兼职', icon: 'part-time', type: 'income' }
]

// 账单相关操作
const billStorage = {
  // 获取账单列表
  async getBills() {
    try {
      return await request.get('/bills')
    } catch (error) {
      console.error('获取账单失败:', error)
      return []
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
  deleteBill(id) {
    const bills = this.getBills()
    const newBills = bills.filter(bill => bill.id !== id)
    wx.setStorageSync(BILL_KEY, newBills)
  }
}

// 分类相关操作
const categoryStorage = {
  // 获取分类列表
  getCategories() {
    let categories = wx.getStorageSync(CATEGORY_KEY)
    if (!categories) {
      wx.setStorageSync(CATEGORY_KEY, defaultCategories)
      categories = defaultCategories
    }
    return categories
  },
  
  // 添加分类
  addCategory(category) {
    const categories = this.getCategories()
    categories.push({
      id: new Date().getTime(),
      ...category
    })
    wx.setStorageSync(CATEGORY_KEY, categories)
  }
}

module.exports = {
  billStorage,
  categoryStorage
} 