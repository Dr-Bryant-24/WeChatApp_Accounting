const { financeStorage } = require('../../../services/finance')

Page({
  data: {
    productId: '',
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
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      date: e.detail.value
    })
    this.checkCanSave()
  },

  // 金额输入
  onAmountInput(e) {
    this.setData({
      amount: e.detail.value
    })
    this.checkCanSave()
  },

  // 备注输入
  onRemarkInput(e) {
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
  async saveDailyReturn() {
    if (!this.data.canSave) return

    try {
      const { productId, date, amount, remark } = this.data
      await financeStorage.addDailyReturn(productId, {
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