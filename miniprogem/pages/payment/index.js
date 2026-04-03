import request from "~/api/request";

const PAYMENT_OPTIONS = [
  {
    value: "wechat",
    label: "微信支付",
    desc: "推荐使用，支付成功后立即发布订单",
    accent: "#07c160",
    iconText: "微",
    badge: "推荐",
  },
  {
    value: "alipay",
    label: "支付宝",
    desc: "常用备用通道，演示环境同样走模拟支付",
    accent: "#1677ff",
    iconText: "支",
    badge: "可用",
  },
];

Page({
  data: {
    id: "",
    order: null,
    loading: true,
    submitting: false,
    selectedChannel: "wechat",
    paymentOptions: PAYMENT_OPTIONS,
  },

  onLoad(query) {
    const { id } = query || {};
    if (!id) {
      wx.showToast({ title: "缺少订单ID", icon: "none" });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      return;
    }

    this.setData({ id });
    this.fetchOrder();
  },

  async fetchOrder() {
    try {
      const order = await request(`/api/order/${this.data.id}`, "GET");
      this.setData({
        order,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || "加载订单失败", icon: "none" });
    }
  },

  selectChannel(e) {
    const { channel } = e.currentTarget.dataset;
    if (!channel || channel === this.data.selectedChannel) return;
    this.setData({ selectedChannel: channel });
  },

  async submitPayment() {
    const { order, selectedChannel, submitting, id } = this.data;
    if (!order || submitting) return;

    if (order.status !== "unpaid") {
      wx.showToast({ title: "该订单已完成支付", icon: "none" });
      this.goOrderDetail();
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await request(`/api/order/${id}/pay`, "POST", {
        channel: selectedChannel,
      });
      wx.showToast({ title: result?.message || "支付成功", icon: "success" });
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order-detail/index?id=${id}`,
        });
      }, 700);
    } catch (e) {
      wx.showToast({ title: e?.message || "支付失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goOrderDetail() {
    if (!this.data.id) return;
    wx.redirectTo({
      url: `/pages/order-detail/index?id=${this.data.id}`,
    });
  },
});
