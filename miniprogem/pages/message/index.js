// pages/message/message.js
import request from '~/api/request';
const app = getApp();

Page({
  /** 页面的初始数据 */
  data: {
    messageList: [], // 会话列表
    loading: true,
    lastFetchedAt: 0,
    timer: null,
  },

  onShow() {
    this.getMessageList();
    this.startPoll();
  },

  onHide() {
    this.stopPoll();
  },

  onUnload() {
    this.stopPoll();
  },

  onPullDownRefresh() {
    this.getMessageList();
  },

  async getMessageList() {
    this.setData({ loading: true, lastFetchedAt: Date.now() });
    try {
      const list = await request('/api/message/conversations', 'GET');
      const prev = this.data.messageList || [];
      const mapped = (list || []).map((c) => {
        const prevItem = prev.find((p) => p.conversationId === c.id);
        return {
          conversationId: c.id,
          orderId: c.orderId,
          title: c.orderId ? `订单 ${c.orderId.slice(-4)}` : '会话',
          lastContent: c.lastMessage?.content || '暂无消息',
          lastTime: c.lastMessage?.createdAt || c.updatedAt,
          badge: prevItem?.badge || 0,
          orderStatus: c.orderStatus,
        };
      });
      this.markUnread(mapped);
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  markUnread(list) {
    const seenMap = wx.getStorageSync('last_seen_map') || {};
    let updated = { ...seenMap };
    const parsed = (list || []).map((item) => {
      const ts = Date.parse(item.lastTime || '') || 0;
      const lastSeen = seenMap[item.conversationId] || 0;
      const badge = ts > lastSeen ? 1 : 0;
      if (!lastSeen) {
        updated[item.conversationId] = ts;
      }
      return {
        ...item,
        badge,
      };
    });
    wx.setStorageSync('last_seen_map', updated);
    this.setData({ messageList: parsed });
    const totalUnread = parsed.reduce((sum, item) => sum + (item.badge || 0), 0);
    if (app?.setUnreadNum) {
      app.setUnreadNum(totalUnread);
    }
  },

  startPoll() {
    this.stopPoll();
    const timer = setInterval(() => {
      this.getMessageList();
    }, 15000);
    this.setData({ timer });
  },

  stopPoll() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  toChat(event) {
    const { conversationId, orderId } = event.currentTarget.dataset;
    const url = `/pages/chat/index?conversationId=${conversationId || ''}&orderId=${orderId || ''}`;
    wx.navigateTo({ url }).then(({ eventChannel }) => {
      eventChannel.on('refreshConversations', () => {
        this.getMessageList();
      });
    });
  },
});
