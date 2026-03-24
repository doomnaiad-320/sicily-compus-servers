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
    order: null,
    messages: [],
    input: '',
    anchor: '',
    keyboardHeight: 0,
    loading: true,
    timer: null,
  },

  onLoad(options) {
    const { conversationId = '', orderId = '' } = options || {};
    this.setData({ conversationId, orderId });
    this.initChat();
  },

  onShow() {
    if (this.data.conversationId) {
      this.startPoll();
    }
  },

  onHide() {
    this.stopPoll();
  },

  onUnload() {
    this.stopPoll();
  },

  async initChat() {
    try {
      const user = await request('/api/user/info', 'GET');
      this.setData({ userId: user.id });
      if (!this.data.conversationId && this.data.orderId) {
        const created = await request('/api/message/conversations', 'POST', {
          orderId: this.data.orderId,
        });
        this.setData({ conversationId: created.id });
      }
      await this.fetchMessages();
      await this.fetchOrder();
      this.startPoll();
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
      this.setData({ order });
    } catch (e) {
      // ignore
    }
  },

  statusTag(status) {
    const map = {
      unpaid: { text: '待支付', theme: 'warning' },
      pending: { text: '待接单', theme: 'primary' },
      in_progress: { text: '服务中', theme: 'primary' },
      waiting_confirm: { text: '待确认', theme: 'warning' },
      completed: { text: '已完成', theme: 'success' },
      aftersale: { text: '售后中', theme: 'danger' },
      appealing: { text: '申诉中', theme: 'danger' },
    };
    return map[status] || { text: status, theme: 'default' };
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

  startPoll() {
    this.stopPoll();
    if (!this.data.conversationId) return;
    const timer = setInterval(async () => {
      if (!this.data.conversationId) return;
      try {
        await this.fetchMessages();
        await this.fetchOrder();
      } catch (e) {
        // ignore polling failures
      }
    }, 5000);
    this.setData({ timer });
  },

  stopPoll() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  /** 消息列表滚动到底部 */
  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },
});
