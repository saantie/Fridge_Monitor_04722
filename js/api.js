// ใส่ Google Apps Script URL ของคุณที่นี่
const API_URL = 'https://script.google.com/macros/s/AKfycbzJZMv7DQHHx2WHDRFmwVfUdayL8LH8i2N5YW76s-vcRMq86k1k1CqXjZWsWgBVYx6P9Q/exec';

class API {
  static async getDevices() {
    const url = `${API_URL}?action=get_devices`;
    const response = await fetch(url);
    return await response.json();
  }

  static async getLatestStatus() {
    const url = `${API_URL}?action=get_latest_status`;
    const response = await fetch(url);
    return await response.json();
  }

  static async getDeviceData(deviceName, hours = 24) {
    const url = `${API_URL}?action=get_data&device_name=${encodeURIComponent(deviceName)}&hours=${hours}`;
    const response = await fetch(url);
    return await response.json();
  }

  static async updateDeviceName(deviceId, newName) {
    const url = `${API_URL}?action=update_device_name&device_id=${encodeURIComponent(deviceId)}&new_name=${encodeURIComponent(newName)}`;
    const response = await fetch(url);
    return await response.json();
  }
}
