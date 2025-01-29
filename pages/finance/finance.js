const { financeStorage } = require('../../services/finance')
const wxCharts = require('../../utils/wxcharts')

Page({
  data: {
    products: [],
    chartDataMap: {},
    currentPages: {},
    pageSize: 30,
    yAxisRanges: {}
  },

  onLoad() {
    this.loadProducts()
  },

  onShow() {
    this.loadProducts()
  },

  // 加载理财产品列表
  loadProducts() {
    const products = financeStorage.getProducts()
    const chartDataMap = {}
    const currentPages = {}
    const yAxisRanges = {}  // 创建新的对象而不是直接修改 this.data
    
    products.forEach(product => {
      // 获取每个产品的收益记录并按日期降序排序
      const returns = financeStorage.getDailyReturns(product.id)
      returns.sort((a, b) => new Date(b.date) - new Date(a.date))
      
      // 计算整体的Y轴范围
      const allAmounts = returns.map(item => item.amount)
      const maxAmount = Math.max(...allAmounts)
      const minAmount = Math.min(...allAmounts)
      const valueRange = maxAmount - minAmount
      yAxisRanges[product.id] = {
        max: valueRange === 0 ? maxAmount * 1.1 : maxAmount + valueRange * 0.1,
        min: valueRange === 0 ? maxAmount * 0.9 : Math.max(0, minAmount - valueRange * 0.1)
      }
      
      // 初始化每个产品的图表数据和页码
      chartDataMap[product.id] = returns.slice(0, this.data.pageSize).reverse()
      currentPages[product.id] = 0
    })

    this.setData({
      products,
      chartDataMap,
      currentPages,
      yAxisRanges
    }, () => {
      // 为每个产品初始化图表
      products.forEach(product => {
        this.initChart(product.id)
      })
    })
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
    wx.navigateTo({
      url: `/pages/finance/daily-return/daily-return?productId=${id}`
    })
  },

  // 删除理财产品
  deleteProduct(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，是否继续？',
      success: (res) => {
        if (res.confirm) {
          financeStorage.deleteProduct(id)
          this.loadProducts()
        }
      }
    })
  },

  initChart(productId) {
    const chartData = this.data.chartDataMap[productId]
    if (!chartData || chartData.length === 0) return

    const dates = chartData.map(item => item.date.slice(5)) // 只显示月-日
    const amounts = chartData.map(item => item.amount)

    const ctx = wx.createCanvasContext(`chart-${productId}`)
    
    // 获取系统信息以适配屏幕宽度
    const systemInfo = wx.getSystemInfoSync()
    // 将rpx转换为px
    const canvasWidth = systemInfo.windowWidth * 0.9  // 留出10%的边距
    const canvasHeight = 250  // 增加画布高度
    const padding = {
      top: 30,    // 增加顶部边距
      right: 40,  // 增加右边距
      bottom: 40, // 增加底部边距
      left: 60    // 增加左边距，为标签留出更多空间
    }
    const chartWidth = canvasWidth - padding.left - padding.right
    const chartHeight = canvasHeight - padding.top - padding.bottom

    // 使用固定的Y轴范围
    const { max: adjustedMax, min: adjustedMin } = this.data.yAxisRanges[productId]
    const yScale = chartHeight / (adjustedMax - adjustedMin || 1)
    const xScale = chartWidth / (dates.length - 1)

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 先绘制Y轴标签
    ctx.setFontSize(11)
    ctx.setTextAlign('right')
    ctx.setTextBaseline('middle')
    ctx.setFillStyle('#666666')
    const yGridCount = 4
    for (let i = 0; i <= yGridCount; i++) {
      const value = adjustedMax - (adjustedMax - adjustedMin) * (i / yGridCount)
      const y = padding.top + (chartHeight / yGridCount) * i
      const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2)
      console.log('Drawing label:', formattedValue, 'at position:', padding.left - 8, y)
      ctx.fillText(formattedValue, padding.left - 8, y)
    }

    // 绘制网格线
    ctx.setLineWidth(0.5)
    ctx.setStrokeStyle('#eeeeee')
    
    // 横向网格线
    for (let i = 0; i <= yGridCount; i++) {
      const y = padding.top + (chartHeight / yGridCount) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(canvasWidth - padding.right, y)
      ctx.stroke()
    }

    // 绘制折线
    ctx.beginPath()
    ctx.setLineWidth(2)
    ctx.setStrokeStyle('#1296db')
    chartData.forEach((item, index) => {
      const x = padding.left + index * xScale
      // 修正Y轴坐标计算方式，使其与标签对应
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

    // 绘制X轴标签
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    // 显示更多日期标签
    const labelCount = 5  // 减少标签数量，为最后一个日期留出更多空间
    const labelStep = Math.max(1, Math.floor((dates.length - 2) / (labelCount - 1)))  // 不包括最后一个日期在内计算步长
    dates.forEach((date, index) => {
      // 显示第一个、最后一个和中间均匀分布的标签
      if (index === 0 || index === dates.length - 1 || 
          (index % labelStep === 0 && index < dates.length - 1)) {
        const x = padding.left + index * xScale
        if (index === dates.length - 1) {
          ctx.setTextAlign('right')
          ctx.fillText(date, canvasWidth - padding.right + 15, canvasHeight - 15)  // 增加最后一个日期的右边距
          // 在最后一个日期前添加一个小间隔
          const prevX = padding.left + (dates.length - 2) * xScale
          if (prevX + 30 > x) {  // 如果与前一个标签距离太近
            return  // 跳过这个标签
          }
        } else {
          ctx.setTextAlign('center')
          ctx.fillText(date, x, canvasHeight - 15)
        }
      }
    })

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