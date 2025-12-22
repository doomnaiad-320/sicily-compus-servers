import request from '~/api/request';

Page({
  data: {
    balance: 0,
    alipayAccount: '',
    amount: '',
    loading: false,
    list: [],
  },

  onShow() {
    this.fetchBalance();
    this.fetchList();
  },

  async fetchBalance() {
    try {
      const res = await request('/api/worker/balance', 'GET');
      this.setData({ balance: res.balance, alipayAccount: res.alipayAccount || '' });
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  async fetchList() {
    try {
      const list = await request('/api/withdrawal', 'GET');
      this.setData({ list });
    } catch (e) {
      // ignore
    }
  },

  onInput(e) {
    this.setData({ amount: e.detail.value });
  },

  onAlipayChange(e) {
    this.setData({ alipayAccount: e.detail.value });
  },

  async onSubmit() {
    const { amount, alipayAccount } = this.data;
    if (!amount || Number(amount) <= 0) {
      wx.showToast({ title: '金额无效', icon: 'none' });
      return;
    }
    if (!alipayAccount) {
      wx.showToast({ title: '请填写支付宝账号', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      await request('/api/worker/alipay', 'PUT', { alipayAccount });
      await request('/api/withdrawal', 'POST', { amount: Number(amount), alipayAccount });
      wx.showToast({ title: '已提交', icon: 'success' });
      this.setData({ amount: '' });
      this.fetchBalance();
      this.fetchList();
    } catch (e) {
      wx.showToast({ title: e?.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
