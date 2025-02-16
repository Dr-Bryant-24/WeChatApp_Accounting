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
    currentEditReturn: null, // 当前正在编辑的记录
    averageReturn: '0.00',
    totalReturn: '0.00',
    annualizedRate: '0.00',
    dailyReturnPer10k: '0.0000'
  },

  async onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({
        title: '产品ID无效',
        icon: 'error'
      })
      wx.navigateBack()
      return
    }

    try {
      // 改为使用异步方法获取产品信息
      const product = await financeStorage.getProduct(id)
      if (!product) {
        wx.showToast({
          title: '产品不存在',
          icon: 'error'
        })
        wx.navigateBack()
        return
      }

      this.setData({ product })
      await this.loadProductDetail(id)
      this.initDatePicker()
    } catch (error) {
      console.error('加载产品详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      wx.navigateBack()
    }
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

  async loadProductDetail(productId) {
    try {
      // 获取产品收益记录
      const returns = await financeStorage.getDailyReturns(productId)
      
      // 按日期降序排序，并确保日期格式只有年月日
      returns.sort((a, b) => new Date(b.date) - new Date(a.date))
      
      // 处理月度统计数据
      const monthlyStats = this.calculateMonthlyStats(returns, this.data.product.amount)
      
      // 将月度统计数据插入到对应月份的最后一天之前
      const processedReturns = []
      
      returns.forEach(item => {
        // 确保日期格式只有年月日
        const formattedItem = {
          ...item,
          date: item.date.split('T')[0] // 如果日期包含时间，去掉时间部分
        }
        
        const itemMonth = formattedItem.date.slice(0, 7)  // 获取年月 (YYYY-MM)
        const monthOnly = itemMonth.slice(5)  // 只获取月份 (MM)
        const itemDay = parseInt(formattedItem.date.slice(8, 10))  // 获取日期
        
        // 检查是否是月份的最后一天
        const lastDayOfMonth = new Date(itemMonth + '-01')
        lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1)
        lastDayOfMonth.setDate(0)
        const lastDay = lastDayOfMonth.getDate()
        
        // 如果是月份的最后一天，添加月度统计
        if (itemDay === lastDay && monthlyStats[itemMonth]) {
          processedReturns.push({
            id: `monthly-${itemMonth}`,
            isMonthly: true,
            month: monthOnly,
            ...monthlyStats[itemMonth]
          })
        }
        
        processedReturns.push(formattedItem)
      })
      
      // 重新计算所有统计数据
      const totalReturn = returns.reduce((sum, r) => sum + r.amount, 0)
      const averageReturn = returns.length > 0 ? (totalReturn / returns.length).toFixed(2) : '0.00'
      
      // 计算每万元日均收益和年化收益率
      const dailyReturnPer10k = returns.length > 0 ? 
        (Number(averageReturn) / this.data.product.amount * 10000) : 0
      const annualizedRate = (dailyReturnPer10k * 365 / 10000 * 100).toFixed(2)

      this.setData({
        returns: processedReturns,
        averageReturn,
        totalReturn: totalReturn.toFixed(2),
        dailyReturnPer10k: dailyReturnPer10k.toFixed(4),
        annualizedRate
      })
    } catch (error) {
      console.error('加载产品详情失败:', error)
      throw error
    }
  },

  // 计算月度统计数据
  calculateMonthlyStats(returns, productAmount) {
    const monthlyStats = {}
    
    // 按月份分组统计
    returns.forEach(item => {
      const month = item.date.slice(0, 7)  // 获取年月 (YYYY-MM)
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          totalReturn: 0,
          days: 0
        }
      }
      monthlyStats[month].totalReturn += Number(item.amount)
      monthlyStats[month].days++
    })
    
    // 计算每个月的年化收益率
    Object.keys(monthlyStats).forEach(month => {
      const stats = monthlyStats[month]
      const averageReturn = stats.totalReturn / stats.days
      const dailyReturnPer10k = (averageReturn / productAmount * 10000)
      stats.annualizedRate = (dailyReturnPer10k * 365 / 10000 * 100).toFixed(2)
      stats.totalReturn = stats.totalReturn.toFixed(2)
    })
    
    return monthlyStats
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
    
    // 确保数据按日期降序排序
    mergedReturns.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    allReturns[this.data.product.id] = mergedReturns
    wx.setStorageSync('FINANCE_DAILY_RETURNS', allReturns)
    
    wx.showToast({
      title: `成功导入${returns.length}条记录`,
      icon: 'success'
    })
    
    this.loadProductDetail(this.data.product.id)
  }
}) 