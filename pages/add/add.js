// pages/add/add.js
const { billStorage, categoryStorage } = require('../../services/storage')
const request = require('../../utils/request')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    id: '', // 账单ID，用于区分新增和编辑模式
    type: 'expense', // expense 或 income
    amount: '',
    categories: [],
    selectedCategory: null,
    remark: '',
    canSave: false,
    date: new Date().toISOString().split('T')[0], // 实际日期值
    dateText: '今天' // 显示的日期文本
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('页面加载参数:', options); // 添加日志，查看传入的参数
    
    // 如果传入了账单信息，说明是编辑模式
    if (options.id) {
      // 解码可能包含特殊字符的参数
      const category = decodeURIComponent(options.category);
      const description = decodeURIComponent(options.description);
      
      this.setData({
        id: options.id,
        type: options.type,
        amount: options.amount,
        date: options.date,
        remark: description
      }, () => {
        // 加载分类后，设置选中的分类
        this.loadCategories().then(() => {
          const selectedCategory = this.data.categories.find(c => c.name === category);
          if (selectedCategory) {
            this.setData({ 
              selectedCategory,
              canSave: true
            });
          }
        });
        this.updateDateText();
      });
    }
    
    this.loadCategories();
    this.updateDateText();
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
    return Promise.resolve(typeCategories)
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

  // 更新日期显示文本
  updateDateText() {
    const today = new Date().toISOString().split('T')[0]
    const dateText = this.data.date === today ? '今天' : this.data.date
    this.setData({ dateText })
  },

  // 日期选择改变
  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => {
      this.updateDateText()
    })
  },

  // 保存账单
  async saveBill() {
    if (!this.data.canSave) return;

    const { id, type, amount, selectedCategory, remark, date } = this.data;
    const billData = {
      type,
      amount: Number(amount),
      category: selectedCategory.name,
      date: date,
      description: remark || ''
    };

    try {
      wx.showLoading({ title: '保存中...' });

      if (id) {
        // 编辑模式：先删除原账单
        try {
          console.log('删除原账单:', id); // 添加日志，查看要删除的账单ID
          const deleteResponse = await request.delete(`/bills/${id}`);
          console.log('删除响应:', deleteResponse); // 添加日志，查看删除响应
        } catch (error) {
          console.error('删除原账单失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: '编辑失败',
            icon: 'error',
            duration: 2000
          });
          return;
        }
      }

      // 保存新账单
      const addResponse = await billStorage.addBill(billData);
      console.log('保存新账单响应:', addResponse); // 添加日志，查看保存响应
      
      wx.hideLoading();
      wx.showToast({
        title: id ? '编辑成功' : '保存成功',
        icon: 'success',
        duration: 2000
      });

      // 重置表单，但保持当前日期不变
      this.setData({
        id: '', // 清除ID
        amount: '',
        selectedCategory: null,
        remark: '',
        canSave: false
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存账单失败:', error); // 添加错误日志
      wx.hideLoading();
      wx.showToast({
        title: id ? '编辑失败' : '保存失败',
        icon: 'error',
        duration: 2000
      });
    }
  }
})