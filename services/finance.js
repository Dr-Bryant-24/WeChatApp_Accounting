const request = require('../utils/request');

const FINANCE_PRODUCTS_KEY = 'FINANCE_PRODUCTS'
const DAILY_RETURNS_KEY = 'FINANCE_DAILY_RETURNS'

const financeStorage = {
  // 获取单个理财产品
  async getProduct(id) {
    try {
      const products = await this.getProducts();
      return products.find(p => p._id === id);
    } catch (error) {
      console.error('获取产品失败:', error);
      return null;
    }
  },

  // 获取所有理财产品
  async getProducts() {
    try {
      const response = await request.get('/finance/products')
      console.log('API返回的产品列表:', response)
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('获取产品列表失败:', error)
      return []
    }
  },

  // 添加理财产品
  async addProduct(product) {
    try {
      return await request.post('/finance/products', product);
    } catch (error) {
      console.error('添加产品失败:', error);
      throw error;
    }
  },

  // 删除理财产品
  async deleteProduct(productId) {
    try {
      await request.delete(`/finance/products/${productId}`);
    } catch (error) {
      console.error('删除产品失败:', error);
      throw error;
    }
  },

  // 获取某个产品的所有每日收益记录
  async getDailyReturns(productId) {
    try {
      console.log('获取收益记录的产品ID:', productId)
      if (!productId) {
        console.error('产品ID未定义')
        return []
      }
      const returns = await request.get(`/finance/products/${productId}/returns`)
      return Array.isArray(returns) ? returns : []
    } catch (error) {
      console.error('获取收益记录失败:', error)
      return []
    }
  },

  // 添加每日收益记录
  async addDailyReturn(productId, returnData) {
    try {
      console.log('添加收益记录:', { productId, returnData })
      if (!productId) {
        throw new Error('产品ID未定义')
      }
      return await request.post(`/finance/products/${productId}/returns`, returnData)
    } catch (error) {
      console.error('添加收益记录失败:', error)
      throw error
    }
  },

  // 删除每日收益记录
  async deleteDailyReturn(productId, returnId) {
    try {
      if (!returnId) {
        throw new Error('收益记录ID未定义')
      }
      
      // 使用新的 API 路径删除记录
      await request.delete(`/finance/returns/${returnId}`)
      return true
    } catch (error) {
      console.error('删除收益记录失败:', error)
      throw error
    }
  },

  // 计算某个产品的平均每日收益
  async calculateAverageReturn(productId) {
    try {
      const returns = await this.getDailyReturns(productId)
      if (returns.length === 0) return '0.00'
      
      const totalReturn = returns.reduce((sum, item) => sum + Number(item.amount), 0)
      return (totalReturn / returns.length).toFixed(2)
    } catch (error) {
      console.error('计算平均收益失败:', error)
      return '0.00'
    }
  }
}

module.exports = {
  financeStorage
} 