import request from '~/api/request';

Page({
  data: {
    id: '',
    form: {
      detail: '',
      label: '',
      isDefault: false,
    },
    loading: false,
  },

  onLoad(query) {
    const { id = '' } = query || {};
    this.setData({ id });
    if (id) {
      this.fetchDetail(id);
    }
  },

  async fetchDetail(id) {
    try {
      const list = await request('/api/user/address', 'GET');
      const target = (list || []).find((a) => a.id === id);
      if (target) {
        this.setData({ form: { detail: target.detail, label: target.label || '', isDefault: target.isDefault } });
      }
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  onDetailChange(e) {
    this.setData({ form: { ...this.data.form, detail: e.detail.value } });
  },
  onLabelChange(e) {
    this.setData({ form: { ...this.data.form, label: e.detail.value } });
  },
  onDefaultChange(e) {
    this.setData({ form: { ...this.data.form, isDefault: e.detail.value } });
  },

  async onSubmit() {
    const { detail, label, isDefault } = this.data.form;
    if (!detail) {
      wx.showToast({ title: '请填写地址', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      if (this.data.id) {
        await request(`/api/user/address/${this.data.id}`, 'PUT', { detail, label, isDefault });
      } else {
        await request('/api/user/address', 'POST', { detail, label, isDefault });
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: e?.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
