import { initIcons } from './utils/icon'
const { financeStorage } = require('./services/finance')

App({
  onLaunch() {
    // 初始化图标
    initIcons()

    // 初始化财务存储服务
    financeStorage.init()

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        console.log('网络已连接，开始同步离线操作')
        financeStorage.syncOfflineOperations()
      } else {
        console.log('网络已断开，停止自动同步')
        financeStorage.stopAutoSync()
      }
    })

    // 获取当前网络状态
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType !== 'none') {
          console.log('网络已连接，开始同步离线操作')
          financeStorage.syncOfflineOperations()
        } else {
          console.log('无网络连接，使用本地缓存')
          financeStorage.stopAutoSync()
        }
      }
    })
  },

  onHide() {
    // 应用进入后台时停止自动同步
    financeStorage.stopAutoSync()
  },

  onShow() {
    // 应用回到前台时恢复自动同步
    financeStorage.startAutoSync()
  }
}) 