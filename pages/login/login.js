const request = require('../../utils/request')

Page({
  data: {
    username: '',
    password: ''
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [field]: e.detail.value
    })
  },

  async onLogin() {
    try {
      const { username, password } = this.data
      
      // 修改为实际的登录接口路径
      const res = await request.post('/user/login', {
        username,
        password
      })
      
      if (res.data && res.data.token) {
        // 保存 token
        wx.setStorageSync('token', res.data.token)
        
        // 显示登录成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error('登录失败')
      }
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    }
  }
}) 