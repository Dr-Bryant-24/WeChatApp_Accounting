const { financeStorage } = require('../../services/finance')
const wxCharts = require('../../utils/wxcharts')

Page({
  data: {
    products: []
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
    const productsWithStats = products.map(product => {
      const returns = financeStorage.getDailyReturns(product.id)
      const totalReturn = returns.reduce((sum, item) => sum + Number(item.amount), 0)
      return {
        ...product,
        averageReturn: financeStorage.calculateAverageReturn(product.id),
        totalReturn: totalReturn.toFixed(2)
      }
    })

    this.setData({ products: productsWithStats }, () => {
      // 为每个产品绘制图表
      wx.nextTick(() => {
        productsWithStats.forEach(product => {
          this.drawReturnChart(product.id)
        })
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

  // 修改绘制图表的方法
  drawReturnChart(productId) {
    const returns = financeStorage.getDailyReturns(productId)
    if (returns.length === 0) return

    // 按日期排序
    const sortedReturns = returns.sort((a, b) => new Date(a.date) - new Date(b.date))

    // 处理数据点，标记是否与前一个点连续
    const chartData = sortedReturns.map((item, index) => {
      const currentDate = new Date(item.date)
      const prevDate = index > 0 ? new Date(sortedReturns[index - 1].date) : null
      
      // 判断是否连续（日期差是否为1天）
      const isContinuous = prevDate ? 
        (currentDate - prevDate) / (1000 * 60 * 60 * 24) === 1 : 
        true

      return {
        date: currentDate,
        return: Number(item.amount),
        isContinuous
      }
    })

    try {
      new wxCharts({
        canvasId: `returnChart${productId}`,
        type: 'line',
        categories: chartData.map(item => `${item.date.getMonth() + 1}/${item.date.getDate()}`),
        series: [{
          name: '日收益',
          data: chartData.map(item => item.return),
          format: function (val) {
            return '' // 不显示数值
          }
        }],
        yAxis: {
          title: '收益金额',
          format: function (val) {
            return '¥' + val.toFixed(2)
          },
          min: 0
        },
        width: wx.getSystemInfoSync().windowWidth - 60,
        height: 200,
        dataLabel: false,
        legend: false,
        extra: {
          lineStyle: 'curve',
          lineDash: chartData.map(item => !item.isContinuous) // 不连续的点使用虚线
        }
      })
    } catch (error) {
      console.error('绘制图表失败:', error)
    }
  }
}) 