// pages/chat/index.js
import request from '~/api/request';

Page({
  /** 页面的初始数据 */
  data: {
    myAvatar: '/static/chat/avatar.png', // 自己的头像
    avatar: '/static/chat/avatar.png',
    conversationId: '',
    orderId: '',
    userId: '', // 自己 userId
    role: 'user',
    order: null,
    actions: [],
    messages: [],
    input: '',
    anchor: '',
    keyboardHeight: 0,
    loading: true,
    actionLoading: false,
  },

  onLoad(options) {
    const { conversationId = '', orderId = '' } = options || {};
    this.setData({ conversationId, orderId });
    this.initChat();
  },

  async initChat() {
    try {
      const user = await request('/api/user/info', 'GET');
      const role = user.currentRole || 'user';
      this.setData({ userId: user.id, role });
      if (!this.data.conversationId && this.data.orderId) {
        const created = await request('/api/message', 'POST', {
          orderId: this.data.orderId,
          content: '我发起了聊天',
        });
        this.setData({ conversationId: created.conversationId || created.id });
      }
      await this.fetchMessages();
      await this.fetchOrder();
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 处理唤起键盘事件 */
  handleKeyboardHeightChange(event) {
    const { height } = event.detail;
    if (!height) return;
    this.setData({ keyboardHeight: height });
    wx.nextTick(this.scrollToBottom);
  },

  /** 处理收起键盘事件 */
  handleBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  /** 处理输入事件 */
  handleInput(event) {
    this.setData({ input: event.detail.value });
  },

  async fetchMessages() {
    if (!this.data.conversationId) return;
    const list = await request(`/api/message/${this.data.conversationId}`, 'GET');
    const mapped = (list || []).map((m) => ({
      id: m.id,
      content: m.content,
      self: m.senderId === this.data.userId,
      createdAt: m.createdAt,
    }));
    this.setData({ messages: mapped });
    const lastTs = mapped.length
      ? Date.parse(mapped[mapped.length - 1].createdAt || '') || Date.now()
      : Date.now();
    const seenMap = wx.getStorageSync('last_seen_map') || {};
    seenMap[this.data.conversationId] = lastTs;
    wx.setStorageSync('last_seen_map', seenMap);
    wx.nextTick(this.scrollToBottom);
  },

  async fetchOrder() {
    if (!this.data.orderId) return;
    try {
      const order = await request(`/api/order/${this.data.orderId}`, 'GET');
      this.setData({ order, actions: this.computeActions(order, this.data.role) });
    } catch (e) {
      // ignore
    }
  },

  computeActions(order, role) {
    if (!order) return [];
    const status = order.status;
    const actions = [];
    if (role === 'user') {
      if (status === 'consulting') actions.push({ key: 'ready', text: '请接单' });
      if (status === 'waiting_confirm') actions.push({ key: 'confirm', text: '确认完成' });
    } else if (role === 'worker') {
      if (status === 'pending') actions.push({ key: 'take', text: '接单' });
      if (status === 'in_progress') actions.push({ key: 'complete', text: '服务完成' });
    }
    return actions;
  },

  statusTag(status) {
    const map = {
      unpaid: { text: '待支付', theme: 'warning' },
      consulting: { text: '待咨询', theme: 'default' },
      pending: { text: '待接单', theme: 'primary' },
      in_progress: { text: '服务中', theme: 'primary' },
      waiting_confirm: { text: '待确认', theme: 'warning' },
      completed: { text: '已完成', theme: 'success' },
      aftersale: { text: '售后中', theme: 'danger' },
      appealing: { text: '申诉中', theme: 'danger' },
    };
    return map[status] || { text: status, theme: 'default' };
  },

  async onActionTap(e) {
    const { key } = e.currentTarget.dataset;
    if (!key || !this.data.orderId || this.data.actionLoading) return;
    this.setData({ actionLoading: true });
    try {
      if (key === 'ready') {
        await request(`/api/order/${this.data.orderId}/ready`, 'POST');
      } else if (key === 'confirm') {
        await request(`/api/order/${this.data.orderId}/confirm`, 'POST');
      } else if (key === 'take') {
        await request(`/api/order/${this.data.orderId}/take`, 'POST');
      } else if (key === 'complete') {
        await request(`/api/order/${this.data.orderId}/complete`, 'POST');
      }
      await this.fetchOrder();
      wx.showToast({ title: '已提交', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err?.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  async sendMessage() {
    const { input: content, conversationId, orderId, messages } = this.data;
    if (!content) return;
    try {
      const res = await request('/api/message', 'POST', {
        conversationId,
        orderId,
        content,
        messageType: 'text',
      });
      messages.push({
        id: res.id,
        content: res.content,
        self: true,
        createdAt: res.createdAt,
      });
      this.setData({ input: '', messages });
      const opener = this.getOpenerEventChannel?.();
      opener?.emit('refreshConversations');
      await this.fetchMessages();
    } catch (e) {
      wx.showToast({ title: e?.message || '发送失败', icon: 'none' });
    }
    wx.nextTick(this.scrollToBottom);
  },

  /** 消息列表滚动到底部 */
  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },
});
