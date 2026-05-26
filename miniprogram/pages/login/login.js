const { request } = require('../../utils/api');

Page({
  data: {
    name: '',
    phone: '',
    address: '',
    loading: false
  },

  onLoad() {
    const user = wx.getStorageSync('user');
    if (user) {
      this.setData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ phone: event.detail.value });
  },

  onAddressInput(event) {
    this.setData({ address: event.detail.value });
  },

  async login() {
    if (!this.data.name || !this.data.phone) {
      wx.showToast({ title: '请填写称呼和手机号', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const data = await request('/api/login', {
        method: 'POST',
        data: {
          name: this.data.name,
          phone: this.data.phone,
          address: this.data.address
        }
      });
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('user', data.user);
      wx.switchTab({ url: '/pages/booking/booking' });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
