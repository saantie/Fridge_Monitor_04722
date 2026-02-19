class NotificationManager {
  constructor() {
    this.token = null;
    this.permission = Notification.permission;
  }

  async init() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser does not support notifications');
      this.showUnsupportedMessage();
      return false;
    }

    // Check if running on HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('⚠️ Notifications require HTTPS');
      this.showHTTPSWarning();
      return false;
    }

    // Load saved token
    this.token = localStorage.getItem('fcm_token');
    this.permission = Notification.permission;
    
    // Update UI
    this.updateUI();

    console.log('🔔 Notification permission:', this.permission);
    return true;
  }

  async requestPermission() {
    try {
      console.log('📢 Requesting notification permission...');
      
      const permission = await Notification.requestPermission();
      this.permission = permission;

      console.log('👤 Permission result:', permission);

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        await this.getToken();
        return true;
      } else if (permission === 'denied') {
        console.log('❌ Notification permission denied');
        this.showDeniedInstructions();
        return false;
      } else {
        console.log('⏭️ Notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      this.showErrorMessage(error.message);
      return false;
    }
  }

async getToken() {
  try {
    console.log('🔑 Getting FCM token...');
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    const token = await messaging.getToken({ 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('./firebase-cloud-messaging-push-scope')
    });
    
    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      this.token = token;
      localStorage.setItem('fcm_token', token);
      
      // Save to server
      await this.saveToken(token);
      
      return token;
    } else {
      console.warn('⚠️ No registration token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    
    // Show specific error messages
    if (error.code === 'messaging/failed-service-worker-registration') {
      this.showServiceWorkerError();
    } else if (error.code === 'messaging/permission-blocked') {
      this.showBlockedInstructions();
    } else {
      this.showErrorMessage('Cannot get notification token: ' + error.message);
    }
    
    return null;
  }
}

showServiceWorkerError() {
  const status = document.getElementById('notificationStatus');
  const statusText = document.getElementById('notificationStatusText');
  if (status && statusText) {
    status.classList.remove('hidden');
    statusText.innerHTML = `
      ❌ <strong>Service Worker Error</strong><br>
      <small style="display: block; margin-top: 0.5rem;">
        Firebase messaging service worker failed to register.<br>
        Please try:
      </small>
      <ol style="margin: 0.5rem 0 0 1rem; padding: 0; text-align: left; font-size: 0.85rem; line-height: 1.5;">
        <li>Hard refresh: Ctrl+Shift+R</li>
        <li>Clear site data in DevTools</li>
        <li>Reload the page</li>
      </ol>
    `;
    statusText.className = 'status-error';
  }
}

  async saveToken(token) {
    try {
      const deviceName = this.getDeviceName();
      const response = await API.saveFCMToken(token, deviceName);
      console.log('💾 Token saved to server:', response);
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  }

  async removeToken() {
    try {
      if (this.token) {
        await API.removeFCMToken(this.token);
        await messaging.deleteToken();
        localStorage.removeItem('fcm_token');
        this.token = null;
        console.log('🗑️ Token removed');
      }
    } catch (error) {
      console.error('❌ Error removing token:', error);
    }
  }

  async enable() {
    const success = await this.requestPermission();
    this.updateUI();
    return success;
  }

  async disable() {
    await this.removeToken();
    this.permission = 'default';
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
      status.classList.remove('hidden');
      
      if (this.permission === 'granted' && this.token) {
        statusText.innerHTML = '✅ <strong>Notifications Enabled</strong><br><small>You will receive alerts</small>';
        statusText.className = 'status-success';
        if (badge) badge.classList.add('hidden');
        
      } else if (this.permission === 'denied') {
        statusText.innerHTML = '❌ <strong>Notifications Blocked</strong><br><small>Click below to fix</small>';
        statusText.className = 'status-error';
        if (badge) badge.classList.remove('hidden');
        this.showBlockedInstructions();
        
      } else {
        statusText.innerHTML = 'ℹ️ <strong>Enable Notifications</strong><br><small>Toggle switch above</small>';
        statusText.className = 'status-info';
        if (badge) badge.classList.remove('hidden');
      }
    }
  }

  setupForegroundNotifications() {
    try {
      messaging.onMessage((payload) => {
        console.log('📨 Foreground message received:', payload);
        
        const { title, body } = payload.notification;
        
        // Show notification
        const notification = new Notification(title, {
          body: body,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: 'temperature-alert',
          requireInteraction: payload.data?.severity === 'critical',
          vibrate: payload.data?.severity === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200]
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Play sound (optional)
        this.playNotificationSound();
      });
      
      console.log('🎧 Foreground notifications setup complete');
    } catch (error) {
      console.error('❌ Error setting up foreground notifications:', error);
    }
  }

  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore sound errors
    }
  }

  getDeviceName() {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) {
      if (/android/i.test(ua)) return 'Android Device';
      if (/iphone|ipad|ipod/i.test(ua)) return 'iOS Device';
      return 'Mobile Device';
    }
    return 'Desktop';
  }

  // Error message helpers
  showUnsupportedMessage() {
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    if (status && statusText) {
      status.classList.remove('hidden');
      statusText.innerHTML = '⚠️ <strong>Browser Not Supported</strong><br><small>Please use Chrome, Edge, or Firefox</small>';
      statusText.className = 'status-error';
    }
  }

  showHTTPSWarning() {
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    if (status && statusText) {
      status.classList.remove('hidden');
      statusText.innerHTML = '🔒 <strong>HTTPS Required</strong><br><small>Notifications only work on HTTPS</small>';
      statusText.className = 'status-error';
    }
  }

  showDeniedInstructions() {
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    if (status && statusText) {
      status.classList.remove('hidden');
      statusText.innerHTML = `
        ❌ <strong>Notifications Blocked</strong><br>
        <small>To enable:</small><br>
        <ol style="margin: 0.5rem 0 0 1rem; padding: 0; text-align: left; font-size: 0.85rem;">
          <li>Click the lock icon 🔒 in address bar</li>
          <li>Find "Notifications"</li>
          <li>Change to "Allow"</li>
          <li>Reload the page</li>
        </ol>
      `;
      statusText.className = 'status-error';
    }
  }

  showBlockedInstructions() {
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    if (status && statusText) {
      status.classList.remove('hidden');
      statusText.innerHTML = `
        ❌ <strong>Notifications Blocked by Browser</strong><br>
        <small style="display: block; margin-top: 0.5rem;">Follow these steps:</small>
        <ol style="margin: 0.5rem 0 0 1rem; padding: 0; text-align: left; font-size: 0.85rem; line-height: 1.5;">
          <li>Click lock icon 🔒 in address bar</li>
          <li>Click "Site settings"</li>
          <li>Find "Notifications"</li>
          <li>Select "Allow"</li>
          <li>Close settings and reload</li>
        </ol>
      `;
      statusText.className = 'status-error';
    }
  }

  showErrorMessage(message) {
    const status = document.getElementById('notificationStatus');
    const statusText = document.getElementById('notificationStatusText');
    if (status && statusText) {
      status.classList.remove('hidden');
      statusText.innerHTML = `❌ <strong>Error</strong><br><small>${message}</small>`;
      statusText.className = 'status-error';
    }
  }
}

// Create instance
const notificationManager = new NotificationManager();
