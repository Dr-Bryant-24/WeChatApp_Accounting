const config = require('../config')

const request = {
  async get(url, params = {}) {
    return this.request('GET', url, params)
  },
  
  async post(url, data = {}) {
    return this.request('POST', url, data)
  },
  
  async request(method, url, data = {}) {
    const token = wx.getStorageSync('token')
    
    try {
      const res = await wx.request({
        url: `${config.API_BASE_URL}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      
      if (res.statusCode === 401) {
        // token过期,重新登录
        await this.handleUnauthorized()
        // 重试请求
        return this.request(method, url, data)
      }
      
      if (res.statusCode >= 400) {
        throw new Error(res.data.message || '请求失败')
      }
      
      return res.data
    } catch (error) {
      wx.showToast({
        title: error.message,
        icon: 'none'
      })
      throw error
    }
  },
  
  async handleUnauthorized() {
    // 清除本地token
    wx.removeStorageSync('token')
    // 重新登录
    await wx.navigateTo({
      url: '/pages/login/login'
    })
  }
}

module.exports = request 