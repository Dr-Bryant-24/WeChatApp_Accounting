const { financeStorage } = require('../../../services/finance')

Page({
  data: {
    productId: '',
    date: '',
    amount: '',
    remark: '',
    canSave: false,
    returns: []
  },

  onLoad(options) {
    const { productId } = options
    this.setData({ productId })
    this.loadReturns()
  },

  // 加载历史收益记录
  loadReturns() {
    const returns = financeStorage.getDailyReturns(this.data.productId)
    this.setData({ returns })
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
  saveDailyReturn() {
    if (!this.data.canSave) return

    const { productId, date, amount, remark } = this.data
    financeStorage.addDailyReturn(productId, {
      date,
      amount: Number(amount),
      remark: remark.trim()
    })

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    })

    // 重置表单并刷新列表
    this.setData({
      date: '',
      amount: '',
      remark: '',
      canSave: false
    })
    this.loadReturns()
  }
}) 