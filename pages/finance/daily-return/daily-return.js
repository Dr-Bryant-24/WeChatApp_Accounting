const { financeStorage } = require('../../../services/finance')

Page({
  data: {
    product: null,
    date: '',
    amount: '',
    remark: '',
    canSave: false
  },

  onLoad(options) {
    const { productId } = options
    if (!productId) {
      wx.showToast({
        title: '产品ID无效',
        icon: 'none'
      })
      wx.navigateBack()
      return
    }
    this.setData({ productId })
    this.loadProduct(productId)
    // 默认设置为今天的日期
    this.setToday()
  },

  async loadProduct(productId) {
    try {
      const product = await financeStorage.getProduct(productId)
      this.setData({ product })
    } catch (error) {
      console.error('加载产品信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 设置为今天日期
  setToday() {
    const today = new Date()
    const date = today.toISOString().split('T')[0]
    this.setData({ date })
  },

  // 设置为昨天日期
  setYesterday() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const date = yesterday.toISOString().split('T')[0]
    this.setData({ date })
  },

  // 清空金额
  clearAmount() {
    this.setData({ 
      amount: '',
      remark: ''
    })
  },

  // 日期选择器改变
  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    })
    this.checkCanSave()
  },

  // 金额输入
  bindAmountInput(e) {
    let value = e.detail.value
    // 限制只能输入数字和小数点，且只能有两位小数
    value = value.replace(/[^\d.]/g, '')
    if (value.indexOf('.') > -1) {
      const parts = value.split('.')
      if (parts.length > 2) value = parts[0] + '.' + parts[1]
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2)
      }
    }
    this.setData({
      amount: value
    })
    this.checkCanSave()
  },

  // 备注输入
  bindRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  // 检查是否可以保存
  checkCanSave() {
    const { date, amount } = this.data
    const canSave = date && amount && Number(amount) > 0
    this.setData({ canSave })
  },

  // 保存每日收益
  async submitReturn() {
    if (!this.data.canSave) return

    try {
      const { product, date, amount, remark } = this.data
      await financeStorage.addDailyReturn(product._id, {
        date,
        amount: Number(amount),
        remark: remark.trim()
      })

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      })

      // 保存成功后返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
    } catch (error) {
      console.error('保存收益记录失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
}) 