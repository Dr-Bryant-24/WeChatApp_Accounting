// pages/add/add.js
const { billStorage, categoryStorage } = require('../../services/storage')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    type: 'expense', // expense 或 income
    amount: '',
    categories: [],
    selectedCategory: null,
    remark: '',
    canSave: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCategories()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadCategories()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载分类数据
  loadCategories() {
    const categories = categoryStorage.getCategories()
    const typeCategories = categories.filter(c => c.type === this.data.type)
    this.setData({ categories: typeCategories })
  },

  // 切换收支类型
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 
      type,
      selectedCategory: null
    })
    this.loadCategories()
    this.checkCanSave()
  },

  // 金额输入
  onAmountInput(e) {
    this.setData({
      amount: e.detail.value
    })
    this.checkCanSave()
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
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
    const { amount, selectedCategory } = this.data
    const canSave = amount && amount > 0 && selectedCategory
    this.setData({ canSave })
  },

  // 保存账单
  saveBill() {
    if (!this.data.canSave) return

    const { type, amount, selectedCategory, remark } = this.data
    const bill = {
      type,
      amount: Number(amount),
      category: selectedCategory.name,
      categoryId: selectedCategory.id,
      remark
    }

    billStorage.addBill(bill)
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    })

    // 重置表单
    this.setData({
      amount: '',
      selectedCategory: null,
      remark: '',
      canSave: false
    })
  }
})