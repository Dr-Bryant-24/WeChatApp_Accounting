Page({
  data: {
    years: [],
    months: [],
    days: [],
    value: [0, 0, 0],
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0
  },

  onLoad() {
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

    // 获取传入的初始日期
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('initialDate', (data) => {
      const initialDate = new Date(data.date)
      const yearIndex = years.indexOf(initialDate.getFullYear())
      const monthIndex = initialDate.getMonth()
      const dayIndex = initialDate.getDate() - 1

      this.setData({
        value: [yearIndex, monthIndex, dayIndex],
        selectedYear: years[yearIndex],
        selectedMonth: months[monthIndex],
        selectedDay: days[dayIndex]
      })
    })
  },

  bindChange(e) {
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

  onCancel() {
    wx.navigateBack()
  },

  onConfirm() {
    const { selectedYear, selectedMonth, selectedDay } = this.data
    const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.emit('selectDate', date)
    wx.navigateBack()
  }
}) 