const { financeStorage } = require('../../services/finance')
const wxCharts = require('../../utils/wxcharts')

Page({
  data: {
    products: [],
    chartDataMap: {},
    currentPages: {},
    pageSize: 30,
    yAxisRanges: {},
    todayTotalReturn: '0.00',
    monthTotalReturn: '0.00'
  },

  onLoad() {
    this.loadProducts()
  },

  onShow() {
    this.loadProducts()
  },

  // 加载理财产品列表
  async loadProducts() {
    try {
      const products = await financeStorage.getProducts()
      console.log('获取到的产品列表:', products)
      const chartDataMap = {}
      const currentPages = {}
      const yAxisRanges = {}
      
      // 计算今日和本月总收益
      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)
      const monthStr = today.toISOString().slice(0, 7)
      
      let todayTotal = 0
      let monthTotal = 0
      
      // 处理每个产品的数据
      const processedProducts = await Promise.all(products.map(async (product) => {
        console.log('处理产品:', product)
        
        // 获取每个产品的收益记录并按日期降序排序
        const returns = await financeStorage.getDailyReturns(product._id)
        console.log('产品收益记录:', returns)
        returns.sort((a, b) => new Date(b.date) - new Date(a.date))
        
        // 计算今日收益
        const todayReturn = returns.find(r => r.date === todayStr)
        if (todayReturn) {
          todayTotal += todayReturn.amount
        }
        
        // 计算本月收益
        const monthReturns = returns.filter(r => r.date.startsWith(monthStr))
        monthTotal += monthReturns.reduce((sum, r) => sum + r.amount, 0)
        
        // 计算平均日收益和累计收益
        const totalReturn = returns.reduce((sum, r) => sum + r.amount, 0)
        const averageReturn = returns.length > 0 ? (totalReturn / returns.length).toFixed(2) : '0.00'
        
        // 计算整体的Y轴范围
        const allAmounts = returns.map(item => item.amount)
        const maxAmount = Math.max(...allAmounts)
        const minAmount = Math.min(...allAmounts)
        const valueRange = maxAmount - minAmount
        yAxisRanges[product._id] = {
          max: valueRange === 0 ? maxAmount * 1.1 : maxAmount + valueRange * 0.1,
          min: valueRange === 0 ? maxAmount * 0.9 : minAmount - valueRange * 0.1
        }
        
        // 初始化每个产品的图表数据和页码
        chartDataMap[product._id] = returns.slice(0, this.data.pageSize).reverse()
        currentPages[product._id] = 0

        // 返回添加了统计数据的产品对象
        return {
          ...product,
          averageReturn,
          totalReturn: totalReturn.toFixed(2)
        }
      }))

      this.setData({
        products: processedProducts,
        chartDataMap,
        currentPages,
        yAxisRanges,
        todayTotalReturn: todayTotal.toFixed(2),
        monthTotalReturn: monthTotal.toFixed(2)
      }, () => {
        processedProducts.forEach(product => {
          this.initChart(product._id)
        })
      })
    } catch (error) {
      console.error('加载产品列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 跳转到添加理财产品页面
  navigateToAdd() {
    wx.navigateTo({
      url: '/pages/finance/add-product/add-product'
    })
  },

  // 跳转到记录每日收益页面
  addDailyReturn(e) {
    const { id } = e.currentTarget.dataset
    console.log('添加收益的产品ID:', id)
    
    wx.navigateTo({
      url: `/pages/finance/daily-return/daily-return?productId=${id}`
    })
  },

  // 删除理财产品
  async deleteProduct(e) {
    const { id } = e.currentTarget.dataset
    
    try {
      await wx.showModal({
        title: '确认删除',
        content: '删除后数据无法恢复，确认删除吗？'
      })
      
      await financeStorage.deleteProduct(id)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      this.loadProducts()
    } catch (error) {
      console.error('删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  initChart(productId) {
    const chartData = this.data.chartDataMap[productId]
    if (!chartData || chartData.length === 0) return

    const canvasId = `chart-${productId}`
    // 获取系统信息以适配屏幕宽度
    const systemInfo = wx.getSystemInfoSync()
    // 将rpx转换为px
    const canvasWidth = systemInfo.windowWidth * 0.8  // 留出20%的边距
    const canvasHeight = 200  // 固定高度

    const ctx = wx.createCanvasContext(canvasId)

    // 设置内边距
    const padding = {
      left: 50,
      right: 30,
      top: 20,
      bottom: 30
    }

    // 计算图表实际绘制区域
    const chartWidth = canvasWidth - padding.left - padding.right
    const chartHeight = canvasHeight - padding.top - padding.bottom

    // 获取Y轴范围
    const yRange = this.data.yAxisRanges[productId]
    const adjustedMin = yRange.min
    const adjustedMax = yRange.max
    const valueRange = adjustedMax - adjustedMin

    // 计算Y轴刻度
    const yScale = chartHeight / valueRange
    const xScale = chartWidth / (chartData.length - 1)

    // 绘制Y轴
    ctx.beginPath()
    ctx.setStrokeStyle('#ccc')
    ctx.setLineWidth(1)
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, canvasHeight - padding.bottom)
    ctx.stroke()

    // 绘制Y轴刻度和网格线
    const yLabelCount = 5
    const yLabelStep = valueRange / (yLabelCount - 1)
    for (let i = 0; i < yLabelCount; i++) {
      const y = padding.top + i * (chartHeight / (yLabelCount - 1))
      const value = adjustedMax - i * yLabelStep
      
      // 绘制刻度值
      ctx.setFontSize(10)
      ctx.setTextAlign('right')
      ctx.fillText(value.toFixed(2), padding.left - 5, y + 3)
      
      // 绘制网格线
      ctx.beginPath()
      ctx.setStrokeStyle('#f0f0f0')
      ctx.moveTo(padding.left, y)
      ctx.lineTo(canvasWidth - padding.right, y)
      ctx.stroke()
    }

    // 绘制折线
    ctx.beginPath()
    ctx.setStrokeStyle('#1296db')
    ctx.setLineWidth(2)
    const dates = chartData.map(item => item.date)
    chartData.forEach((item, index) => {
      const x = padding.left + index * xScale
      const y = padding.top + chartHeight - (item.amount - adjustedMin) * yScale
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // 绘制数据点
    chartData.forEach((item, index) => {
      const x = padding.left + index * xScale
      const y = padding.top + chartHeight - (item.amount - adjustedMin) * yScale
      ctx.beginPath()
      ctx.setFillStyle('#1296db')
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // 格式化日期，只显示月-日
    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}-${day}`
    }
    
    // 绘制X轴标签
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    // 计算要显示的标签数量和间隔
    const minLabelSpacing = 50  // 标签之间的最小间距(px)
    const maxLabels = Math.floor(chartWidth / minLabelSpacing)  // 根据图表宽度计算最大标签数
    const labelStep = Math.max(1, Math.ceil(dates.length / maxLabels))
    
    dates.forEach((date, index) => {
      // 均匀显示标签，但最后一个日期要单独处理
      if (index === 0 || (index % labelStep === 0 && index < dates.length - 1)) {
        const x = padding.left + index * xScale
        ctx.setTextAlign('center')
        ctx.fillText(formatDate(date), x, canvasHeight - 15)
      }
    })
    
    // 单独处理最后一个日期标签
    const lastX = padding.left + (dates.length - 1) * xScale
    const lastLabelWidth = ctx.measureText(formatDate(dates[dates.length - 1])).width
    const prevX = padding.left + ((Math.floor((dates.length - 1) / labelStep) * labelStep)) * xScale
    
    // 只有当最后一个标签与前一个标签不会重叠时才显示
    if (lastX - prevX > lastLabelWidth + 20) {  // 20px 作为额外间距
      ctx.setTextAlign('center')
      ctx.fillText(formatDate(dates[dates.length - 1]), lastX, canvasHeight - 15)
    }

    ctx.draw()
  },

  // 处理图表滑动
  onChartTouchStart(e) {
    const { productid } = e.currentTarget.dataset
    this.touchStartX = e.touches[0].x
    this.currentProductId = productid
  },

  onChartTouchEnd(e) {
    const touchEndX = e.changedTouches[0].x
    const moveDistance = touchEndX - this.touchStartX
    const productId = this.currentProductId
    const returns = financeStorage.getDailyReturns(productId)
    returns.sort((a, b) => new Date(b.date) - new Date(a.date))

    if (Math.abs(moveDistance) > 50) { // 滑动距离超过50才触发翻页
      const currentPage = this.data.currentPages[productId]
      let newPage = currentPage

      if (moveDistance > 0 && currentPage > 0) {
        // 右滑，显示上一页
        newPage = currentPage - 1
      } else if (moveDistance < 0 && (currentPage + 1) * this.data.pageSize < returns.length) {
        // 左滑，显示下一页
        newPage = currentPage + 1
      }

      if (newPage !== currentPage) {
        const start = newPage * this.data.pageSize
        const chartData = returns.slice(start, start + this.data.pageSize).reverse()
        
        this.setData({
          [`chartDataMap.${productId}`]: chartData,
          [`currentPages.${productId}`]: newPage
        }, () => {
          this.initChart(productId)
        })
      }
    }
  },

  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/finance/finance-detail/finance-detail?id=${id}`
    })
  }
}) 