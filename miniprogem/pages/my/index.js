import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    personalInfo: {},
    roleSwitching: false,
    gridList: [
      { name: '我的订单', icon: 'root-list', type: 'orders' },
      { name: '地址管理', icon: 'location', type: 'address' },
      { name: '申请兼职者', icon: 'edit-1', type: 'apply' },
      { name: '我的提现', icon: 'money', type: 'withdrawal' },
      { name: '退出登录', icon: 'poweroff', type: 'logout' },
    ],
  },

  async onShow() {
    await this.loadUser();
  },

  async loadUser() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({ isLoad: false, personalInfo: {} });
      return;
    }
    try {
      const user = await request('/api/user/info', 'GET');
      this.setData({
        isLoad: true,
        personalInfo: user,
      });
    } catch (e) {
      wx.removeStorageSync('access_token');
      this.setData({ isLoad: false, personalInfo: {} });
    }
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onEleClick(e) {
    const { name, url } = e.currentTarget.dataset.data;
    if (name === '退出登录') {
      wx.removeStorageSync('access_token');
      wx.removeStorageSync('user_info');
      this.setData({ isLoad: false, personalInfo: {} });
      wx.switchTab({ url: '/pages/home/index' });
      return;
    }
    if (name === '申请兼职者') {
      wx.navigateTo({ url: '/pages/my/info-edit/index' });
      return;
    }
    if (name === '地址管理') {
      wx.navigateTo({ url: '/pages/address/index' });
      return;
    }
    if (name === '我的订单') {
      wx.navigateTo({ url: '/pages/orders/index' });
      return;
    }
    if (name === '我的提现') {
      wx.navigateTo({ url: '/pages/withdrawal/index' });
      return;
    }
    if (url) {
      wx.navigateTo({ url });
      return;
    }
    this.onShowToast('#t-toast', `${name} 敬请期待`);
  },

  async onSwitchRole() {
    if (this.data.roleSwitching) return;
    const { personalInfo } = this.data;
    const nextRole = personalInfo.currentRole === 'worker' ? 'user' : 'worker';
    this.setData({ roleSwitching: true });
    try {
      const res = await request('/api/user/switch-role', 'PUT', { role: nextRole });
      wx.setStorageSync('access_token', res.token);
      await this.loadUser();
      this.onShowToast('#t-toast', `已切换为 ${res.currentRole === 'worker' ? '兼职者' : '用户'} 视角`);
    } catch (e) {
      this.onShowToast('#t-toast', e?.message || '切换失败');
    } finally {
      this.setData({ roleSwitching: false });
    }
  },
});
