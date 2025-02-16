const appConfig = {
  version: '1.1.0',
  versionCode: 1,
  buildDate: '2025-02-16',
  appName: '理财记账本'
}

const config = {
  // 使用配置区分开发和生产环境
  development: {
    baseUrl: 'https://api.pigpigli.cloud/api'  // 添加 /api 路径
  },
  production: {
    baseUrl: 'https://api.pigpigli.cloud/api'  // 添加 /api 路径
  }
}

// 使用微信小程序的方式判断环境
const isDev = () => {
  // 通过判断是否处于调试模式来区分环境
  const accountInfo = wx.getAccountInfoSync();
  return accountInfo.miniProgram.envVersion === 'develop' || 
         wx.getSystemInfoSync().platform === 'devtools';
}

// 导出配置
module.exports = {
  baseUrl: config.development.baseUrl,  // 统一使用 HTTPS 地址
  appConfig  // 添加 appConfig 导出
} 