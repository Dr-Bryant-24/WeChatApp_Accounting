const { icons } = require('../assets/images/icons')

// 将 Base64 转换为临时文件路径
const base64ToPath = function(base64) {
  return new Promise((resolve, reject) => {
    const [, format, bodyData] = /data:image\/(\w+);base64,(.*)/.exec(base64) || [];
    if (!format) {
      reject(new Error('ERROR_BASE64SRC_PARSE'));
    }
    const filePath = `${wx.env.USER_DATA_PATH}/tmp_${Math.random().toString(36).slice(-6)}.${format}`;
    const buffer = wx.base64ToArrayBuffer(bodyData);
    wx.getFileSystemManager().writeFile({
      filePath,
      data: buffer,
      encoding: 'binary',
      success: () => resolve(filePath),
      fail: reject
    });
  });
};

// 初始化所有图标
const initIcons = async function() {
  const iconPaths = {};
  try {
    for (let key in icons) {
      const path = await base64ToPath(icons[key]);
      iconPaths[key] = path;
    }
    // 将图标路径存储到全局数据
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.iconPaths = iconPaths;
  } catch (error) {
    console.error('Failed to initialize icons:', error);
  }
};

module.exports = {
  initIcons
} 