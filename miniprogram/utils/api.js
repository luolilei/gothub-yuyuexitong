const app = getApp();

function request(path, options = {}) {
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error((res.data && res.data.message) || '请求失败'));
      },
      fail() {
        reject(new Error('无法连接服务器'));
      }
    });
  });
}

module.exports = { request };
