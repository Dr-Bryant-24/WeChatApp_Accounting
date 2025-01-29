const { financeStorage } = require('../../../services/finance')

Page({
  data: {
    product: null,
    returns: [],
    showDatePicker: false,
    years: [],
    months: [],
    days: [],
    value: [0, 0, 0],
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0,
    currentEditReturn: null // 当前正在编辑的记录
  },

  onLoad(options) {
    const { id } = options
    this.loadProductDetail(id)
    this.initDatePicker()
  },

  // 初始化日期选择器数据
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    // 生成年份列表（前后5年）
    const currentYear = now.getFullYear()
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i)
    }

    // 生成月份列表
    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }

    // 生成天数列表
    for (let i = 1; i <= 31; i++) {
      days.push(i)
    }

    this.setData({ years, months, days })
  },

  loadProductDetail(productId) {
    const product = financeStorage.getProducts().find(p => p.id === Number(productId))
    const returns = financeStorage.getDailyReturns(Number(productId))
    
    // 按日期降序排序
    returns.sort((a, b) => new Date(b.date) - new Date(a.date))

    this.setData({
      product,
      returns
    })
  },

  // 编辑收益记录
  editReturn(e) {
    const returnData = e.currentTarget.dataset.return
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 编辑
          this.showEditModal(returnData)
        } else if (res.tapIndex === 1) {
          // 删除
          this.deleteReturn(returnData)
        }
      }
    })
  },

  // 显示编辑弹窗
  showEditModal(returnData) {
    // 设置当前日期到日期选择器
    const date = new Date(returnData.date)
    const yearIndex = this.data.years.indexOf(date.getFullYear())
    const monthIndex = date.getMonth()
    const dayIndex = date.getDate() - 1

    this.setData({
      currentEditReturn: returnData,
      showDatePicker: true,
      value: [yearIndex, monthIndex, dayIndex],
      selectedYear: this.data.years[yearIndex],
      selectedMonth: monthIndex + 1,
      selectedDay: dayIndex + 1
    })
  },

  bindDateChange(e) {
    const val = e.detail.value
    const year = this.data.years[val[0]]
    const month = this.data.months[val[1]]
    const day = this.data.days[val[2]]

    this.setData({
      selectedYear: year,
      selectedMonth: month,
      selectedDay: day
    })
  },

  cancelDatePicker() {
    this.setData({
      showDatePicker: false,
      currentEditReturn: null
    })
  },

  confirmDatePicker() {
    const { selectedYear, selectedMonth, selectedDay, currentEditReturn } = this.data
    const newDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    
    this.setData({ showDatePicker: false })
    this.showAmountModal(currentEditReturn, newDate)
  },

  // 修改金额输入框方法，添加日期参数
  showAmountModal(returnData, newDate) {
    wx.showModal({
      title: '编辑收益金额',
      content: '',
      editable: true,
      placeholderText: '请输入金额',
      value: returnData.amount.toString(),
      success: (res) => {
        if (res.confirm) {
          const newAmount = Number(res.content)
          if (isNaN(newAmount) || newAmount <= 0) {
            wx.showToast({
              title: '请输入有效金额',
              icon: 'none'
            })
            return
          }
          this.updateReturn(returnData, newAmount, newDate || returnData.date)
        }
      }
    })
  },

  // 修改更新方法，支持同时更新日期和金额
  updateReturn(returnData, newAmount, newDate) {
    const allReturns = wx.getStorageSync('FINANCE_DAILY_RETURNS') || {}
    const productReturns = allReturns[this.data.product.id] || []
    
    const index = productReturns.findIndex(item => item.id === returnData.id)
    if (index !== -1) {
      productReturns[index] = {
        ...productReturns[index],
        amount: newAmount,
        date: newDate
      }
      
      allReturns[this.data.product.id] = productReturns
      wx.setStorageSync('FINANCE_DAILY_RETURNS', allReturns)
      
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })
      
      this.loadProductDetail(this.data.product.id)
    }
  },

  // 删除收益记录
  deleteReturn(returnData) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条收益记录吗？',
      success: (res) => {
        if (res.confirm) {
          const allReturns = wx.getStorageSync('FINANCE_DAILY_RETURNS') || {}
          const productReturns = allReturns[this.data.product.id] || []
          
          const newReturns = productReturns.filter(item => item.id !== returnData.id)
          allReturns[this.data.product.id] = newReturns
          
          wx.setStorageSync('FINANCE_DAILY_RETURNS', allReturns)
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          this.loadProductDetail(this.data.product.id)
        }
      }
    })
  },

  // 添加导入按钮的处理函数
  importFromFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'csv'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].path
        // 解析文件内容并导入
        this.parseAndImportData(tempFilePath)
      }
    })
  },

  // 添加文本导入功能
  importFromText() {
    wx.showModal({
      title: '批量导入收益记录',
      content: '请按照以下格式输入数据：\n日期,金额,备注(可选)\n例如：\n2024-10-01,2.5,\n2024-10-02,2.8,节假日',
      editable: true,
      confirmText: '导入',
      success: (res) => {
        if (res.confirm && res.content) {
          const lines = res.content.split('\n')
          const returns = lines.map(line => {
            const [date, amount, remark] = line.split(',')
            return {
              id: Date.now() + Math.random(),
              date: date.trim(),
              amount: Number(amount.trim()),
              remark: remark ? remark.trim() : ''
            }
          }).filter(item => !isNaN(item.amount) && /^\d{4}-\d{2}-\d{2}$/.test(item.date))

          if (returns.length > 0) {
            this.batchImportReturns(returns)
          }
        }
      }
    })
  },

  // 批量导入数据
  batchImportReturns(returns) {
    const allReturns = wx.getStorageSync('FINANCE_DAILY_RETURNS') || {}
    const productReturns = allReturns[this.data.product.id] || []
    
    // 合并新数据，避免重复
    const mergedReturns = [...productReturns]
    returns.forEach(newReturn => {
      const existingIndex = mergedReturns.findIndex(item => item.date === newReturn.date)
      if (existingIndex === -1) {
        mergedReturns.push(newReturn)
      }
    })
    
    allReturns[this.data.product.id] = mergedReturns
    wx.setStorageSync('FINANCE_DAILY_RETURNS', allReturns)
    
    wx.showToast({
      title: `成功导入${returns.length}条记录`,
      icon: 'success'
    })
    
    this.loadProductDetail(this.data.product.id)
  }
}) 