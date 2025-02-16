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
    dailyReturnPer10k: '0.0000',
    totalDays: 0
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
      const returns = await financeStorage.getDailyReturns(productId)
      
      // 计算累计天数
      const totalDays = returns.length
      
      // 处理月度统计数据
      const monthlyStats = this.calculateMonthlyStats(returns, this.data.product.amount)
      
      // 按日期降序排序，并添加月度总结
      const processedReturns = returns
        .map(item => ({
          ...item,
          date: item.date.split('T')[0],  // 确保日期格式只有年月日
          amount: Number(item.amount)      // 确保金额是数字类型
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))  // 按日期降序排序

      // 将月度总结插入到对应位置
      const finalReturns = []
      const processedMonths = new Set()

      processedReturns.forEach(item => {
        const itemMonth = item.date.slice(0, 7)  // YYYY-MM
        const monthOnly = itemMonth.slice(5)      // MM
        const itemDay = new Date(item.date).getDate()
        
        // 如果是月份的最后一天且还未添加该月的统计，先添加月度总结
        if (!processedMonths.has(itemMonth) && monthlyStats[itemMonth]) {
          const lastDayOfMonth = new Date(itemMonth + '-01')
          lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1)
          lastDayOfMonth.setDate(0)
          
          if (itemDay === lastDayOfMonth.getDate()) {
            processedMonths.add(itemMonth)
            // 先添加月度总结
            finalReturns.push({
              id: `monthly-${itemMonth}`,
              isMonthly: true,
              month: monthOnly,
              ...monthlyStats[itemMonth]
            })
          }
        }
        
        // 再添加收益记录
        finalReturns.push(item)
      })

      // 计算统计数据
      const totalReturn = processedReturns.reduce((sum, r) => sum + r.amount, 0)
      const averageReturn = processedReturns.length > 0 ? 
        (totalReturn / processedReturns.length).toFixed(2) : '0.00'
      
      // 计算每万元日均收益和年化收益率
      const dailyReturnPer10k = processedReturns.length > 0 ? 
        (Number(averageReturn) / this.data.product.amount * 10000) : 0
      const annualizedRate = (dailyReturnPer10k * 365 / 10000 * 100).toFixed(2)

      this.setData({
        returns: finalReturns,
        totalDays,
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
      const month = item.date.slice(0, 7)  // YYYY-MM
      
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

  // 显示操作菜单
  showActionSheet(e) {
    const returnItem = e.currentTarget.dataset.return
    wx.showActionSheet({
      itemList: ['删除'],  // 移除编辑选项
      itemColor: '#ff6b6b',  // 改为红色，表示危险操作
      success: (res) => {
        if (res.tapIndex === 0) {
          // 直接调用确认删除
          this.confirmDelete(returnItem)
        }
      }
    })
  },

  // 确认删除
  confirmDelete(returnItem) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条收益记录吗？',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          this.deleteReturn(returnItem.date)
        }
      }
    })
  },

  // 编辑收益记录
  editReturn(returnItem) {
    // 跳转到编辑页面，携带当前记录的数据
    wx.navigateTo({
      url: `/pages/finance/daily-return/daily-return?productId=${this.data.product._id}&mode=edit&date=${returnItem.date}&amount=${returnItem.amount}&remark=${returnItem.remark || ''}`
    })
  },

  // 删除收益记录
  async deleteReturn(date) {
    try {
      await financeStorage.deleteDailyReturn(this.data.product._id, date)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 重新加载数据
      this.loadReturns()
    } catch (error) {
      console.error('删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
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

  // 批量导入收益记录
  async importFromText() {
    try {
      const res = await wx.showModal({
        title: '批量导入',
        content: '请将收益记录复制到剪贴板，格式为：\n日期,金额,备注\n例如：\n2025-02-16,100.00,备注1\n2025-02-15,200.00,备注2',
        confirmText: '导入',
        showCancel: true,
        cancelText: '取消'
      })

      if (!res.confirm) return

      const clipboardData = await wx.getClipboardData()
      if (!clipboardData.data) {
        wx.showToast({
          title: '剪贴板为空',
          icon: 'none'
        })
        return
      }

      const returns = clipboardData.data
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [date, amount, remark = ''] = line.split(',')
          return {
            date: date.trim(),
            amount: parseFloat(amount.trim()),
            remark: remark.trim()
          }
        })
        .filter(item => !isNaN(item.amount) && /^\d{4}-\d{2}-\d{2}$/.test(item.date))

      if (returns.length === 0) {
        wx.showToast({
          title: '没有有效数据',
          icon: 'none'
        })
        return
      }

      // 使用 this.data.product._id 而不是 this.data.product.id
      const productId = this.data.product._id
      if (!productId) {
        throw new Error('产品ID未定义')
      }

      // 批量添加收益记录
      await Promise.all(returns.map(returnData => 
        financeStorage.addDailyReturn(productId, returnData)
      ))

      wx.showToast({
        title: `成功导入${returns.length}条记录`,
        icon: 'success'
      })

      // 重新加载数据
      await this.loadProductDetail(productId)

    } catch (error) {
      console.error('导入失败:', error)
      wx.showToast({
        title: error.message || '导入失败',
        icon: 'none'
      })
    }
  }
}) 