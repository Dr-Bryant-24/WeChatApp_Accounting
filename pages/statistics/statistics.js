// pages/statistics/statistics.js
const { billStorage } = require('../../services/storage')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentDate: '',
    totalExpense: '0.00',
    totalIncome: '0.00',
    expenseStats: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const now = new Date()
    this.setData({
      currentDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    this.loadStats()
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
    this.loadStats()
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

  // 日期选择改变
  dateChange(e) {
    const date = new Date(e.detail.value)
    this.setData({
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth() + 1,
      currentDate: e.detail.value
    })
    this.loadStats()
  },

  // 加载统计数据
  loadStats() {
    const bills = billStorage.getBills()
    let totalExpense = 0
    let totalIncome = 0
    const categoryExpense = {}

    // 筛选当月账单并统计
    bills.forEach(bill => {
      const billDate = new Date(bill.createTime)
      if (billDate.getFullYear() === this.data.currentYear && 
          billDate.getMonth() + 1 === this.data.currentMonth) {
        if (bill.type === 'expense') {
          totalExpense += Number(bill.amount)
          categoryExpense[bill.category] = (categoryExpense[bill.category] || 0) + Number(bill.amount)
        } else {
          totalIncome += Number(bill.amount)
        }
      }
    })

    // 计算支出分类统计
    const expenseStats = Object.entries(categoryExpense).map(([category, amount]) => ({
      category,
      amount: amount.toFixed(2),
      percent: totalExpense ? Math.round(amount / totalExpense * 100) : 0
    })).sort((a, b) => b.amount - a.amount)

    this.setData({
      totalExpense: totalExpense.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      expenseStats
    })
  }
})