const FINANCE_PRODUCTS_KEY = 'FINANCE_PRODUCTS'
const DAILY_RETURNS_KEY = 'FINANCE_DAILY_RETURNS'

const financeStorage = {
  // 获取所有理财产品
  getProducts() {
    return wx.getStorageSync(FINANCE_PRODUCTS_KEY) || []
  },

  // 添加理财产品
  addProduct(product) {
    const products = this.getProducts()
    const newProduct = {
      id: new Date().getTime(),
      ...product,
      createTime: new Date().getTime()
    }
    products.push(newProduct)
    wx.setStorageSync(FINANCE_PRODUCTS_KEY, products)
    return newProduct
  },

  // 删除理财产品
  deleteProduct(productId) {
    const products = this.getProducts()
    const newProducts = products.filter(p => p.id !== productId)
    wx.setStorageSync(FINANCE_PRODUCTS_KEY, newProducts)
    // 同时删除该产品的所有收益记录
    this.deleteDailyReturnsByProduct(productId)
  },

  // 获取某个产品的所有每日收益记录
  getDailyReturns(productId) {
    const allReturns = wx.getStorageSync(DAILY_RETURNS_KEY) || {}
    return allReturns[productId] || []
  },

  // 添加每日收益记录
  addDailyReturn(productId, returnData) {
    const allReturns = wx.getStorageSync(DAILY_RETURNS_KEY) || {}
    const productReturns = allReturns[productId] || []
    
    const newReturn = {
      id: new Date().getTime(),
      ...returnData,
      createTime: new Date().getTime()
    }
    
    productReturns.push(newReturn)
    allReturns[productId] = productReturns.sort((a, b) => new Date(a.date) - new Date(b.date))
    
    wx.setStorageSync(DAILY_RETURNS_KEY, allReturns)
    return newReturn
  },

  // 删除某个产品的所有收益记录
  deleteDailyReturnsByProduct(productId) {
    const allReturns = wx.getStorageSync(DAILY_RETURNS_KEY) || {}
    delete allReturns[productId]
    wx.setStorageSync(DAILY_RETURNS_KEY, allReturns)
  },

  // 计算某个产品的平均每日收益
  calculateAverageReturn(productId) {
    const returns = this.getDailyReturns(productId)
    if (returns.length === 0) return 0
    
    const totalReturn = returns.reduce((sum, item) => sum + Number(item.amount), 0)
    return (totalReturn / returns.length).toFixed(2)
  }
}

module.exports = {
  financeStorage
} 