import request from "~/api/request";
import config from "~/config";

const STATUS_MAP = {
  unpaid: {
    text: "待支付",
    theme: "warning",
    bgColor: "linear-gradient(135deg, #f39c12, #e67e22)",
  },
  pending: {
    text: "待接单",
    theme: "primary",
    bgColor: "linear-gradient(135deg, #0052d9, #0066ff)",
  },
  in_progress: {
    text: "服务中",
    theme: "primary",
    bgColor: "linear-gradient(135deg, #00b894, #00cec9)",
  },
  waiting_confirm: {
    text: "待确认",
    theme: "warning",
    bgColor: "linear-gradient(135deg, #fdcb6e, #f39c12)",
  },
  completed: {
    text: "已完成",
    theme: "success",
    bgColor: "linear-gradient(135deg, #27ae60, #2ecc71)",
  },
  cancelled: {
    text: "已取消",
    theme: "default",
    bgColor: "linear-gradient(135deg, #636e72, #b2bec3)",
  },
  aftersale: {
    text: "售后中",
    theme: "danger",
    bgColor: "linear-gradient(135deg, #e74c3c, #c0392b)",
  },
  appealing: {
    text: "申诉中",
    theme: "danger",
    bgColor: "linear-gradient(135deg, #e74c3c, #c0392b)",
  },
};

