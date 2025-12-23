import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

// 服务类型映射
const SERVICE_TYPE_MAP = {
  delivery: '代取快递',
  shopping: '代购物品',
  printing: '打印服务',
  tutoring: '学业辅导',
  errand: '跑腿代办',
  cleaning: '清洁服务',
  other: '其他服务',
};

Page({
  data: {
    loading: true,
    refreshing: false,
    role: 'user', // user 或 worker
    isWorker: false,
    // 原始订单数据
    orders: [],
    // 筛选后的订单
    filteredOrders: [],
    // 服务类型筛选
    serviceTypes: [
      { value: 'all', label: '全部' },
      { value: 'delivery', label: '代取快递' },
      { value: 'shopping', label: '代购物品' },
      { value: 'printing', label: '打印服务' },
      { value: 'tutoring', label: '学业辅导' },
      { value: 'errand', label: '跑腿代办' },
      { value: 'cleaning', label: '清洁服务' },
      { value: 'other', label: '其他' },
    ],
    selectedType: 'all',
  },

  async onLoad() {
    await this.loadUserInfo();
    await this.loadOrders();
  },

  onShow() {
    // 每次显示时刷新数据
    if (!this.data.loading) {
      this.loadOrders();
    }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadOrders().finally(() => {
      this.setData({ refreshing: false });
    });
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const user = await request('/api/user/info', 'GET');
      const role = user.currentRole || 'user';
      this.setData({
        role,
        isWorker: role === 'worker',
      });
    } catch (e) {
      // 未登录时默认为用户角色
      this.setData({
        role: 'user',
        isWorker: false,
      });
    }
  },

  // 加载所有待接单订单
  async loadOrders() {
    this.setData({ loading: true });
    try {
      // 获取所有待接单状态的订单（公开展示）
      const orders = await request('/api/order?status=pending&public=true', 'GET');

      // 格式化订单数据
      const formattedOrders = (orders || []).map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        type: SERVICE_TYPE_MAP[order.serviceType] || order.type || '服务',
        serviceType: order.serviceType,
        title: order.title || SERVICE_TYPE_MAP[order.serviceType] || '待接单',
        description: order.description || '',
        amount: order.amount,
        address: order.address || '',
        expectedTime: order.expectedTime
          ? this.formatTime(order.expectedTime)
          : '',
        status: order.status,
        createdAt: order.createdAt,
      }));

      this.setData({ orders: formattedOrders });
      this.filterOrders();
    } catch (e) {
      Message.error({ context: this, content: e?.message || '加载订单失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  // 筛选订单
  filterOrders() {
    const { orders, selectedType } = this.data;

    // 按服务类型筛选
    const filtered =
      selectedType === 'all'
        ? orders
        : orders.filter((o) => o.serviceType === selectedType);

    this.setData({
      filteredOrders: filtered,
    });
  },

  // 切换服务类型
  onTypeChange(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ selectedType: value });
    this.filterOrders();
  },

  // 点击订单卡片 - 查看详情
  onCardTap(e) {
    const { id } = e.detail || {};
    if (!id) return;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },

  // 点击接单按钮
  async onTakeTap(e) {
    const { id } = e.detail || {};
    if (!id) return;

    // 检查是否是兼职者
    if (!this.data.isWorker) {
      Message.warning({ context: this, content: '只有兼职者才能接单' });
      return;
    }

    try {
      await request(`/api/order/${id}/take`, 'POST');
      Message.success({ context: this, content: '接单成功!' });
      // 刷新订单列表
      this.loadOrders();
      // 跳转到订单详情
      wx.navigateTo({
        url: `/pages/order-detail/index?id=${id}`,
      });
    } catch (e) {
      Message.error({ context: this, content: e?.message || '接单失败' });
    }
  },

  // 跳转发布页
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
});
