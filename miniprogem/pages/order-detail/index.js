import request from "~/api/request";
import config from "~/config";
import { formatMonthDayTime } from "~/utils/date";

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
    chatEntry: null,
    contactCardTitle: "联系方式",
    contactDisplayName: "",
    contactDisplayPhone: "",
    submitting: false,
    uploading: false,
    statusText: "",
    statusTheme: "default",
    statusBgColor: "linear-gradient(135deg, #0052d9, #0066ff)",
    canDeliver: false,
    canReplyReview: false,
    showDeliveryContent: false,
    deliveryNoteInput: "",
    deliveryImages: [],
    reviewReplyInput: "",
    replyingReview: false,
  },

  async onLoad(query) {
    const { id } = query || {};
    if (!id) {
      wx.showToast({ title: "缺少订单ID", icon: "none" });
      return;
    }
    this.setData({ id });
  },

  onShow() {
    if (this.data.id) {
      this.fetchData();
    }
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
      const rawOrder = await request(`/api/order/${id}`, "GET");
      const order = {
        ...rawOrder,
        expectedTime: rawOrder.expectedTime
          ? formatMonthDayTime(rawOrder.expectedTime)
          : "",
        deliveredAt: rawOrder.deliveredAt
          ? formatMonthDayTime(rawOrder.deliveredAt)
          : "",
        review: rawOrder.review
          ? {
              ...rawOrder.review,
              createdAtText: rawOrder.review.createdAt
                ? formatMonthDayTime(rawOrder.review.createdAt)
                : "",
              workerRepliedAtText: rawOrder.review.workerRepliedAt
                ? formatMonthDayTime(rawOrder.review.workerRepliedAt)
                : "",
            }
          : null,
      };

      // 只有pending状态（已支付待接单）的订单才是公开订单
      const isPublicOrder = order.status === "pending" && !order.workerId;
      const isWorkerMode = role === "worker";
      const canReplyReview =
        !!order.review &&
        isWorkerMode &&
        !!order.workerId &&
        !!workerId &&
        order.workerId === workerId;
      const canDeliver =
        isWorkerMode &&
        order.workerId &&
        workerId &&
        order.workerId === workerId &&
        order.status === "in_progress";
      const showDeliveryContent =
        !!(order.deliveryNote || (order.deliveryImages && order.deliveryImages.length > 0)) &&
        order.status !== "in_progress";
      const chatEntry = this.computeChatEntry(
        order,
        { role, isWorker, userId, workerId },
        isPublicOrder,
      );
      const actions = this.computeActions(
        order,
        { role, isWorker, userId, workerId },
        isPublicOrder,
      );
      const contactDisplay = this.computeContactDisplay(
        order,
        { role, userId, workerId },
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
        chatEntry,
        contactCardTitle: contactDisplay.title,
        contactDisplayName: contactDisplay.name,
        contactDisplayPhone: contactDisplay.phone,
        loading: false,
        statusText: statusInfo.text,
        statusTheme: statusInfo.theme,
        statusBgColor: statusInfo.bgColor,
        canDeliver,
        canReplyReview,
        showDeliveryContent,
        deliveryNoteInput: order.deliveryNote || "",
        deliveryImages: order.deliveryImages || [],
        reviewReplyInput: order.review?.replyContent || "",
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || "加载失败", icon: "none" });
    }
  },

  computeChatEntry(order, user, isPublicOrder) {
    if (!order) return null;
    const { role, isWorker, userId, workerId } = user;
    const isOwner = !!userId && order.userId === userId;
    const isAssignedWorker = !!workerId && !!order.workerId && order.workerId === workerId;
    const canPrivateChat =
      !!userId &&
      (
        (isPublicOrder && role === "worker" && isWorker && !isOwner) ||
        (!!order.workerId && (isOwner || isAssignedWorker))
      );

    if (!canPrivateChat) {
      return null;
    }

    const talkingToWorker = !!order.workerId && isOwner;

    return {
      text: "私信",
      targetName: talkingToWorker
        ? order.workerNickname || "接单人"
        : order.userNickname || order.contactName || "发布者",
      hidePhone: talkingToWorker,
    };
  },

  computeActions(order, user, isPublicOrder) {
    if (!order) return [];
    const { role, userId, workerId } = user;
    const status = order.status;
    const actions = [];
    const isOwner = !!userId && order.userId === userId;
    const isAssignedWorker = !!workerId && !!order.workerId && order.workerId === workerId;

    // 公开订单（待接单），只有兼职者模式可以接单
    if (isPublicOrder) {
      if (role === "worker" && status === "pending" && !isOwner) {
        actions.push({ key: "take", text: "接单", theme: "primary" });
      }
      return actions;
    }

    // 私有订单的操作
    if (isOwner) {
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
    } else if (isAssignedWorker || role === "worker") {
      if (status === "pending") {
        actions.push({ key: "take", text: "接单", theme: "primary" });
      }
    }
    return actions;
  },

  computeContactDisplay(order, user, isPublicOrder) {
    if (!order) {
      return { title: "联系方式", name: "", phone: "" };
    }

    const { role, userId, workerId } = user;
    const isOwner = !!userId && order.userId === userId;
    const isAssignedWorker = !!workerId && !!order.workerId && order.workerId === workerId;

    if (isOwner && order.workerId) {
      return {
        title: "兼职者联系方式",
        name: order.workerNickname || "接单人",
        phone: order.workerPhone || "",
      };
    }

    if (isAssignedWorker || (isPublicOrder && role === "worker" && !isOwner)) {
      return {
        title: "用户联系方式",
        name: order.contactName || order.userNickname || "",
        phone: order.contactPhone || "",
      };
    }

    return {
      title: "联系方式",
      name: order.contactName || "",
      phone: order.contactPhone || "",
    };
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

  onChatTap() {
    this.goChat();
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

  onReviewReplyInput(e) {
    this.setData({ reviewReplyInput: e.detail.value });
  },

  async submitReviewReply() {
    const { order, canReplyReview, reviewReplyInput, replyingReview } = this.data;
    if (!canReplyReview || !order?.review || replyingReview) return;

    const replyContent = reviewReplyInput.trim();
    if (!replyContent) {
      wx.showToast({ title: "请输入回复内容", icon: "none" });
      return;
    }

    this.setData({ replyingReview: true });
    try {
      await request(`/api/review/${order.review.id}/reply`, "PUT", {
        replyContent,
      });
      wx.showToast({ title: "回复成功", icon: "success" });
      await this.fetchData();
    } catch (e) {
      wx.showToast({ title: e?.message || "回复失败", icon: "none" });
    } finally {
      this.setData({ replyingReview: false });
    }
  },
});
