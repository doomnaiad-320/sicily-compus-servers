import request from "~/api/request";
import config from "~/config";

// 技能ID到名称的映射
const SKILL_MAP = {
  delivery: "代取快递",
  shopping: "代购物品",
  printing: "打印服务",
  tutoring: "学业辅导",
  errand: "跑腿代办",
  cleaning: "清洁服务",
  moving: "搬运服务",
  repair: "维修服务",
};

Page({
  data: {
    form: {
      idCardFront: "",
      idCardBack: "",
      phone: "",
      code: "",
      skills: [],
      alipayAccount: "",
    },
    skillList: [],
    status: null, // none | pending | approved | rejected
    statusReason: "",
    submitTime: "",
    skillNames: "",
    saving: false,
  },

  onShow() {
    this.loadSkills();
    this.loadStatus();
  },

  async loadSkills() {
    try {
      const res = await request("/api/skills", "GET");
      const skills = (res.data || []).map((s) => ({
        ...s,
        selected: false,
      }));
      this.setData({ skillList: skills });
    } catch (e) {
      // 使用默认技能列表
      this.setData({
        skillList: [
          { id: "delivery", name: "代取快递", selected: false },
          { id: "shopping", name: "代购物品", selected: false },
          { id: "printing", name: "打印服务", selected: false },
          { id: "tutoring", name: "学业辅导", selected: false },
          { id: "errand", name: "跑腿代办", selected: false },
          { id: "cleaning", name: "清洁服务", selected: false },
          { id: "moving", name: "搬运服务", selected: false },
          { id: "repair", name: "维修服务", selected: false },
        ],
      });
    }
  },

  async loadStatus() {
    try {
      const res = await request("/api/worker/status", "GET");
      const status = res.status || "none";

      // 解析技能名称用于显示
      let skillNames = "";
      if (res.workerData?.skills) {
        const skillIds = res.workerData.skills.split(",").filter(Boolean);
        skillNames = skillIds.map((id) => SKILL_MAP[id] || id).join("、");
      }

      this.setData({
        status,
        statusReason: res.reason || "",
        submitTime: res.workerData?.createdAt
          ? this.formatTime(res.workerData.createdAt)
          : "",
        skillNames,
      });
    } catch (e) {
      // 未申请状态
      this.setData({ status: null });
    }
  },

  formatTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  onInputPhone(e) {
    this.setData({ "form.phone": e.detail.value });
  },

  onInputCode(e) {
    this.setData({ "form.code": e.detail.value });
  },

  onInputAlipay(e) {
    this.setData({ "form.alipayAccount": e.detail.value });
  },

  onSendCode() {
    wx.showToast({ title: "验证码已发送", icon: "success" });
  },

  onToggleSkill(e) {
    const { id } = e.currentTarget.dataset;
    const skillList = this.data.skillList.map((s) => ({
      ...s,
      selected: s.id === id ? !s.selected : s.selected,
    }));
    const selectedSkills = skillList.filter((s) => s.selected).map((s) => s.id);
    this.setData({
      skillList,
      "form.skills": selectedSkills,
    });
  },

  onUploadFront() {
    if (this.data.form.idCardFront) {
      wx.previewImage({
        current: this.data.form.idCardFront,
        urls: [this.data.form.idCardFront],
      });
      return;
    }
    this.uploadImage("idCardFront");
  },

  onUploadBack() {
    if (this.data.form.idCardBack) {
      wx.previewImage({
        current: this.data.form.idCardBack,
        urls: [this.data.form.idCardBack],
      });
      return;
    }
    this.uploadImage("idCardBack");
  },

  onRemoveFront() {
    this.setData({ "form.idCardFront": "" });
  },

  onRemoveBack() {
    this.setData({ "form.idCardBack": "" });
  },

  uploadImage(field) {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const filePath = res.tempFilePaths[0];
        wx.showLoading({ title: "上传中..." });
        try {
          const uploadRes = await new Promise((resolve, reject) => {
            wx.uploadFile({
              url: `${config.baseUrl}/api/upload`,
              filePath,
              name: "file",
              success: (uploadResult) => {
                try {
                  const data = JSON.parse(uploadResult.data || "{}");
                  const url =
                    data.absoluteUrl ||
                    (data.url ? `${config.baseUrl}${data.url}` : "");
                  if (!url) {
                    reject(new Error("上传失败"));
                    return;
                  }
                  resolve(url);
                } catch (err) {
                  reject(err);
                }
              },
              fail: (err) => reject(err),
            });
          });
          this.setData({ [`form.${field}`]: uploadRes });
          wx.hideLoading();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err?.message || "上传失败", icon: "none" });
        }
      },
    });
  },

  async onSubmit() {
    const { idCardFront, idCardBack, phone, code, skills, alipayAccount } =
      this.data.form;

    if (!idCardFront || !idCardBack) {
      wx.showToast({ title: "请上传身份证正反面", icon: "none" });
      return;
    }
    if (!phone) {
      wx.showToast({ title: "请输入手机号", icon: "none" });
      return;
    }
    if (!code) {
      wx.showToast({ title: "请输入验证码", icon: "none" });
      return;
    }
    if (!skills || skills.length === 0) {
      wx.showToast({ title: "请选择至少一项技能", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      await request("/api/worker/apply", "POST", {
        idCardImage: idCardFront,
        idCardImages: [idCardFront, idCardBack],
        phone,
        code,
        skills: skills.join(","),
        alipayAccount,
      });
      wx.showToast({ title: "提交成功", icon: "success" });
      // 重新加载状态，会自动切换到审核中页面
      this.loadStatus();
    } catch (e) {
      wx.showToast({ title: e?.message || "提交失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },

  // 重新申请
  onReapply() {
    this.setData({
      status: null,
      form: {
        idCardFront: "",
        idCardBack: "",
        phone: "",
        code: "",
        skills: [],
        alipayAccount: "",
      },
      skillList: this.data.skillList.map((s) => ({ ...s, selected: false })),
    });
  },

  goToOrders() {
    wx.switchTab({ url: "/pages/home/index" });
  },

  goBack() {
    wx.navigateBack();
  },
});
