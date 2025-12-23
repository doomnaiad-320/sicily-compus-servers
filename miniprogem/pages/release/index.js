import request from '~/api/request';

// 服务类型选项
const SERVICE_TYPES = [
  { value: 'delivery', label: '代取快递' },
  { value: 'shopping', label: '代购' },
  { value: 'printing', label: '打印复印' },
  { value: 'tutoring', label: '辅导答疑' },
  { value: 'errand', label: '跑腿' },
  { value: 'cleaning', label: '清洁服务' },
  { value: 'other', label: '其他' },
];

// pages/release/index.js

Page({
  data: {
    serviceTypes: SERVICE_TYPES,
    serviceTypeIndex: -1,
    form: {
      title: '',
      serviceType: '',
      type: '',
      description: '',
      address: '',
      amount: '',
      expectedTime: '',
      contactName: '',
      contactPhone: '',
    },
    submitting: false,
  },
  onTitleChange(e) {
    this.setData({ form: { ...this.data.form, title: e.detail.value } });
  },
  onServiceTypeChange(e) {
    const index = e.detail.value;
    const selected = SERVICE_TYPES[index];
    this.setData({
      serviceTypeIndex: index,
      form: {
        ...this.data.form,
        serviceType: selected.value,
        type: selected.label,
      },
    });
  },
  onTypeChange(e) {
    this.setData({ form: { ...this.data.form, type: e.detail.value } });
  },
  onDescChange(e) {
    this.setData({ form: { ...this.data.form, description: e.detail.value } });
  },
  onAddressChange(e) {
    this.setData({ form: { ...this.data.form, address: e.detail.value } });
  },
  onExpectedChange(e) {
    this.setData({ form: { ...this.data.form, expectedTime: e.detail.value } });
  },
  onContactNameChange(e) {
    this.setData({ form: { ...this.data.form, contactName: e.detail.value } });
  },
  onContactPhoneChange(e) {
    this.setData({ form: { ...this.data.form, contactPhone: e.detail.value } });
  },
  onShow() {
    // 使用默认地址
    const cached = wx.getStorageSync('default_address');
    if (cached && !this.data.form.address) {
      this.setData({ form: { ...this.data.form, address: cached.detail || '' } });
    }
  },
  onAmountChange(e) {
    this.setData({ form: { ...this.data.form, amount: e.detail.value } });
  },
  async release() {
    const { serviceType, type, title, description, address, amount, expectedTime, contactName, contactPhone } = this.data.form;
    if (!serviceType || !description || !address || !amount) {
      wx.showToast({ title: '请完整填写信息', icon: 'none' });
      return;
    }
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({ title: '金额无效', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中' });
    try {
      const order = await request('/api/order', 'POST', {
        serviceType,
        type,
        title,
        description,
        address,
        expectedTime,
        contactName,
        contactPhone,
        amount: amountNum,
      });
      await request(`/api/order/${order.id}/pay`, 'POST');
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({
          url: `/pages/home/index`,
        });
      }, 1000);
    } catch (e) {
      wx.showToast({ title: e?.message || '发布失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
