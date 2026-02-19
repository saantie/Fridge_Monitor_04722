/**
 * Onboarding & Permission Manager
 * Handles first-time setup after PWA installation
 */

class OnboardingManager {
  constructor() {
    this.hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true';
    this.isPWA = this.checkIfPWA();
  }

  checkIfPWA() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator.standalone);
    const isAndroidPWA = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSStandalone || isAndroidPWA;
  }

  shouldShowOnboarding() {
    return this.isPWA && 
           !this.hasCompletedOnboarding;
  }

  async start() {
    console.log('🎯 Onboarding check:', {
      isPWA: this.isPWA,
      completed: this.hasCompletedOnboarding,
      notificationPermission: Notification.permission
    });

    if (this.shouldShowOnboarding()) {
      console.log('🎉 Starting onboarding...');
      await this.showOnboarding();
    }
  }

  async showOnboarding() {
    this.createOnboardingUI();
    
    const modal = document.getElementById('onboardingModal');
    modal.classList.remove('hidden');
  }

  createOnboardingUI() {
    if (document.getElementById('onboardingModal')) {
      return;
    }

    const modalHTML = `
      <div id="onboardingModal" class="modal onboarding-modal hidden">
        <div class="modal-content onboarding-content">
          <!-- Step 1: Welcome -->
          <div id="onboardingStep1" class="onboarding-step">
            <div class="onboarding-icon">🌡️</div>
            <h2>Welcome to Fridge Monitor!</h2>
            <p>Monitor your refrigerator temperature in real-time and get instant alerts.</p>
            <button id="onboardingNext1" class="btn-primary btn-large">Get Started</button>
          </div>

          <!-- Step 2: Check Permission Status -->
          <div id="onboardingStep2" class="onboarding-step hidden">
            <div class="onboarding-icon">🔔</div>
            <h2>Enable Notifications</h2>
            <p>Receive instant alerts when temperature goes out of range.</p>
            
            <div class="permission-info">
              <div class="permission-item">
                <span class="permission-icon">✅</span>
                <div>
                  <strong>Critical Alerts</strong>
                  <small>Temperature exceeds safe limits</small>
                </div>
              </div>
              <div class="permission-item">
                <span class="permission-icon">⚠️</span>
                <div>
                  <strong>Warning Alerts</strong>
                  <small>Temperature approaching limits</small>
                </div>
              </div>
              <div class="permission-item">
                <span class="permission-icon">📱</span>
                <div>
                  <strong>Works Offline</strong>
                  <small>Receive alerts even when app is closed</small>
                </div>
              </div>
            </div>

            <div id="permissionStatusBox" class="permission-status-box"></div>

            <div id="notificationButtons" class="notification-buttons">
              <button id="onboardingEnableNotifications" class="btn-primary btn-large">
                🔔 Enable Notifications
              </button>
              <button id="onboardingSkip" class="btn-secondary">Skip for now</button>
            </div>
          </div>

          <!-- Step 3: Success -->
          <div id="onboardingStep3" class="onboarding-step hidden">
            <div class="onboarding-icon success">✅</div>
            <h2>All Set!</h2>
            <p>You're ready to monitor your refrigerator temperature.</p>
            
            <div class="success-info">
              <p>✅ Notifications enabled</p>
              <p>✅ App installed</p>
              <p>✅ Ready to use offline</p>
            </div>

            <button id="onboardingFinish" class="btn-primary btn-large">Start Monitoring</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const next1 = document.getElementById('onboardingNext1');
    if (next1) {
      next1.addEventListener('click', () => this.goToStep2());
    }

    const enableBtn = document.getElementById('onboardingEnableNotifications');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.handleEnableNotifications());
    }

    const skipBtn = document.getElementById('onboardingSkip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipOnboarding());
    }

    const finishBtn = document.getElementById('onboardingFinish');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.completeOnboarding());
    }
  }

  goToStep(stepNumber) {
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.add('hidden');
    });

    const targetStep = document.getElementById(`onboardingStep${stepNumber}`);
    if (targetStep) {
      targetStep.classList.remove('hidden');
    }
  }

  async goToStep2() {
    this.goToStep(2);
    await this.checkPermissionStatus();
  }

  async checkPermissionStatus() {
    const statusBox = document.getElementById('permissionStatusBox');
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    
    const permission = Notification.permission;
    console.log('🔍 Current permission:', permission);

    // Check if iOS
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      statusBox.innerHTML = this.getIOSMessage();
      statusBox.className = 'permission-status-box blocked';
      enableBtn.style.display = 'none';
      return;
    }

    if (permission === 'denied') {
      // Permission was blocked before
      statusBox.innerHTML = this.getResetInstructionsHTML();
      statusBox.className = 'permission-status-box blocked';
      enableBtn.textContent = '⚙️ I have reset permissions';
      
    } else if (permission === 'granted') {
      // Already granted
      statusBox.innerHTML = `
        <div class="permission-already-granted">
          ✅ <strong>Notifications already enabled!</strong>
        </div>
      `;
      statusBox.className = 'permission-status-box granted';
      
      // Get FCM token
      await notificationManager.getToken();
      
      // Auto proceed to next step
      setTimeout(() => {
        this.goToStep(3);
      }, 1000);
      
    } else {
      // Default - can request
      statusBox.innerHTML = `
        <div class="permission-ready">
          ℹ️ <strong>Ready to enable notifications</strong><br>
          <small>Click the button below to allow notifications</small>
        </div>
      `;
      statusBox.className = 'permission-status-box ready';
    }
  }

  getIOSMessage() {
    return `
      <div class="ios-warning">
        <div class="warning-icon">📱</div>
        <strong>iOS Not Supported</strong><br>
        <p>Safari on iOS doesn't support web push notifications.</p>
        <p><strong>Alternatives:</strong></p>
        <ul>
          <li>Use Chrome on Android device</li>
          <li>Use Desktop browser (Chrome/Edge/Firefox)</li>
          <li>Check app manually for updates</li>
        </ul>
      </div>
    `;
  }

getResetInstructionsHTML() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isMobile) {
    return `
      <div class="permission-blocked">
        <div class="blocked-icon">🚫</div>
        <strong>Notifications are currently blocked</strong>
        <p>Choose one of these methods to enable:</p>
        
        <!-- Method 1: Uninstall & Reinstall -->
        <div class="reset-method">
          <h4>✨ Method 1: Reinstall App (Easiest)</h4>
          <ol>
            <li><strong>Long press</strong> the app icon on home screen</li>
            <li>Tap <strong>Uninstall</strong> or <strong>Remove</strong></li>
            <li>Open Chrome and go to:<br>
                <code>https://saantie.github.io/Fridge_Monitor_04722/</code></li>
            <li>Menu <strong>⋮</strong> → <strong>Add to Home screen</strong></li>
            <li>Open the new app → Enable notifications</li>
          </ol>
        </div>

        <!-- Method 2: Clear Site Data -->
        <div class="reset-method">
          <h4>🗑️ Method 2: Clear Site Data</h4>
          <ol>
            <li>Open this app in <strong>Chrome browser</strong> (not as installed app)</li>
            <li>Tap <strong>⋮</strong> (3 dots) at top right</li>
            <li>Tap <strong>Settings</strong></li>
            <li>Tap <strong>Site settings</strong></li>
            <li>Scroll down → Tap <strong>All sites</strong></li>
            <li>Find <strong>saantie.github.io</strong></li>
            <li>Tap <strong>Clear & reset</strong></li>
            <li>Go back and reload the page</li>
          </ol>
        </div>

        <!-- Method 3: Manual Add -->
        <div class="reset-method">
          <h4>⚙️ Method 3: Add Manually</h4>
          <ol>
            <li>Tap <strong>⋮</strong> (3 dots) → <strong>Settings</strong></li>
            <li>Tap <strong>Site settings</strong></li>
            <li>Tap <strong>Notifications</strong></li>
            <li>Under "Allowed", tap <strong>Add site exception</strong></li>
            <li>Enter: <strong>https://saantie.github.io</strong></li>
            <li>Tap <strong>Add</strong></li>
            <li>Come back here and reload</li>
          </ol>
        </div>
        
        <div class="help-video">
          <small>💡 After completing any method, come back and tap "I have reset permissions" below</small>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="permission-blocked">
        <div class="blocked-icon">🚫</div>
        <strong>Notifications are currently blocked</strong>
        <p>Choose one of these methods:</p>
        
        <!-- Desktop Method 1 -->
        <div class="reset-method">
          <h4>🔒 Method 1: From Address Bar (Fastest)</h4>
          <ol>
            <li>Click the <strong>🔒 lock icon</strong> or <strong>ℹ️ info icon</strong> in address bar (left side)</li>
            <li>Find <strong>Notifications</strong></li>
            <li>Change from <strong>Block</strong> to <strong>Ask</strong> or <strong>Allow</strong></li>
            <li>Reload this page (F5 or Ctrl+R)</li>
          </ol>
        </div>

        <!-- Desktop Method 2 -->
        <div class="reset-method">
          <h4>⚙️ Method 2: Chrome Settings</h4>
          <ol>
            <li>Copy this: <code>chrome://settings/content/notifications</code></li>
            <li>Paste in address bar and press Enter</li>
            <li>Under "Not allowed", find <strong>saantie.github.io</strong></li>
            <li>Click <strong>⋮</strong> (3 dots) → <strong>Allow</strong></li>
            <li>Come back here and reload</li>
          </ol>
        </div>

        <!-- Desktop Method 3 -->
        <div class="reset-method">
          <h4>🗑️ Method 3: Clear & Retry</h4>
          <ol>
            <li>Press <strong>F12</strong> to open DevTools</li>
            <li>Go to <strong>Application</strong> tab</li>
            <li>Click <strong>Clear storage</strong> (left sidebar)</li>
            <li>Click <strong>Clear site data</strong> button</li>
            <li>Close DevTools and reload page</li>
          </ol>
        </div>
      </div>
    `;
  }
}

  async handleEnableNotifications() {
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    const statusBox = document.getElementById('permissionStatusBox');
    
    const currentPermission = Notification.permission;

    if (currentPermission === 'denied') {
      // Check if user has reset it
      const recheckPermission = Notification.permission;
      
      if (recheckPermission === 'denied') {
        // Still denied - show instructions again
        alert(
          '⚠️ Notifications are still blocked.\n\n' +
          'Please follow the instructions above to reset permissions in your browser settings, ' +
          'then reload the app and try again.'
        );
        return;
      }
    }

    try {
      enableBtn.disabled = true;
      enableBtn.textContent = '⏳ Requesting...';

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        statusBox.innerHTML = `
          <div class="permission-success">
            ✅ <strong>Success!</strong> Getting notification token...
          </div>
        `;
        statusBox.className = 'permission-status-box granted';
        
        // Get FCM token
        await notificationManager.getToken();
        
        // Go to success step
        setTimeout(() => {
          this.goToStep(3);
        }, 1000);
        
      } else if (permission === 'denied') {
        // User clicked "Block" or "Don't allow"
        statusBox.innerHTML = this.getResetInstructionsHTML();
        statusBox.className = 'permission-status-box blocked';
        enableBtn.disabled = false;
        enableBtn.textContent = '⚙️ I have reset permissions';
        
      } else {
        // User dismissed (clicked X)
        statusBox.innerHTML = `
          <div class="permission-dismissed">
            ⚠️ <strong>Permission request dismissed</strong><br>
            <small>Please try again or skip for now</small>
          </div>
        `;
        statusBox.className = 'permission-status-box dismissed';
        enableBtn.disabled = false;
        enableBtn.textContent = '🔔 Try Again';
      }

    } catch (error) {
      console.error('Error requesting notifications:', error);
      statusBox.innerHTML = `
        <div class="permission-error">
          ❌ <strong>Error:</strong> ${error.message}
        </div>
      `;
      statusBox.className = 'permission-status-box error';
      enableBtn.disabled = false;
      enableBtn.textContent = '🔔 Try Again';
    }
  }

  skipOnboarding() {
    console.log('⏭️ Onboarding skipped');
    this.completeOnboarding();
  }

  completeOnboarding() {
    localStorage.setItem('onboarding_completed', 'true');
    this.hasCompletedOnboarding = true;
    
    const modal = document.getElementById('onboardingModal');
    if (modal) {
      modal.classList.add('hidden');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }

    console.log('✅ Onboarding completed');
  }

  reset() {
    localStorage.removeItem('onboarding_completed');
    this.hasCompletedOnboarding = false;
    console.log('🔄 Onboarding reset');
  }
}

const onboardingManager = new OnboardingManager();
