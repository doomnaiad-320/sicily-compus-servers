import request from '~/api/request';

Page({
  data: {
    phoneNumber: '',
    isPhoneNumber: false,
    isCheck: false,
    isSubmit: false,
    isPasswordLogin: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  /* 自定义功能函数 */
  changeSubmit() {
    const canSubmit =
      (this.data.isPasswordLogin
        ? this.data.passwordInfo.account !== '' && this.data.passwordInfo.password !== ''
        : this.data.isPhoneNumber) && this.data.isCheck;
    this.setData({ isSubmit: canSubmit });
  },

  // 手机号变更
  onPhoneInput(e) {
    const isPhoneNumber = /^[1][3,4,5,7,8,9][0-9]{9}$/.test(e.detail.value);
    this.setData({
      isPhoneNumber,
      phoneNumber: e.detail.value,
    });
    this.changeSubmit();
  },

  // 用户协议选择变更
  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onAccountChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  // 切换登录方式
  changeLogin() {
    this.setData({ isPasswordLogin: !this.data.isPasswordLogin, isSubmit: false });
  },

  async login() {
    if (!this.data.isSubmit) return;
    wx.showLoading({ title: '登录中' });
    try {
      // 简化：模拟 openid，真实环境可替换为 wx.login 拿 code 再换 openid
      let openid = wx.getStorageSync('mock_openid');
      if (!openid) {
        openid = `mock-openid-${Date.now()}`;
        wx.setStorageSync('mock_openid', openid);
      }
      const nickname = `用户${openid.slice(-4)}`;
      const res = await request('/api/user/login', 'POST', {
        openid,
        nickname,
      });
      wx.setStorageSync('access_token', res.token);
      wx.setStorageSync('user_info', res.user);
      wx.switchTab({
        url: `/pages/home/index`,
      });
    } catch (e) {
      wx.showToast({ title: e?.message || '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
