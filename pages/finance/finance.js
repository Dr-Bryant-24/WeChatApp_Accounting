const { financeStorage } = require('../../services/finance')
const wxCharts = require('../../utils/wxcharts')
const { appConfig } = require('../../config/app.config')

Page({
  data: {
    products: [],
    chartDataMap: {},
    currentPages: {},
    pageSize: 7,
    yAxisRanges: {},
    todayTotalReturn: '0.00',
    monthTotalReturn: '0.00',
    version: appConfig.version,
    scrollOffsets: {},
    isDragging: false
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
        
        // 修改这里：存储完整的收益记录数据
        chartDataMap[product._id] = returns  // 存储所有数据，而不是只存储前7条
        currentPages[product._id] = 0

        return {
          ...product,
          averageReturn,
          totalReturn: totalReturn.toFixed(2)
        }
      }))

      // 更新状态
      this.setData({
        products: processedProducts,
        chartDataMap,
        currentPages,
        yAxisRanges,
        todayTotalReturn: todayTotal.toFixed(2),
        monthTotalReturn: monthTotal.toFixed(2)
      }, () => {
        // 初始化所有产品的图表
        processedProducts.forEach(product => {
          this.initChart(product._id)  // 初始显示第一页数据
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

  // 初始化图表
  initChart(productId) {
    this.drawChart(productId, this.data.scrollOffsets[productId] || 0)
  },

  // 处理触摸开始
  handleTouchStart(e) {
    const productId = e.currentTarget.dataset.productid
    if (!productId) return

    this.touchStartX = e.touches[0].clientX
    this.currentProductId = productId
    this.isDragging = true
    
    // 记录初始偏移量
    this.initialOffset = this.data.scrollOffsets[productId] || 0
    
    // 记录触摸点的初始位置
    const touch = e.touches[0]
    this.startX = touch.clientX
  },

  // 处理触摸移动
  handleTouchMove(e) {
    if (!this.isDragging || !this.currentProductId) return

    const touch = e.touches[0]
    const moveX = touch.clientX - this.startX
    const productId = this.currentProductId
    const chartData = this.data.chartDataMap[productId]
    
    // 计算新的偏移量，使柱子跟随手指移动
    let newOffset = this.initialOffset + moveX
    
    // 计算可显示的数据量和总宽度
    const barWidth = 30
    const barSpacing = 20
    const totalBarWidth = barWidth + barSpacing
    
    // 限制滚动范围
    const maxOffset = 50
    const minOffset = -((chartData.length - 6) * totalBarWidth) - 50
    newOffset = Math.min(maxOffset, Math.max(minOffset, newOffset))
    
    // 直接更新并重绘
    const scrollOffsets = { ...this.data.scrollOffsets }
    scrollOffsets[productId] = newOffset
    
    this.setData({ scrollOffsets })
    this.drawChart(productId, newOffset)
  },

  // 处理触摸结束
  handleTouchEnd(e) {
    if (!this.isDragging) return
    
    // 清除定时器
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }
    
    const productId = this.currentProductId
    if (productId) {
      // 计算最终位置（对齐到最近的柱子）
      const barWidth = 30
      const barSpacing = 20
      const totalBarWidth = barWidth + barSpacing
      const currentOffset = this.data.scrollOffsets[productId]
      
      // 对齐到最近的柱子位置
      const alignedOffset = Math.round(currentOffset / totalBarWidth) * totalBarWidth
      
      // 添加弹性动画效果
      const scrollOffsets = { ...this.data.scrollOffsets }
      scrollOffsets[productId] = alignedOffset
      
      this.setData({ scrollOffsets }, () => {
        this.drawChart(productId, alignedOffset)
      })
    }
    
    // 清理状态
    this.isDragging = false
    this.currentProductId = null
    this.startX = null
    this.initialOffset = null
  },

  // 优化绘图方法
  drawChart(productId, offset = 0) {
    const chartData = this.data.chartDataMap[productId]
    if (!chartData || chartData.length === 0) return

    const canvasId = `chart-${productId}`
    const query = wx.createSelectorQuery()
    
    query.select(`#chart-${productId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        const systemInfo = wx.getSystemInfoSync()
        const canvasWidth = systemInfo.windowWidth * 0.92
        const canvasHeight = 180
        
        // 设置画布尺寸
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        
        // 清空画布
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        
        // 设置内边距
        const padding = {
          left: 40,
          right: 20,
          top: 20,
          bottom: 30
        }

        // 计算柱子的尺寸和可显示数量
        const barWidth = 30
        const barSpacing = 20
        const totalBarWidth = barWidth + barSpacing
        const visibleBars = Math.floor((canvasWidth - padding.left - padding.right) / totalBarWidth)
        
        // 计算最大偏移量（使最新的数据显示在最右边）
        const maxOffset = -((chartData.length - visibleBars) * totalBarWidth)
        
        // 如果没有设置偏移量（初始加载），则设置为最大偏移量，显示最新数据
        if (!this.data.scrollOffsets[productId]) {
          const scrollOffsets = { ...this.data.scrollOffsets }
          scrollOffsets[productId] = maxOffset
          this.setData({ scrollOffsets })
          offset = maxOffset
        }

        // 计算数据范围
        const visibleData = [...chartData].reverse()
        
        // 计算Y轴范围
        const amounts = visibleData.map(item => item.amount)
        const maxAmount = Math.max(Math.max(...amounts), 0)
        const minAmount = Math.min(Math.min(...amounts), 0)
        const valueRange = Math.max(Math.abs(maxAmount), Math.abs(minAmount)) * 2
        const yAxisCenter = canvasHeight / 2
        const yScale = (canvasHeight - padding.top - padding.bottom) / valueRange
        
        // 绘制背景网格
        ctx.strokeStyle = '#f5f5f5'
        ctx.lineWidth = 1
        
        // 计算起始X坐标（考虑偏移量）
        const startX = padding.left + offset
        
        // 绘制柱状图
        visibleData.forEach((item, index) => {
          const x = startX + index * totalBarWidth
          
          // 只绘制可见区域内的柱子
          if (x + barWidth < padding.left || x > canvasWidth - padding.right) return

          const height = Math.abs(item.amount) * yScale
          const y = item.amount >= 0 ? 
            yAxisCenter - height : 
            yAxisCenter

          // 创建渐变
          const grd = ctx.createLinearGradient(x, y, x, y + height)
          if (item.amount >= 0) {
            grd.addColorStop(0, 'rgba(255, 145, 48, 0.8)')
            grd.addColorStop(1, 'rgba(255, 145, 48, 0.2)')
          } else {
            grd.addColorStop(0, 'rgba(64, 169, 255, 0.2)')
            grd.addColorStop(1, 'rgba(64, 169, 255, 0.8)')
          }

          // 绘制圆角柱子
          const radius = 4
          ctx.beginPath()
          ctx.fillStyle = grd
          
          // 绘制圆角矩形
          if (item.amount >= 0) {
            ctx.moveTo(x + radius, y)
            ctx.lineTo(x + barWidth - radius, y)
            ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
            ctx.lineTo(x + barWidth, y + height)
            ctx.lineTo(x, y + height)
            ctx.lineTo(x, y + radius)
            ctx.arcTo(x, y, x + radius, y, radius)
          } else {
            ctx.moveTo(x + radius, y)
            ctx.lineTo(x + barWidth - radius, y)
            ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
            ctx.lineTo(x + barWidth, y + height - radius)
            ctx.arcTo(x + barWidth, y + height, x + barWidth - radius, y + height, radius)
            ctx.lineTo(x + radius, y + height)
            ctx.arcTo(x, y + height, x, y + height - radius, radius)
            ctx.lineTo(x, y + radius)
            ctx.arcTo(x, y, x + radius, y, radius)
          }
          
          ctx.closePath()
          ctx.fill()

          // 在柱子上方显示数值
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = item.amount >= 0 ? '#FF914D' : '#40A9FF'
          const valueY = item.amount >= 0 ? 
            y - 5 : 
            y + height + 12
          ctx.fillText(item.amount.toFixed(2), x + barWidth / 2, valueY)

          // 绘制日期标签
          const date = new Date(item.date)
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const day = date.getDate().toString().padStart(2, '0')
          ctx.fillStyle = '#999'
          ctx.fillText(`${month}-${day}`, x + barWidth / 2, canvasHeight - 8)
        })

        // 绘制中轴线
        ctx.beginPath()
        ctx.strokeStyle = '#e8e8e8'
        ctx.lineWidth = 1
        ctx.moveTo(20, yAxisCenter)
        ctx.lineTo(canvasWidth - 20, yAxisCenter)
        ctx.stroke()
      })
  },

  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/finance/finance-detail/finance-detail?id=${id}`
    })
  }
}) 