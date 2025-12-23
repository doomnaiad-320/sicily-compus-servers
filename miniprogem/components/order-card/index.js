const SERVICE_TYPE_ICONS = {
  delivery: 'package',
  shopping: 'shop',
  printing: 'file-copy',
  tutoring: 'education',
  errand: 'run',
  cleaning: 'clear',
  other: 'ellipsis',
};

const SERVICE_TYPE_COLORS = {
  delivery: '#ff6b35',
  shopping: '#f7c242',
  printing: '#4ecdc4',
  tutoring: '#6c5ce7',
  errand: '#00b894',
  cleaning: '#74b9ff',
  other: '#a29bfe',
};

Component({
  properties: {
    order: {
      type: Object,
      value: {},
    },
    canTake: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    serviceIcon: 'ellipsis',
    serviceColor: '#a29bfe',
  },

  observers: {
    'order.serviceType': function(serviceType) {
      this.setData({
        serviceIcon: SERVICE_TYPE_ICONS[serviceType] || 'ellipsis',
        serviceColor: SERVICE_TYPE_COLORS[serviceType] || '#a29bfe',
      });
    },
  },

  methods: {
    onCardTap() {
      this.triggerEvent('cardtap', { id: this.data.order.id });
    },

    onTakeTap(e) {
      e.stopPropagation();
      this.triggerEvent('taketap', { id: this.data.order.id });
    },
  },
});
