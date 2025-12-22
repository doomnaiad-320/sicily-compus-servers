import config from '~/config';

const { baseUrl } = config;
const delay = config.isMock ? 500 : 0;

function request(url, method = 'GET', data = {}) {
  const header = {
    'content-type': 'application/json',
  };
  const tokenString = wx.getStorageSync('access_token');
  if (tokenString) {
    header.Authorization = `Bearer ${tokenString}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      dataType: 'json',
      header,
      success(res) {
        setTimeout(() => {
          const { statusCode, data: payload } = res;
          if (statusCode >= 200 && statusCode < 300) {
            resolve(payload);
          } else if (statusCode === 401) {
            wx.removeStorageSync('access_token');
            wx.showToast({ title: '请重新登录', icon: 'none' });
            wx.switchTab({ url: '/pages/my/index' });
            reject(payload);
          } else {
            reject(payload);
          }
        }, delay);
      },
      fail(err) {
        setTimeout(() => {
          reject(err);
        }, delay);
      },
    });
  });
}

// 导出请求和服务地址
export default request;
