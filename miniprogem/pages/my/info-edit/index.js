import request from '~/api/request';
import config from '~/config';

Page({
  data: {
    form: {
      idCardImage: '',
      phone: '',
      code: '1111',
      skills: '',
      alipayAccount: '',
    },
    status: null,
    statusReason: '',
    uploading: false,
    saving: false,
  },

  onShow() {
    this.loadStatus();
  },

  async loadStatus() {
    try {
      const res = await request('/api/worker/status', 'GET');
      this.setData({ status: res.status, statusReason: res.reason || '' });
    } catch (e) {
      // ignore
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ form: { ...this.data.form, [field]: e.detail.value } });
  },

  async onUpload() {
    wx.chooseImage({
      count: 1,
      success: async (res) => {
        const filePath = res.tempFilePaths[0];
        if (!filePath.toLowerCase().endsWith('.png')) {
          wx.showToast({ title: '请上传 PNG', icon: 'none' });
          return;
        }
        this.setData({ uploading: true });
        wx.uploadFile({
          url: `${config.baseUrl}/api/upload`,
          filePath,
          name: 'file',
          success: (uploadRes) => {
            const data = JSON.parse(uploadRes.data);
            this.setData({ form: { ...this.data.form, idCardImage: data.url } });
          },
          fail: () => {
            wx.showToast({ title: '上传失败', icon: 'none' });
          },
          complete: () => {
            this.setData({ uploading: false });
          },
        });
      },
    });
  },

  async onSubmit() {
    const { idCardImage, phone, code, skills, alipayAccount } = this.data.form;
    if (!idCardImage || !phone || !code) {
      wx.showToast({ title: '请完善信息', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await request('/api/worker/apply', 'POST', {
        idCardImage,
        phone,
        code,
        skills,
        alipayAccount,
      });
      wx.showToast({ title: '提交成功', icon: 'success' });
      this.loadStatus();
    } catch (e) {
      wx.showToast({ title: e?.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
