import config from "~/config";

const { baseUrl } = config;
const delay = config.isMock ? 200 : 0;

function request(url, method = "GET", data = {}) {
  const header = {
    "content-type": "application/json",
  };
  const tokenString = wx.getStorageSync("access_token");
  if (tokenString) {
    header.Authorization = `Bearer ${tokenString}`;
  }

  return new Promise((resolve, reject) => {
    const isAbsolute = /^https?:\/\//.test(url);
    const requestUrl = isAbsolute ? url : config.isMock ? url : baseUrl + url;

    wx.request({
      url: requestUrl,
      method,
      data,
      dataType: "json",
      header,
      success(res) {
        setTimeout(() => {
          // mock 响应没有 statusCode，这里做兼容
          const payload = res.data !== undefined ? res.data : res;
          const statusCode = res.statusCode ?? payload.code ?? 200;

          if (statusCode >= 200 && statusCode < 300) {
            resolve(payload);
          } else if (statusCode === 401 || payload.code === 401) {
            wx.removeStorageSync("access_token");
            wx.showToast({ title: "请重新登录", icon: "none" });
            wx.switchTab({ url: "/pages/my/index" });
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
