import request from '~/api/request';

// pages/release/index.js

Page({
  data: {
    form: {
      type: '',
      description: '',
      address: '',
      amount: '',
    },
    submitting: false,
  },
  onTypeChange(e) {
    this.setData({ form: { ...this.data.form, type: e.detail.value } });
  },
  onDescChange(e) {
    this.setData({ form: { ...this.data.form, description: e.detail.value } });
  },
  onAddressChange(e) {
    this.setData({ form: { ...this.data.form, address: e.detail.value } });
  },
  onShow() {
    // 使用默认地址
    const cached = wx.getStorageSync('default_address');
    if (cached && !this.data.form.address) {
      this.setData({ form: { ...this.data.form, address: cached.detail || '' } });
    }
  },
  onAmountChange(e) {
    this.setData({ form: { ...this.data.form, amount: e.detail.value } });
  },
  async release() {
    const { type, description, address, amount } = this.data.form;
    if (!type || !description || !address || !amount) {
      wx.showToast({ title: '请完整填写信息', icon: 'none' });
      return;
    }
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({ title: '金额无效', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中' });
    try {
      const order = await request('/api/order', 'POST', {
        type,
        description,
        address,
        amount: amountNum,
      });
      await request(`/api/order/${order.id}/pay`, 'POST');
      wx.switchTab({
        url: `/pages/home/index`,
      });
    } catch (e) {
      wx.showToast({ title: e?.message || '发布失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
