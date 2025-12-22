import request from '~/api/request';

Page({
  data: {
    orderId: '',
    rating: 5,
    content: '',
    loading: false,
  },

  onLoad(query) {
    const { orderId = '' } = query || {};
    this.setData({ orderId });
  },

  onRateChange(e) {
    this.setData({ rating: e.detail.value });
  },

  onContentChange(e) {
    this.setData({ content: e.detail.value });
  },

  async onSubmit() {
    if (!this.data.orderId) {
      wx.showToast({ title: '缺少订单', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      await request('/api/review', 'POST', {
        orderId: this.data.orderId,
        rating: this.data.rating,
        content: this.data.content,
      });
      wx.showToast({ title: '已提交', icon: 'success' });
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: e?.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
