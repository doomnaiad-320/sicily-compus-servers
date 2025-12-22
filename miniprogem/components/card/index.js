Component({
  properties: {
    url: String,
    desc: String,
    tags: Array,
    id: String,
  },
  data: {},
  methods: {
    onTap() {
      this.triggerEvent('cardtap', { id: this.data.id });
    },
  },
});
