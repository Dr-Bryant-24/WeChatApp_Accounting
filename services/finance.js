const request = require('../utils/request');
const LZString = require('../utils/lz-string');

const FINANCE_PRODUCTS_KEY = 'FINANCE_PRODUCTS'
const DAILY_RETURNS_KEY = 'FINANCE_DAILY_RETURNS'
const OFFLINE_OPERATIONS_KEY = 'FINANCE_OFFLINE_OPERATIONS'
const DATA_VERSION_KEY = 'FINANCE_DATA_VERSION'
const LAST_SYNC_TIME_KEY = 'FINANCE_LAST_SYNC_TIME'

// 缓存配置
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 缓存最大保存时间（7天）
  syncInterval: 5 * 60 * 1000,      // 自动同步间隔（5分钟）
  compressionThreshold: 1024,        // 压缩阈值（1KB）
  pageSize: 20                       // 分页大小
}

const financeStorage = {
  // 离线操作队列
  offlineOperations: [],
  syncTimer: null,

  // 初始化
  async init() {
    this.initOfflineOperations()
    this.startAutoSync()
    await this.cleanExpiredCache()
    await this.syncData() // 添加初始数据同步
  },

  // 数据同步
  async syncData() {
    try {
      // 获取本地版本号
      const localVersion = wx.getStorageSync(DATA_VERSION_KEY) || 1
      
      // 获取服务器版本号
      const versionResponse = await request.get('/finance/version')
      const serverVersion = versionResponse.version
      
      // 如果版本不一致，需要全量更新
      if (serverVersion !== localVersion) {
        console.log('版本不一致，进行全量更新')
        const response = await request.get('/finance/products')
        console.log('全量更新获取的数据:', response)
        
        if (response && Array.isArray(response.data)) {
          this.saveToStorage(FINANCE_PRODUCTS_KEY, response.data)
          wx.setStorageSync(DATA_VERSION_KEY, serverVersion)
          wx.setStorageSync(LAST_SYNC_TIME_KEY, Date.now())
        }
      }
    } catch (error) {
      console.error('数据同步失败:', error)
    }
  },

  // 批量同步离线操作
  async batchSyncOperations(operations) {
    try {
      const response = await request.post('/finance/batch', {
        operations: operations.map(op => ({
          ...op,
          clientId: op.timestamp // 用于标识客户端操作
        }))
      })

      // 处理批量操作结果
      response.results.forEach((result, index) => {
        if (result.success) {
          // 如果是添加操作，需要更新本地ID映射
          if (operations[index].type === 'ADD_PRODUCT' || operations[index].type === 'ADD_RETURN') {
            this.updateLocalId(operations[index], result.data)
          }
        } else {
          console.error('操作失败:', result.error)
        }
      })

      // 返回成功的操作数量
      return response.results.filter(r => r.success).length
    } catch (error) {
      console.error('批量同步失败:', error)
      return 0
    }
  },

  // 更新本地ID映射
  updateLocalId(operation, serverData) {
    try {
      if (operation.type === 'ADD_PRODUCT') {
        const products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
        const index = products.findIndex(p => p._id === operation.data._id)
        if (index !== -1) {
          products[index] = serverData
          this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
        }
      } else if (operation.type === 'ADD_RETURN') {
        const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
        const returns = allReturns[operation.data.productId] || []
        const index = returns.findIndex(r => r._id === operation.data.returnData._id)
        if (index !== -1) {
          returns[index] = serverData
          allReturns[operation.data.productId] = returns
          this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
        }
      }
    } catch (error) {
      console.error('更新本地ID映射失败:', error)
    }
  },

  // 启动自动同步
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }
    this.syncTimer = setInterval(() => {
      this.syncOfflineOperations()
    }, CACHE_CONFIG.syncInterval)
  },

  // 停止自动同步
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  },

  // 清理过期缓存
  async cleanExpiredCache() {
    try {
      const now = Date.now()
      const lastSyncTime = wx.getStorageSync(LAST_SYNC_TIME_KEY) || 0
      
      // 检查缓存是否过期
      if (now - lastSyncTime > CACHE_CONFIG.maxAge) {
        wx.removeStorageSync(FINANCE_PRODUCTS_KEY)
        wx.removeStorageSync(DAILY_RETURNS_KEY)
        console.log('清理过期缓存')
      }
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  },

  // 压缩数据
  compressData(data) {
    // 暂时禁用压缩功能
    return { data, compressed: false }
  },

  // 解压数据
  decompressData(data, compressed) {
    // 暂时禁用解压功能
    return data
  },

  // 保存数据到本地缓存
  saveToStorage(key, data) {
    try {
      if (!key || !data) {
        console.error('[Storage] 无效的参数:', { key, data })
        return
      }

      // 直接保存原始数据
      const storageData = {
        data,
        compressed: false,
        timestamp: Date.now(),
        version: wx.getStorageSync(DATA_VERSION_KEY) || 1
      }

      // 保存到本地存储
      wx.setStorageSync(key, storageData)
      console.log(`[Storage] 成功保存数据到缓存: ${key}`, data)
    } catch (error) {
      console.error('[Storage] 保存数据失败:', error)
    }
  },

  // 从本地缓存读取数据
  loadFromStorage(key) {
    try {
      const cache = wx.getStorageSync(key)
      if (!cache) {
        console.log(`[Storage] 缓存中没有找到数据: ${key}`)
        return null
      }
      
      const data = this.decompressData(cache.data, cache.compressed)
      console.log(`[Storage] 成功读取缓存数据: ${key}`, data)
      return data
    } catch (error) {
      console.error('[Storage] 读取数据失败:', error)
      return null
    }
  },

  // 初始化离线操作队列
  initOfflineOperations() {
    try {
      const operations = this.loadFromStorage(OFFLINE_OPERATIONS_KEY) || []
      this.offlineOperations = operations
    } catch (error) {
      console.error('初始化离线操作队列失败:', error)
      this.offlineOperations = []
    }
  },

  // 保存离线操作队列
  saveOfflineOperations() {
    this.saveToStorage(OFFLINE_OPERATIONS_KEY, this.offlineOperations)
  },

  // 添加离线操作
  addOfflineOperation(operation) {
    this.offlineOperations.push({
      ...operation,
      timestamp: Date.now(),
      version: wx.getStorageSync(DATA_VERSION_KEY) || 1
    })
    this.saveOfflineOperations()
  },

  // 同步离线操作到云端
  async syncOfflineOperations() {
    if (this.offlineOperations.length === 0) return

    try {
      // 直接同步所有离线操作
      const validOperations = this.offlineOperations

      if (validOperations.length > 0) {
        // 使用批量操作接口
        const successCount = await this.batchSyncOperations(validOperations)
        
        if (successCount > 0) {
          // 移除已成功同步的操作
          this.offlineOperations = this.offlineOperations.filter(
            op => !validOperations.slice(0, successCount).find(v => v.timestamp === op.timestamp)
          )
          this.saveOfflineOperations()
          
          // 同步完成后更新数据
          await this.syncData()
        }
      }
    } catch (error) {
      console.error('同步离线操作失败:', error)
    }
  },

  // 获取单个理财产品
  async getProduct(id) {
    try {
      const products = await this.getProducts()
      return products.find(p => p._id === id)
    } catch (error) {
      console.error('获取产品失败:', error)
      return null
    }
  },

  // 获取所有理财产品（支持分页）
  async getProducts(page = 1) {
    try {
      // 先从本地缓存获取数据
      let products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
      
      if (products.length === 0) {
        try {
          // 获取云端数据
          const response = await request.get('/finance/products')
          console.log('从服务器获取的产品数据:', response)
          
          if (response && Array.isArray(response.data)) {
            products = response.data
            this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
            wx.setStorageSync(LAST_SYNC_TIME_KEY, Date.now())
          }
        } catch (error) {
          console.warn('从云端获取产品列表失败，使用本地缓存:', error)
        }
      }
      
      console.log('返回的产品列表:', products)
      return products
    } catch (error) {
      console.error('获取产品列表失败:', error)
      return []
    }
  },

  // 添加理财产品
  async addProduct(product) {
    try {
      // 先尝试云端操作
      const result = await request.post('/finance/products', product)
      
      // 成功后更新本地缓存
      const products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
      products.push(result)
      this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
      
      return result
    } catch (error) {
      console.error('添加产品到云端失败，添加到离线队列:', error)
      
      // 生成临时ID
      const tempProduct = {
        ...product,
        _id: 'temp_' + Date.now()
      }
      
      // 更新本地缓存
      const products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
      products.push(tempProduct)
      this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
      
      // 添加到离线操作队列
      this.addOfflineOperation({
        type: 'ADD_PRODUCT',
        data: product
      })
      
      return tempProduct
    }
  },

  // 删除理财产品
  async deleteProduct(productId) {
    try {
      // 先尝试云端操作
      await request.delete(`/finance/products/${productId}`)
      
      // 成功后更新本地缓存
      let products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
      products = products.filter(p => p._id !== productId)
      this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
    } catch (error) {
      console.error('从云端删除产品失败，添加到离线队列:', error)
      
      // 更新本地缓存
      let products = this.loadFromStorage(FINANCE_PRODUCTS_KEY) || []
      products = products.filter(p => p._id !== productId)
      this.saveToStorage(FINANCE_PRODUCTS_KEY, products)
      
      // 添加到离线操作队列
      this.addOfflineOperation({
        type: 'DELETE_PRODUCT',
        data: { productId }
      })
    }
  },

  // 获取某个产品的所有每日收益记录
  async getDailyReturns(productId) {
    try {
      if (!productId) {
        console.error('产品ID未定义')
        return []
      }

      // 先从本地缓存获取数据
      const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
      let returns = allReturns[productId] || []
      
      try {
        // 从云端获取所有数据
        const returnsMap = new Map() // 使用 Map 来存储数据，确保不重复
        let page = 1
        const size = 50  // 每页50条记录
        let hasMoreData = true
        
        while (hasMoreData) {
          const requestParams = {
            page: Number(page),
            size: Number(size)
          }
          console.log(`正在获取第 ${page} 页收益记录...`)
          console.log('请求参数:', {
            url: `/finance/products/${productId}/returns`,
            params: requestParams
          })
          
          const response = await request.get(`/finance/products/${productId}/returns?page=${requestParams.page}&size=${requestParams.size}`)
          console.log('API响应数据:', response)
          
          // 检查响应数据格式
          if (!response || !response.data) {
            console.warn('API响应格式不正确:', response)
            break
          }
          
          const pageData = response.data
          if (!Array.isArray(pageData) || pageData.length === 0) {
            console.log('没有更多数据')
            break
          }
          
          // 将新数据添加到 Map 中，使用 _id 作为键来去重
          pageData.forEach(item => {
            returnsMap.set(item._id, item)
          })
          
          console.log(`当前已获取 ${returnsMap.size} 条不重复收益记录`)
          
          // 检查分页信息
          if (response.pagination) {
            console.log('分页信息:', {
              当前页: response.pagination.page,
              每页条数: response.pagination.size,
              总页数: response.pagination.totalPages,
              总记录数: response.pagination.total
            })
            
            if (page >= response.pagination.totalPages) {
              console.log(`已到达最后一页 (${page}/${response.pagination.totalPages})`)
              hasMoreData = false
            } else {
              console.log(`准备获取下一页 (${page + 1}/${response.pagination.totalPages})`)
              page++
            }
          } else {
            console.warn('响应中没有分页信息')
            hasMoreData = false
          }
        }
        
        // 将 Map 转换回数组
        const allData = Array.from(returnsMap.values())
        
        if (allData.length > 0) {
          console.log(`成功获取所有收益记录，共 ${allData.length} 条不重复记录`)
          // 使用新的数据更新缓存
          returns = allData
          allReturns[productId] = returns
          this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
        } else {
          console.log('没有获取到新的收益记录，使用缓存数据')
        }
      } catch (error) {
        console.warn('从云端获取收益记录失败，使用本地缓存:', error)
      }
      
      return returns
    } catch (error) {
      console.error('获取收益记录失败:', error)
      return []
    }
  },

  // 添加每日收益记录
  async addDailyReturn(productId, returnData) {
    try {
      if (!productId) {
        throw new Error('产品ID未定义')
      }

      // 先尝试云端操作
      const result = await request.post(`/finance/products/${productId}/returns`, returnData)
      
      // 成功后更新本地缓存
      const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
      const returns = allReturns[productId] || []
      returns.push(result)
      allReturns[productId] = returns
      this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
      
      return result
    } catch (error) {
      console.error('添加收益记录到云端失败，添加到离线队列:', error)
      
      // 生成临时ID
      const tempReturn = {
        ...returnData,
        _id: 'temp_' + Date.now()
      }
      
      // 更新本地缓存
      const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
      const returns = allReturns[productId] || []
      returns.push(tempReturn)
      allReturns[productId] = returns
      this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
      
      // 添加到离线操作队列
      this.addOfflineOperation({
        type: 'ADD_RETURN',
        data: {
          productId,
          returnData
        }
      })
      
      return tempReturn
    }
  },

  // 删除每日收益记录
  async deleteDailyReturn(productId, returnId) {
    try {
      if (!returnId) {
        throw new Error('收益记录ID未定义')
      }
      
      // 先尝试云端操作
      await request.delete(`/finance/returns/${returnId}`)
      
      // 成功后更新本地缓存
      const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
      const returns = allReturns[productId] || []
      allReturns[productId] = returns.filter(r => r._id !== returnId)
      this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
      
      return true
    } catch (error) {
      console.error('从云端删除收益记录失败，添加到离线队列:', error)
      
      // 更新本地缓存
      const allReturns = this.loadFromStorage(DAILY_RETURNS_KEY) || {}
      const returns = allReturns[productId] || []
      allReturns[productId] = returns.filter(r => r._id !== returnId)
      this.saveToStorage(DAILY_RETURNS_KEY, allReturns)
      
      // 添加到离线操作队列
      this.addOfflineOperation({
        type: 'DELETE_RETURN',
        data: { returnId }
      })
      
      return true
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