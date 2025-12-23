import request from '~/api/request';

const STATUS_MAP = {
  unpaid: { text: '待支付', theme: 'warning', bgColor: 'linear-gradient(135deg, #f39c12, #e67e22)' },
  pending: { text: '待接单', theme: 'primary', bgColor: 'linear-gradient(135deg, #0052d9, #0066ff)' },
  in_progress: { text: '服务中', theme: 'primary', bgColor: 'linear-gradient(135deg, #00b894, #00cec9)' },
  waiting_confirm: { text: '待确认', theme: 'warning', bgColor: 'linear-gradient(135deg, #fdcb6e, #f39c12)' },
  completed: { text: '已完成', theme: 'success', bgColor: 'linear-gradient(135deg, #27ae60, #2ecc71)' },
  cancelled: { text: '已取消', theme: 'default', bgColor: 'linear-gradient(135deg, #636e72, #b2bec3)' },
  aftersale: { text: '售后中', theme: 'danger', bgColor: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
  appealing: { text: '申诉中', theme: 'danger', bgColor: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
};

Page({
  data: {
    id: '',
    order: null,
    role: 'user',
    loading: true,
    actions: [],
    submitting: false,
    statusText: '',
    statusTheme: 'default',
    statusBgColor: 'linear-gradient(135deg, #0052d9, #0066ff)',
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
      const { id } = this.data;
      let role = 'user';

      // 尝试获取用户信息以确定角色
      try {
        const user = await request('/api/user/info', 'GET');
        role = user.currentRole || 'user';
      } catch (e) {
        // 未登录，保持用户角色
      }

      // 获取订单详情（API会自动判断是公开订单还是需要登录）
      const order = await request(`/api/order/${id}`, 'GET');

      // 只有pending状态（已支付待接单）的订单才是公开订单
      const isPublicOrder = order.status === 'pending' && !order.workerId;
      const actions = this.computeActions(order, role, isPublicOrder);
      const statusInfo = STATUS_MAP[order.status] || {
        text: order.status,
        theme: 'default',
        bgColor: 'linear-gradient(135deg, #0052d9, #0066ff)'
      };
      this.setData({
        order,
        role,
        actions,
        loading: false,
        statusText: statusInfo.text,
        statusTheme: statusInfo.theme,
        statusBgColor: statusInfo.bgColor,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  computeActions(order, role, isPublicOrder) {
    if (!order) return [];
    const status = order.status;
    const actions = [];

    // 公开订单（待接单），只有兼职者可以接单
    if (isPublicOrder) {
      if (role === 'worker' && status === 'pending') {
        actions.push({ key: 'take', text: '接单', theme: 'primary' });
      }
      return actions;
    }

    // 私有订单的操作
    if (role === 'user') {
      // 允许取消的状态: unpaid, pending
      if (status === 'unpaid' || status === 'pending') {
        actions.push({ key: 'cancel', text: '取消订单', theme: 'default' });
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
      if (key === 'cancel') {
        await request(`/api/order/${id}/cancel`, 'POST', { reason: '用户主动取消' });
        wx.showToast({ title: '订单已取消', icon: 'success' });
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

  // 拨打电话
  callPhone(e) {
    const { phone } = e.currentTarget.dataset;
    if (!phone) return;
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {},
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const { order } = this.data;
    if (!url || !order?.images) return;
    wx.previewImage({
      current: url,
      urls: order.images,
    });
  },
});