Page({
  data: {
    id: "",
    order: null,
    role: "user",
    isWorker: false,
    userId: "",
    workerId: "",
    loading: true,
    actions: [],
    submitting: false,
    uploading: false,
    statusText: "",
    statusTheme: "default",
    statusBgColor: "linear-gradient(135deg, #0052d9, #0066ff)",
    canDeliver: false,
    deliveryNoteInput: "",
    deliveryImages: [],
  },

  async onLoad(query) {
    const { id } = query || {};
    if (!id) {
      wx.showToast({ title: "缺少订单ID", icon: "none" });
      return;
    }
    this.setData({ id });
    await this.fetchData();
  },

  async fetchData() {
    this.setData({ loading: true });
    try {
      const { id } = this.data;
      let role = "user";
      let isWorker = false;
      let userId = "";
      let workerId = "";

      // 尝试获取用户信息以确定角色
      try {
        const user = await request("/api/user/info", "GET");
        role = user.currentRole || "user";
        userId = user.id;
        const workerStatus = user.worker?.status;
        workerId = user.worker?.id;
        isWorker = role === "worker" || workerStatus === "approved";
      } catch (e) {
        // 未登录，保持用户角色
      }

      // 如果未识别为兼职者，再请求一次 worker 状态兜底
      if (!isWorker) {
        try {
          const workerStatus = await request("/api/worker/status", "GET");
          if (workerStatus?.status === "approved") {
            isWorker = true;
          }
        } catch (e) {
          // ignore 未登录或未申请
        }
      }

      // 获取订单详情（API会自动判断是公开订单还是需要登录）
      const order = await request(`/api/order/${id}`, "GET");

      // 只有pending状态（已支付待接单）的订单才是公开订单
      const isPublicOrder = order.status === "pending" && !order.workerId;
      const canDeliver =
        isWorker &&
        order.workerId &&
        workerId &&
        order.workerId === workerId &&
        order.status === "in_progress";
      const actions = this.computeActions(
        order,
        { role, isWorker },
        isPublicOrder,
      );
      const statusInfo = STATUS_MAP[order.status] || {
        text: order.status,
        theme: "default",
        bgColor: "linear-gradient(135deg, #0052d9, #0066ff)",
      };
      this.setData({
        order,
        role,
        isWorker,
        userId,
        workerId,
        actions,
        loading: false,
        statusText: statusInfo.text,
        statusTheme: statusInfo.theme,
        statusBgColor: statusInfo.bgColor,
        canDeliver,
        deliveryNoteInput: order.deliveryNote || "",
        deliveryImages: order.deliveryImages || [],
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || "加载失败", icon: "none" });
    }
  },

  computeActions(order, user, isPublicOrder) {
    if (!order) return [];
    const { role } = user;
    const status = order.status;
    const actions = [];

    // 公开订单（待接单），只有兼职者模式可以接单
    if (isPublicOrder) {
      if (role === "worker" && status === "pending") {
        actions.push({ key: "take", text: "接单", theme: "primary" });
      }
      return actions;
    }

    // 私有订单的操作
    if (role === "user") {
      // 允许取消的状态: unpaid, pending
      if (status === "unpaid" || status === "pending") {
        actions.push({ key: "cancel", text: "取消订单", theme: "default" });
      }
      if (status === "waiting_confirm") {
        actions.push({ key: "confirm", text: "确认完成", theme: "primary" });
        actions.push({ key: "aftersale", text: "申请售后", theme: "default" });
      }
      if (status === "completed" && !order.review) {
        actions.push({ key: "review", text: "去评价", theme: "primary" });
      }
    } else if (role === "worker") {
      if (status === "pending") {
        actions.push({ key: "take", text: "接单", theme: "primary" });
      }
    }
    return actions;
  },

  async onActionTap(e) {
    const { key } = e.currentTarget.dataset;
    if (!key || this.data.submitting) return;

    if (key === "take" && this.data.role !== "worker") {
      wx.showToast({ title: "请切换到兼职者模式接单", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    try {
      const id = this.data.id;
      if (key === "cancel") {
        await request(`/api/order/${id}/cancel`, "POST", {
          reason: "用户主动取消",
        });
        wx.showToast({ title: "订单已取消", icon: "success" });
      } else if (key === "take") {
        await request(`/api/order/${id}/take`, "POST");
        wx.showToast({ title: "接单成功", icon: "success" });
      } else if (key === "complete") {
        await request(`/api/order/${id}/complete`, "POST");
        wx.showToast({ title: "已标记完成", icon: "success" });
      } else if (key === "confirm") {
        await request(`/api/order/${id}/confirm`, "POST");
        wx.showToast({ title: "确认完成", icon: "success" });
      } else if (key === "aftersale") {
        await request(`/api/order/${id}/aftersale`, "POST", {
          reason: "用户申请售后",
        });
        wx.showToast({ title: "已申请售后", icon: "success" });
      } else if (key === "review") {
        wx.navigateTo({ url: `/pages/review/index?orderId=${id}` });
        this.setData({ submitting: false });
        return;
      }
      await this.fetchData();
    } catch (e) {
      wx.showToast({ title: e?.message || "操作失败", icon: "none" });
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

  // 预览交付图片
  previewDeliveryImage(e) {
    const { url } = e.currentTarget.dataset;
    const { deliveryImages } = this.data;
    if (!url || !deliveryImages || deliveryImages.length === 0) return;
    wx.previewImage({
      current: url,
      urls: deliveryImages,
    });
  },

  onNoteInput(e) {
    this.setData({ deliveryNoteInput: e.detail.value });
  },

  removeDeliveryImage(e) {
    const { index } = e.currentTarget.dataset;
    const { deliveryImages } = this.data;
    if (index === undefined || index === null) return;
    const next = [...deliveryImages];
    next.splice(index, 1);
    this.setData({ deliveryImages: next });
  },

  chooseDeliveryImages() {
    const { deliveryImages } = this.data;
    const remain = Math.max(0, 6 - deliveryImages.length);
    if (remain <= 0) {
      wx.showToast({ title: "最多上传6张图片", icon: "none" });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const files = res.tempFilePaths || [];
        if (!files.length) return;
        wx.showLoading({ title: "上传中..." });
        this.setData({ uploading: true });
        try {
          const uploaded = [];
          for (const filePath of files) {
            const url = await this.uploadSingleImage(filePath);
            uploaded.push(url);
          }
          this.setData({
            deliveryImages: [...this.data.deliveryImages, ...uploaded],
          });
        } catch (err) {
          wx.showToast({ title: err?.message || "上传失败", icon: "none" });
        } finally {
          wx.hideLoading();
          this.setData({ uploading: false });
        }
      },
    });
  },

  uploadSingleImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${config.baseUrl}/api/upload`,
        filePath,
        name: "file",
        success: (res) => {
          try {
            const data = JSON.parse(res.data || "{}");
            const url =
              data.absoluteUrl || (data.url ? `${config.baseUrl}${data.url}` : "");
            if (!url) {
              reject(new Error("上传失败"));
              return;
            }
            resolve(url);
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => reject(err),
      });
    });
  },

  // 提交交付
  async submitDelivery() {
    const { id, canDeliver, deliveryNoteInput, deliveryImages, submitting } =
      this.data;
    if (!canDeliver || submitting) return;
    this.setData({ submitting: true });
    try {
      await request(`/api/order/${id}/complete`, "POST", {
        note: deliveryNoteInput?.trim?.() || "",
        images: deliveryImages,
      });
      wx.showToast({ title: "交付成功", icon: "success" });
      await this.fetchData();
    } catch (e) {
      wx.showToast({ title: e?.message || "交付失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
