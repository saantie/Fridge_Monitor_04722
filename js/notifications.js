class NotificationManager {
  constructor() {
    this.token = null;
    this.permission = Notification.permission;
  }

  async init() {
    // ตรวจสอบว่า browser รองรับ notifications หรือไม่
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    // โหลด token ที่บันทึกไว้
    this.token = localStorage.getItem('fcm_token');
    
    // อัพเดท UI
    this.updateUI();

    return true;
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        console.log('Notification permission granted');
        await this.getToken();
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getToken() {
    try {
      const token = await messaging.getToken({ vapidKey: VAPID_KEY });
      
      if (token) {
        console.log('FCM Token:', token);
        this.token = token;
        localStorage.setItem('fcm_token', token);
        
        // บันทึก token ไปที่ Google Sheets
        await this.saveToken(token);
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async saveToken(token) {
    try {
      const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop';
      const response = await API.saveFCMToken(token, deviceName);
      console.log('Token saved to server:', response);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  async removeToken() {
    try {
      if (this.token) {
        await API.removeFCMToken(this.token);
        await messaging.deleteToken();
        localStorage.removeItem('fcm_token');
        this.token = null;
        console.log('Token removed');
      }
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  async enable() {
    const success = await this.requestPermission();
    this.updateUI();
    return success;
  }

  async disable() {
    await this.removeToken();
    this.permission = 'denied';
    this.updateUI();
  }

  updateUI() {
    const toggle = document.getElementById('notificationToggle');
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    const badge = document.getElementById('notificationBadge');

    if (toggle) {
      toggle.checked = this.permission === 'granted' && this.token !== null;
    }

    if (status && statusText) {
      if (this.permission === 'granted' && this.token) {
        status.classList.remove('hidden');
        statusText.textContent = '✅ เปิดการแจ้งเตือนแล้ว';
        statusText.className = 'status-success';
        badge.classList.add('hidden');
      } else if (this.permission === 'denied') {
        status.classList.remove('hidden');
        statusText.textContent = '❌ การแจ้งเตือนถูกปิด กรุณาเปิดในการตั้งค่า Browser';
        statusText.className = 'status-error';
        badge.classList.remove('hidden');
      } else {
        status.classList.add('hidden');
        badge.classList.remove('hidden');
      }
    }
  }

  setupForegroundNotifications() {
    // รับ notification เมื่อแอพเปิดอยู่
    messaging.onMessage((payload) => {
      console.log('Foreground message received:', payload);
      
      const { title, body } = payload.notification;
      
      // แสดง notification
      new Notification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'temperature-alert',
        requireInteraction: payload.data?.severity === 'critical'
      });

      // เล่นเสียงแจ้งเตือน (optional)
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    });
  }
}

// สร้าง instance
const notificationManager = new NotificationManager();
