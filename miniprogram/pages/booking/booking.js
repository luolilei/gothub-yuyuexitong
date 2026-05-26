const { request } = require('../../utils/api');

Page({
  data: {
    services: ['基础补水护理', '深层清洁护理', '敏感肌舒缓', '抗初老紧致', '新娘妆前护理'],
    serviceIndex: 0,
    bookingDate: '',
    bookingTime: '',
    address: '',
    note: '',
    loading: false
  },

  onShow() {
    const user = wx.getStorageSync('user');
    if (!wx.getStorageSync('token')) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    if (user && user.address && !this.data.address) {
      this.setData({ address: user.address });
    }
  },

  onServiceChange(event) {
    this.setData({ serviceIndex: Number(event.detail.value) });
  },

  onDateChange(event) {
    this.setData({ bookingDate: event.detail.value });
  },

  onTimeChange(event) {
    this.setData({ bookingTime: event.detail.value });
  },

  onAddressInput(event) {
    this.setData({ address: event.detail.value });
  },

  onNoteInput(event) {
    this.setData({ note: event.detail.value });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  async submitBooking() {
    if (!this.data.bookingDate || !this.data.bookingTime || !this.data.address) {
      wx.showToast({ title: '请完善预约信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      await request('/api/appointments', {
        method: 'POST',
        data: {
          service: this.data.services[this.data.serviceIndex],
          bookingDate: this.data.bookingDate,
          bookingTime: this.data.bookingTime,
          address: this.data.address,
          note: this.data.note
        }
      });
      wx.showToast({ title: '预约已提交', icon: 'success' });
      this.setData({ note: '' });
      setTimeout(() => wx.switchTab({ url: '/pages/orders/orders' }), 800);
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
