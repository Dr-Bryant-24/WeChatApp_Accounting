const { baseUrl } = require('../config/app.config')

// 判断环境的函数
const isDev = () => {
  const accountInfo = wx.getAccountInfoSync();
  return accountInfo.miniProgram.envVersion === 'develop' || 
         wx.getSystemInfoSync().platform === 'devtools';
}

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const requestUrl = `${baseUrl}${url}`
    console.log('=== 请求开始 ===')
    console.log('环境:', isDev() ? '开发' : '生产')
    console.log('请求URL:', requestUrl)
    console.log('请求方法:', options.method || 'GET')
    console.log('请求数据:', options.data)
    
    wx.request({
      url: requestUrl,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('=== 请求成功 ===')
        console.log('状态码:', res.statusCode)
        console.log('响应数据:', res.data)
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('=== 请求失败 ===')
          console.error('状态码:', res.statusCode)
          console.error('错误信息:', res.data)
          
          if (url.includes('/bills') || url.includes('/products')) {
            resolve([]);
          } else {
            reject(new Error(res.data?.message || '请求失败'));
          }
        }
      },
      fail: (err) => {
        console.error('=== 请求失败 ===')
        console.error('错误信息:', err)
        console.error('请求URL:', requestUrl)
        
        if (url.includes('/bills') || url.includes('/products')) {
          resolve([]);
        } else {
          reject(err);
        }
      }
    });
  });
};

module.exports = {
  get: (url) => request(url),
  post: (url, data) => request(url, { method: 'POST', data }),
  put: (url, data) => request(url, { method: 'PUT', data }),
  delete: (url) => request(url, { method: 'DELETE' })
}; 