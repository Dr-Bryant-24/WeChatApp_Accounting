// pages/index/index.js
const { billStorage } = require('../../services/storage');
const { formatTime } = require('../../utils/util');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    totalExpense: 0,
    totalIncome: 0,
    bills: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadBills();
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
    this.loadBills(); // 每次显示页面时重新加载数据
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

  async loadBills() {
    try {
      // 改为 await 异步调用
      const bills = await billStorage.getBills() || [];
      
      let totalExpense = 0;
      let totalIncome = 0;

      // 确保 bills 是数组
      if (Array.isArray(bills)) {
        // 计算总收支
        bills.forEach(bill => {
          if (bill.type === 'expense') {
            totalExpense += Number(bill.amount);
          } else {
            totalIncome += Number(bill.amount);
          }
        });

        // 格式化账单数据
        const formattedBills = bills.map(bill => ({
          ...bill,
          date: formatTime(new Date(bill.createTime))
        }));

        this.setData({
          bills: formattedBills,
          totalExpense: totalExpense.toFixed(2),
          totalIncome: totalIncome.toFixed(2)
        });
      } else {
        // 如果不是数组，设置为空数组
        this.setData({
          bills: [],
          totalExpense: '0.00',
          totalIncome: '0.00'
        });
      }
    } catch (error) {
      console.error('加载账单失败:', error);
      // 发生错误时也设置为空数组
      this.setData({
        bills: [],
        totalExpense: '0.00',
        totalIncome: '0.00'
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  }
})