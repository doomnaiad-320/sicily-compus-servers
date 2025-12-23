import request from '~/api/request';

Page({
  data: {
    isCheck: false,
    isLoading: false,
  },

  // 用户协议选择变更
  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      isCheck: value === 'agree',
    });
  },

  // 微信一键登录
  async wxLogin() {
    if (!this.data.isCheck) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }

    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      // 1. 调用 wx.login 获取 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });

      const { code } = loginRes;
      if (!code) {
        throw new Error('获取登录凭证失败');
      }

      // 2. 尝试获取用户信息（可选，用户可能拒绝）
      let nickname = '微信用户';
      let avatar = '';

      // 注意：wx.getUserProfile 需要用户主动点击触发
      // 这里我们先用默认昵称，后续可以在个人中心让用户授权

      // 3. 发送 code 到后端换取 token
      const res = await request('/api/user/login', 'POST', {
        code,
        nickname,
        avatar,
      });

      // 4. 存储登录信息
      wx.setStorageSync('access_token', res.token);
      wx.setStorageSync('user_info', res.user);

      wx.showToast({ title: '登录成功', icon: 'success' });

      // 5. 跳转到首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/index' });
      }, 1000);

    } catch (e) {
      console.error('登录失败:', e);
      wx.showToast({ title: e?.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 获取用户信息并更新（授权头像昵称）
  async getUserProfile() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject,
        });
      });

      const { nickName, avatarUrl } = res.userInfo;

      // 更新用户信息到服务器
      await request('/api/user/info', 'PUT', {
        nickname: nickName,
        avatar: avatarUrl,
      });

      // 更新本地存储
      const userInfo = wx.getStorageSync('user_info') || {};
      userInfo.nickname = nickName;
      userInfo.avatar = avatarUrl;
      wx.setStorageSync('user_info', userInfo);

      wx.showToast({ title: '更新成功', icon: 'success' });
    } catch (e) {
      console.log('用户拒绝授权或授权失败');
    }
  },
});
