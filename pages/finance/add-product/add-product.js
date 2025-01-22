const { financeStorage } = require('../../../services/finance')

Page({
  data: {
    name: '',
    amount: '',
    remark: '',
    canSave: false
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
    this.checkCanSave()
  },

  onAmountInput(e) {
    this.setData({
      amount: e.detail.value
    })
    this.checkCanSave()
  },

  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  checkCanSave() {
    const { name, amount } = this.data
    const canSave = name.trim() && amount && Number(amount) > 0
    this.setData({ canSave })
  },

  saveProduct() {
    if (!this.data.canSave) return

    const { name, amount, remark } = this.data
    financeStorage.addProduct({
      name: name.trim(),
      amount: Number(amount),
      remark: remark.trim()
    })

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 2000)
  }
}) 