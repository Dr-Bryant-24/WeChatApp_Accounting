const request = require('../utils/request')

const authService = {
  // 登录
  async login() {
    try {
      // 获取微信code
      const { code } = await wx.login()
      
      // 发送到服务器换取token
      const { token, userInfo } = await request.post('/auth/login', { code })
      
      // 保存token
      wx.setStorageSync('token', token)
      wx.setStorageSync('userInfo', userInfo)
      
      return userInfo
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }
}

module.exports = authService 