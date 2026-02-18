// ใส่ Google Apps Script URL ของคุณที่นี่
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

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
