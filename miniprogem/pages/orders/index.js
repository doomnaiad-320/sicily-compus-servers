import request from '~/api/request';

const STATUS_TABS = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'unpaid' },
  { label: '待接单', value: 'pending' },
  { label: '服务中', value: 'in_progress' },
  { label: '待确认', value: 'waiting_confirm' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '售后中', value: 'aftersale' },
  { label: '申诉中', value: 'appealing' },
];

Page({
  data: {
    role: 'user',
    current: 'all',
    list: [],
    available: [],
    view: 'mine', // mine | available (worker only)
    loading: true,
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
        [primary, available] = await Promise.all([
          request('/api/order?role=worker', 'GET'),
          request('/api/order?role=worker&view=available', 'GET'),
        ]);
      } else {
        primary = await request('/api/order', 'GET');
      }
      this.setData({
        role,
        list: primary,
        available,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  onTabChange(e) {
    this.setData({ current: e.detail.value });
  },

  filteredList() {
    const { current, list, available, view, role } = this.data;
    const source = role === 'worker' && view === 'available' ? available : list;
    const result = current === 'all' ? source : (source || []).filter((o) => o.status === current);
    return (result || []).map((o) => ({
      ...o,
      statusTag: this.statusTag(o.status),
    }));
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

  onViewChange(e) {
    this.setData({ view: e.detail.value });
  },

  sortByTimeAsc() {
    const { list, available } = this.data;
    const sortFn = (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    this.setData({
      list: [...(list || [])].sort(sortFn),
      available: [...(available || [])].sort(sortFn),
    });
  },

  sortByTimeDesc() {
    const { list, available } = this.data;
    const sortFn = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    this.setData({
      list: [...(list || [])].sort(sortFn),
      available: [...(available || [])].sort(sortFn),
    });
  },
});
