import request from '~/api/request';

const STATUS_TABS = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'unpaid' },
  { label: '待接单', value: 'pending' },
  { label: '服务中', value: 'in_progress' },
  { label: '待确认', value: 'waiting_confirm' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

Page({
  data: {
    role: 'user',
    current: 'all',
    list: [],
    available: [],
    displayList: [], // 用于展示的筛选后列表
    view: 'mine', // mine | available (worker only)
    loading: true,
    statusTabs: STATUS_TABS, // 传递给模板
  },

  onShow() {
    this.init();
  },

  async init() {
    this.setData({ loading: true });
    try {
      const user = await request('/api/user/info', 'GET');
      const role = user.currentRole || 'user';
      let primary = [];
      let available = [];
      if (role === 'worker') {
        const [workerOrders, userOrders, availableOrders] = await Promise.all([
          request('/api/order?role=worker', 'GET'),
          // 以用户身份发布的订单也要带上
          request('/api/order?role=user', 'GET'),
          request('/api/order?role=worker&view=available', 'GET'),
        ]);
        primary = this.mergeOrders(workerOrders, userOrders);
        available = availableOrders;
      } else {
        primary = await request('/api/order', 'GET');
      }
      this.setData({
        role,
        list: primary,
        available,
        loading: false,
      });
      this.updateDisplayList();
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  // 合并订单去重
  mergeOrders(...lists) {
    const map = {};
    (lists || []).forEach((list) => {
      (list || []).forEach((item) => {
        map[item.id] = item;
      });
    });
    return Object.values(map);
  },

  onTabChange(e) {
    this.setData({ current: e.detail.value });
    this.updateDisplayList();
  },

  onViewChange(e) {
    this.setData({ view: e.detail.value });
    this.updateDisplayList();
  },

  // 更新展示列表
  updateDisplayList() {
    const { current, list, available, view, role } = this.data;
    const source = role === 'worker' && view === 'available' ? available : list;
    const filtered = current === 'all' ? source : (source || []).filter((o) => o.status === current);
    const displayList = (filtered || []).map((o) => ({
      ...o,
      statusTag: this.statusTag(o.status),
    }));
    this.setData({ displayList });
  },

  statusTag(status) {
    const map = {
      unpaid: { text: '待支付', theme: 'warning' },
      pending: { text: '待接单', theme: 'primary' },
      in_progress: { text: '服务中', theme: 'primary' },
      waiting_confirm: { text: '待确认', theme: 'warning' },
      completed: { text: '已完成', theme: 'success' },
      cancelled: { text: '已取消', theme: 'default' },
      aftersale: { text: '售后中', theme: 'danger' },
      appealing: { text: '申诉中', theme: 'danger' },
    };
    return map[status] || { text: status, theme: 'default' };
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  },

  sortByTimeAsc() {
    const { list, available } = this.data;
    const sortFn = (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    this.setData({
      list: [...(list || [])].sort(sortFn),
      available: [...(available || [])].sort(sortFn),
    });
    this.updateDisplayList();
  },

  sortByTimeDesc() {
    const { list, available } = this.data;
    const sortFn = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    this.setData({
      list: [...(list || [])].sort(sortFn),
      available: [...(available || [])].sort(sortFn),
    });
    this.updateDisplayList();
  },
});
