import request from '~/api/request';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    totalSituationDataList: null,
    totalSituationKeyList: null,
    completeRateDataList: null,
    complete_rate_keyList: null,
    interactionSituationDataList: null,
    interaction_situation_keyList: null,
    areaDataList: null,
    areaDataKeysList: null,
    memberitemWidth: null,
    smallitemWidth: null,
  },

  onLoad() {
    this.init();
  },

  init() {
    this.getMemberData();
    this.getInteractionData();
    this.getCompleteRateData();
    this.getAreaData();
  },

  /**
   * 获取 “整体情况” 数据
   */
  async getMemberData() {
    try {
      const stats = await request('/api/worker/stats', 'GET');
      const totalSituationData = [
        { title: '接单数', value: stats.acceptedCount },
        { title: '完成数', value: stats.completedCount },
        { title: '好评率', value: `${Math.round((stats.positiveRate || 0) * 100)}%` },
      ];
      this.setData({
        totalSituationDataList: totalSituationData,
        memberitemWidth: `${(750 - 32 * (totalSituationData.length - 1)) / totalSituationData.length}rpx`,
      });
    } catch (e) {
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  /**
   * 获取 “互动情况” 数据
   */
  getInteractionData() {
    request('/dataCenter/interaction').then((res) => {
      const interactionSituationData = res.data.template.succ.data.list;
      this.setData({
        interactionSituationDataList: interactionSituationData,
        interactionSituationKeysList: Object.keys(interactionSituationData[0]),
      });

      // 计算每个.item元素的宽度
      const itemWidth = `${(750 - 32 * (interactionSituationData.length - 1)) / interactionSituationData.length}rpx`;
      // 更新.item元素的样式
      this.setData({
        smallitemWidth: itemWidth,
      });
    });
  },

  /**
   * 完播率
   */
  async getCompleteRateData() {
    try {
      const stats = await request('/api/worker/stats', 'GET');
      const completeRateData = [
        { name: '完成率', value: stats.acceptedCount ? `${Math.round((stats.completedCount / stats.acceptedCount) * 100)}%` : '0%' },
        { name: '好评数', value: stats.positiveCount },
        { name: '差评数', value: stats.negativeCount },
      ];
      this.setData({
        completeRateDataList: completeRateData,
        completeRateKeysList: ['name', 'value'],
        itemHeight: `${380 / completeRateData.length}rpx`,
      });
    } catch (e) {
      // ignore
    }
  },

  /**
   * 按区域统计
   */
  async getAreaData() {
    try {
      const stats = await request('/api/worker/stats', 'GET');
      const areaData = [
        { name: '收入(元)', value: stats.totalIncome },
        { name: '工作时长(分钟)', value: stats.totalWorkMinutes },
      ];
      this.setData({
        areaDataList: areaData,
        areaDataKeysList: ['name', 'value'],
      });
    } catch (e) {
      // ignore
    }
  },
});
