const { request } = require('../../utils/api');

Page({
  data: {
    appointments: [],
    statusText: {
      pending: '待确认',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消'
    }
  },

  onShow() {
    if (!wx.getStorageSync('token')) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadAppointments();
  },

  async loadAppointments() {
    try {
      const data = await request('/api/my-appointments');
      this.setData({ appointments: data.appointments });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  }
});
