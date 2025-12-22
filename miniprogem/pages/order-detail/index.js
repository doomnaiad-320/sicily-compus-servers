import request from '~/api/request';

Page({
  data: {
    id: '',
    order: null,
    role: 'user',
    loading: true,
    actions: [],
    submitting: false,
  },

  async onLoad(query) {
    const { id } = query || {};
    if (!id) {
      wx.showToast({ title: '缺少订单ID', icon: 'none' });
      return;
    }
    this.setData({ id });
    await this.fetchData();
  },

  async fetchData() {
    this.setData({ loading: true });
    try {
      const user = await request('/api/user/info', 'GET');
      const order = await request(`/api/order/${this.data.id}`, 'GET');
      const role = user.currentRole || 'user';
      const actions = this.computeActions(order, role);
      this.setData({ order, role, actions, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  computeActions(order, role) {
    if (!order) return [];
    const status = order.status;
    const actions = [];
    if (role === 'user') {
      if (status === 'consulting') {
        actions.push({ key: 'ready', text: '请接单', theme: 'primary' });
      }
      if (status === 'waiting_confirm') {
        actions.push({ key: 'confirm', text: '确认完成', theme: 'primary' });
        actions.push({ key: 'aftersale', text: '申请售后', theme: 'default' });
      }
      if (status === 'completed' && !order.review) {
        actions.push({ key: 'review', text: '去评价', theme: 'primary' });
      }
    } else if (role === 'worker') {
      if (status === 'pending') {
        actions.push({ key: 'take', text: '接单', theme: 'primary' });
      }
      if (status === 'in_progress') {
        actions.push({ key: 'complete', text: '服务完成', theme: 'primary' });
      }
    }
    return actions;
  },

  async onActionTap(e) {
    const { key } = e.currentTarget.dataset;
    if (!key || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const id = this.data.id;
      if (key === 'ready') {
        await request(`/api/order/${id}/ready`, 'POST');
        wx.showToast({ title: '已发布请接单', icon: 'success' });
      } else if (key === 'take') {
        await request(`/api/order/${id}/take`, 'POST');
        wx.showToast({ title: '接单成功', icon: 'success' });
      } else if (key === 'complete') {
        await request(`/api/order/${id}/complete`, 'POST');
        wx.showToast({ title: '已标记完成', icon: 'success' });
      } else if (key === 'confirm') {
        await request(`/api/order/${id}/confirm`, 'POST');
        wx.showToast({ title: '确认完成', icon: 'success' });
      } else if (key === 'aftersale') {
        await request(`/api/order/${id}/aftersale`, 'POST', { reason: '用户申请售后' });
        wx.showToast({ title: '已申请售后', icon: 'success' });
      } else if (key === 'review') {
        wx.navigateTo({ url: `/pages/review/index?orderId=${id}` });
        this.setData({ submitting: false });
        return;
      }
      await this.fetchData();
    } catch (e) {
      wx.showToast({ title: e?.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goChat() {
    if (!this.data.id) return;
    wx.navigateTo({
      url: `/pages/chat/index?orderId=${this.data.id}`,
    });
  },
});
