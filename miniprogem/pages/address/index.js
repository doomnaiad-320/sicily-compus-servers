import request from '~/api/request';

Page({
  data: {
    list: [],
    loading: true,
  },

  onShow() {
    this.fetchList();
  },

  async fetchList() {
    this.setData({ loading: true });
    try {
      const list = await request('/api/user/address', 'GET');
      this.setData({ list });
      const defaultAddr = (list || []).find((a) => a.isDefault);
      if (defaultAddr) {
        wx.setStorageSync('default_address', defaultAddr);
      }
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address/edit/index' });
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/address/edit/index?id=${id}` });
  },

  async onDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request(`/api/user/address/${id}`, 'DELETE');
          wx.showToast({ title: '已删除', icon: 'success' });
          this.fetchList();
        } catch (err) {
          wx.showToast({ title: err?.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await request(`/api/user/address/${id}`, 'PUT', { isDefault: true });
      wx.showToast({ title: '已设为默认', icon: 'success' });
      this.fetchList();
    } catch (err) {
      wx.showToast({ title: err?.message || '设置失败', icon: 'none' });
    }
  },
});
