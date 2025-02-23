// pages/index/index.js
const { billStorage } = require('../../services/storage');
const { formatTime } = require('../../utils/util');
const request = require('../../utils/request');

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

  // 跳转到记账页面
  navigateToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  // 日期选择改变
  dateChange(e) {
    const date = new Date(e.detail.value);
    this.setData({
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth() + 1
    });
    this.loadBills();
  },

  // 上个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentMonth = 12;
      currentYear--;
    } else {
      currentMonth--;
    }
    this.setData({
      currentYear,
      currentMonth
    });
    this.loadBills();
  },

  // 下个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear++;
    } else {
      currentMonth++;
    }
    this.setData({
      currentYear,
      currentMonth
    });
    this.loadBills();
  },

  // 格式化日期为"MM/DD"格式
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  },

  async loadBills() {
    try {
      const { currentYear, currentMonth } = this.data;
      const response = await billStorage.getMonthlyBills(currentYear, currentMonth);
      
      if (response && response.bills) {
        // 按日期分组账单数据
        const groupedBills = {};
        response.bills.forEach(bill => {
          const date = bill.date;
          if (!groupedBills[date]) {
            groupedBills[date] = {
              fullDate: date, // 保存完整日期用于排序
              date: this.formatDate(date), // 格式化日期，只显示月/日
              dayOfWeek: this.getDayOfWeek(new Date(date)),
              bills: [],
              dayIncome: 0,
              dayExpense: 0
            };
          }
          groupedBills[date].bills.push(bill);
          if (bill.type === 'income') {
            groupedBills[date].dayIncome += Number(bill.amount);
          } else {
            groupedBills[date].dayExpense += Number(bill.amount);
          }
        });

        // 转换为数组并按日期倒序排序
        const formattedBills = Object.values(groupedBills)
          .sort((a, b) => new Date(b.fullDate) - new Date(a.fullDate))
          .map(group => ({
            ...group,
            dayIncome: group.dayIncome.toFixed(2),
            dayExpense: group.dayExpense.toFixed(2)
          }));

        this.setData({
          bills: formattedBills,
          totalExpense: response.stats.expense.toFixed(2),
          totalIncome: response.stats.income.toFixed(2)
        });
      } else {
        this.setData({
          bills: [],
          totalExpense: '0.00',
          totalIncome: '0.00'
        });
      }
    } catch (error) {
      console.error('加载账单失败:', error);
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
  },

  // 获取星期几
  getDayOfWeek(date) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  },

  // 显示账单操作选项
  showBillOptions(e) {
    const bill = e.currentTarget.dataset.bill;
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 编辑账单
          this.editBill(bill);
        } else if (res.tapIndex === 1) {
          // 删除账单
          this.deleteBill(bill);
        }
      }
    });
  },

  // 编辑账单
  editBill(bill) {
    console.log('要编辑的账单:', bill); // 添加日志，查看账单数据
    // 使用 encodeURIComponent 处理可能包含特殊字符的参数
    const params = {
      id: bill._id || bill.id, // 兼容两种 ID 的情况
      type: bill.type,
      category: encodeURIComponent(bill.category),
      amount: bill.amount,
      date: bill.date,
      description: encodeURIComponent(bill.description || '')
    };

    const url = `/pages/add/add?id=${params.id}&type=${params.type}&category=${params.category}&amount=${params.amount}&date=${params.date}&description=${params.description}`;
    
    console.log('跳转URL:', url); // 添加日志，查看URL
    wx.navigateTo({ url });
  },

  // 删除账单
  async deleteBill(bill) {
    try {
      // 显示确认对话框
      const confirmRes = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这条账单记录吗？',
        confirmText: '删除',
        confirmColor: '#ff0000'
      });

      if (confirmRes.confirm) {
        wx.showLoading({ title: '删除中...' });
        
        const response = await request.delete(`/bills/${bill.id}`);
        
        wx.hideLoading();
        if (response.message === '删除成功') {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 重新加载账单列表
          this.loadBills();
        }
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除账单失败:', error);
      wx.showToast({
        title: error.error?.message || '删除失败',
        icon: 'none'
      });
    }
  }
})