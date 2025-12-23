export default {
  path: '/api/user/info',
  data: {
    id: 'mock-user',
    openid: 'mock-openid',
    nickname: '兼职者',
    avatar: '/static/avatar1.png',
    phone: '13800000000',
    currentRole: 'worker',
    worker: {
      id: 'mock-worker',
      status: 'approved',
      phoneVerified: true,
    },
  },
};
