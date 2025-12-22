import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

// 获取应用实例
// const app = getApp()

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    focusCardInfo: [],
    role: 'user',
  },
  // 生命周期
  async onReady() {
    await this.refresh();
  },
  onLoad() {},
  onRefresh() {
    this.refresh();
  },
  async refresh() {
    this.setData({
      enable: true,
    });
    try {
      const user = await request('/api/user/info', 'GET');
      const role = user.currentRole || 'user';

      const [primaryOrders, secondary] =
        role === 'worker'
          ? await Promise.all([
              request('/api/order?role=worker&view=available', 'GET'),
              request('/api/order?role=worker', 'GET'),
            ])
          : await Promise.all([request('/api/order', 'GET'), Promise.resolve([])]);

      const toCard = (list = []) =>
        (list || []).map((o) => ({
          id: o.id,
          desc: `${o.type || '订单'} · ¥${o.amount} · ${o.description}`,
          url: '/static/order.png',
          tags: [
            { text: o.status, theme: 'primary' },
            o.address ? { text: o.address, theme: 'default' } : null,
          ].filter(Boolean),
        }));

      this.setData({
        enable: false,
        role,
        cardInfo: toCard(primaryOrders),
        focusCardInfo: toCard(secondary),
        swiperList: [],
      });
    } catch (e) {
      this.setData({ enable: false });
      Message.error({ context: this, content: e?.message || '加载失败' });
    }
  },
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
  onCardTap(e) {
    const { id } = e.detail || {};
    if (!id) return;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },
});
