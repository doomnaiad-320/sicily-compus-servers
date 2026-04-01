import request from "~/api/request";
import { formatMonthDayTime } from "~/utils/date";

function formatReviewList(list = []) {
  return list.map((item) => ({
    ...item,
    orderLabel: item.order?.title || item.order?.type || "服务订单",
    createdAtText: item.createdAt ? formatMonthDayTime(item.createdAt) : "",
    workerRepliedAtText: item.workerRepliedAt
      ? formatMonthDayTime(item.workerRepliedAt)
      : "",
  }));
}

Page({
  data: {
    loading: true,
    hasWorker: false,
    statsCards: [],
    metrics: [],
    reviews: [],
  },

  onShow() {
    this.init();
  },

  async init() {
    this.setData({
      loading: true,
      hasWorker: false,
      statsCards: [],
      metrics: [],
      reviews: [],
    });

    try {
      const user = await request("/api/user/info", "GET");
      const worker = user?.worker;

      if (!worker || worker.status !== "approved") {
        this.setData({ loading: false, hasWorker: false });
        return;
      }

      this.setData({ hasWorker: true });

      const [stats, rawReviews] = await Promise.all([
        request("/api/worker/stats", "GET"),
        request(`/api/review/worker/${worker.id}`, "GET"),
      ]);

      const reviews = formatReviewList(rawReviews || []);
      const totalReviews = reviews.length;
      const pendingReplyCount = reviews.filter((item) => !item.replyContent).length;
      const goodRate = totalReviews
        ? `${Math.round((reviews.filter((item) => item.isPositive).length / totalReviews) * 100)}%`
        : "0%";

      this.setData({
        loading: false,
        hasWorker: true,
        statsCards: [
          { label: "接单数", value: stats.acceptedCount || 0 },
          { label: "完成数", value: stats.completedCount || 0 },
          { label: "评价数", value: totalReviews },
          { label: "待回复", value: pendingReplyCount },
        ],
        metrics: [
          { label: "好评率", value: goodRate },
          { label: "好评数", value: stats.positiveCount || 0 },
          { label: "差评数", value: stats.negativeCount || 0 },
          { label: "累计收入", value: `¥${stats.totalIncome || 0}` },
          { label: "工作时长", value: `${stats.totalWorkMinutes || 0} 分钟` },
        ],
        reviews,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e?.message || "加载失败", icon: "none" });
    }
  },

  goOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },
});
