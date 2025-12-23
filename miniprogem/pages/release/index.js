import request from "~/api/request";

// 服务类型选项（带图标和颜色）
const SERVICE_TYPES = [
  { value: "delivery", label: "代取快递", icon: "📦", color: "#ff6b35" },
  { value: "shopping", label: "代购", icon: "🛒", color: "#f7c242" },
  { value: "printing", label: "打印复印", icon: "🖨️", color: "#4ecdc4" },
  { value: "tutoring", label: "辅导答疑", icon: "📚", color: "#6c5ce7" },
  { value: "errand", label: "跑腿", icon: "🏃", color: "#00b894" },
  { value: "cleaning", label: "清洁", icon: "🧹", color: "#74b9ff" },
  { value: "other", label: "其他", icon: "💡", color: "#a29bfe" },
];

Page({
  data: {
    serviceTypes: SERVICE_TYPES,
    form: {
      title: "",
      serviceType: "",
      type: "",
      description: "",
      address: "",
      amount: "",
      expectedDate: "",
      expectedTime: "",
      contactName: "",
      contactPhone: "",
    },
    canSubmit: false,
    submitting: false,
    showTypeOptions: false,
    amountFocus: false,
  },

  onLoad() {
    const today = this.getToday();
    // 获取用户缓存的联系信息
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      this.setData({
        form: {
          ...this.data.form,
          contactName: userInfo.nickname || "",
          contactPhone: userInfo.phone || "",
          expectedDate: today,
        },
      });
    } else {
      this.setData({ "form.expectedDate": today });
    }
  },

  getToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, "0");
    const d = `${now.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  toggleTypePicker() {
    this.setData({ showTypeOptions: !this.data.showTypeOptions });
  },

  // 选择服务类型
  onServiceTypeSelect(e) {
    const index = e.currentTarget.dataset.index;
    const selected = SERVICE_TYPES[index];
    this.setData({
      form: {
        ...this.data.form,
        serviceType: selected.value,
        type: selected.label,
      },
      showTypeOptions: false,
    });
    this.checkCanSubmit();
  },

  // 通用字段变更处理
  onFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value,
    });
    this.checkCanSubmit();
  },

  onAmountTap() {
    this.setData({ amountFocus: true });
  },

  onAmountBlur() {
    this.setData({ amountFocus: false });
  },

  // 选择时间
  onTimeChange(e) {
    const value = e.detail.value;
    this.setData({
      "form.expectedTime": value,
    });
    this.checkCanSubmit();
  },

  // 选择日期
  onDateChange(e) {
    const value = e.detail.value;
    this.setData({
      "form.expectedDate": value,
    });
    this.checkCanSubmit();
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { serviceType, title, description, address, amount } = this.data.form;
    const amountNum = Number(amount);
    const canSubmit =
      serviceType &&
      title &&
      description &&
      address &&
      amount &&
      !isNaN(amountNum) &&
      amountNum > 0;
    this.setData({ canSubmit });
  },

  // 发布订单
  async release() {
    if (!this.data.canSubmit || this.data.submitting) return;

    const {
      serviceType,
      type,
      title,
      description,
      address,
      amount,
      expectedDate,
      expectedTime,
      contactName,
      contactPhone,
    } = this.data.form;
    const combinedExpected =
      expectedDate && expectedTime
        ? `${expectedDate} ${expectedTime}`
        : expectedDate || expectedTime || "";

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({ title: "请输入有效金额", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "发布中" });

    try {
      const order = await request("/api/order", "POST", {
        serviceType,
        type,
        title,
        description,
        address,
        expectedTime: combinedExpected,
        contactName,
        contactPhone,
        amount: amountNum,
      });

      // 模拟支付
      await request(`/api/order/${order.id}/pay`, "POST");

      wx.showToast({ title: "发布成功", icon: "success" });
      setTimeout(() => {
        wx.switchTab({
          url: "/pages/home/index",
        });
      }, 1000);
    } catch (e) {
      wx.showToast({ title: e?.message || "发布失败", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
