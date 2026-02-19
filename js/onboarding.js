/**
 * ========================================
 * Onboarding & Permission Manager
 * Handles first-time setup after PWA installation
 * ========================================
 */

class OnboardingManager {
  constructor() {
    this.hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true';
    this.isPWA = this.checkIfPWA();
  }

  /**
   * Check if running as installed PWA
   */
  checkIfPWA() {
    // Check display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if launched from home screen (iOS)
    const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    // Check if Android TWA or installed PWA
    const isAndroidPWA = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSStandalone || isAndroidPWA;
  }

  /**
   * Check if should show onboarding
   */
  shouldShowOnboarding() {
    return this.isPWA && !this.hasCompletedOnboarding;
  }

  /**
   * Start onboarding process
   */
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

  /**
   * Show onboarding modal
   */
  async showOnboarding() {
    this.createOnboardingUI();
    
    const modal = document.getElementById('onboardingModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  /**
   * Create onboarding UI
   */
  createOnboardingUI() {
    // Check if already exists
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

          <!-- Step 2: Notifications -->
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

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Step 1 -> Step 2
    const next1 = document.getElementById('onboardingNext1');
    if (next1) {
      next1.addEventListener('click', () => this.goToStep2());
    }

    // Enable Notifications
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.handleEnableNotifications());
    }

    // Skip
    const skipBtn = document.getElementById('onboardingSkip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipOnboarding());
    }

    // Finish
    const finishBtn = document.getElementById('onboardingFinish');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.completeOnboarding());
    }

    // Quick action buttons (will be created dynamically)
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'openChromeSettings') {
        this.openChromeSettings();
      }
      if (e.target && e.target.id === 'copyAppUrl') {
        this.copyAppUrl();
      }
    });
  }

  /**
   * Go to specific step
   */
  goToStep(stepNumber) {
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.add('hidden');
    });

    const targetStep = document.getElementById(`onboardingStep${stepNumber}`);
    if (targetStep) {
      targetStep.classList.remove('hidden');
    }
  }

  /**
   * Go to step 2 and check permission status
   */
  async goToStep2() {
    this.goToStep(2);
    await this.checkPermissionStatus();
  }

  /**
   * Check current permission status
   */
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
      if (enableBtn) enableBtn.style.display = 'none';
      return;
    }

    if (permission === 'denied') {
      // Permission was blocked before
      statusBox.innerHTML = this.getResetInstructionsHTML();
      statusBox.className = 'permission-status-box blocked';
      if (enableBtn) {
        enableBtn.textContent = '⚙️ I have reset permissions';
      }
      
    } else if (permission === 'granted') {
      // Already granted
      statusBox.innerHTML = `
        <div class="permission-already-granted">
          ✅ <strong>Notifications already enabled!</strong>
        </div>
      `;
      statusBox.className = 'permission-status-box granted';
      
      // Get FCM token
      try {
        await notificationManager.getToken();
      } catch (error) {
        console.error('Error getting token:', error);
      }
      
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

  /**
   * Get iOS warning message
   */
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

  /**
   * Get reset instructions HTML
   */
  getResetInstructionsHTML() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      return `
        <div class="permission-blocked">
          <div class="blocked-icon">🚫</div>
          <strong>Notifications are currently blocked</strong>
          <p>Choose the easiest method for you:</p>
          
          <!-- Quick Action Buttons -->
          <div class="quick-actions">
            <button id="openChromeSettings" class="btn-action">
              ⚙️ Open Chrome Settings
            </button>
            <button id="copyAppUrl" class="btn-action">
              📋 Copy App URL
            </button>
          </div>

          <!-- Method 1: Uninstall & Reinstall -->
          <div class="reset-method recommended">
            <div class="method-badge">⭐ RECOMMENDED</div>
            <h4>✨ Method 1: Reinstall App</h4>
            <ol>
              <li><strong>Long press</strong> the app icon on home screen</li>
              <li>Tap <strong>Uninstall</strong> or <strong>Remove from Home screen</strong></li>
              <li>Open Chrome → Paste URL (use Copy button above)</li>
              <li>Menu <strong>⋮</strong> → <strong>Add to Home screen</strong></li>
              <li>Open new app → Accept notifications</li>
            </ol>
            <div class="method-note">✅ This completely resets permissions</div>
          </div>

          <!-- Method 2: Clear Site Data -->
          <div class="reset-method">
            <h4>🗑️ Method 2: Clear Site Data</h4>
            <ol>
              <li>Open Chrome app (not the installed PWA)</li>
              <li>Go to this URL (use Copy button above)</li>
              <li><strong>⋮</strong> → <strong>Settings</strong></li>
              <li><strong>Site settings</strong> → <strong>All sites</strong></li>
              <li>Find and tap <strong>saantie.github.io</strong></li>
              <li>Tap <strong>Clear & reset</strong></li>
              <li>Reload the page</li>
            </ol>
          </div>

          <!-- Method 3: Add Exception -->
          <div class="reset-method">
            <h4>⚙️ Method 3: Add Site Exception</h4>
            <ol>
              <li>Open Chrome → <strong>⋮</strong> → <strong>Settings</strong></li>
              <li><strong>Site settings</strong> → <strong>Notifications</strong></li>
              <li>Under "Allowed", tap <strong>Add site exception</strong></li>
              <li>Paste: <code>https://saantie.github.io</code></li>
              <li>Tap <strong>Add</strong></li>
              <li>Reload this app</li>
            </ol>
          </div>
          
          <div class="help-footer">
            <p>💡 <strong>After completing any method:</strong></p>
            <p>Close and reopen the app, then tap "I have reset permissions" below</p>
          </div>
        </div>
      `;
    } else {
      // Desktop
      return `
        <div class="permission-blocked">
          <div class="blocked-icon">🚫</div>
          <strong>Notifications are currently blocked</strong>
          <p>Choose one of these methods:</p>
          
          <!-- Desktop Method 1 -->
          <div class="reset-method recommended">
            <div class="method-badge">⭐ FASTEST</div>
            <h4>🔒 Method 1: From Address Bar</h4>
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

          <div class="help-footer">
            <p>💡 <strong>After completing any method:</strong></p>
            <p>Reload this page and tap "I have reset permissions" below</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Handle enable notifications button click
   */
  async handleEnableNotifications() {
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    const statusBox = document.getElementById('permissionStatusBox');
    
    const currentPermission = Notification.permission;

    if (currentPermission === 'denied') {
      // Check if user has reset it
      const recheckPermission = Notification.permission;
      
      if (recheckPermission === 'denied') {
        // Still denied - show alert
        alert(
          '⚠️ Notifications are still blocked.\n\n' +
          'Please follow the instructions above to reset permissions in your browser settings, ' +
          'then reload the app and try again.'
        );
        return;
      }
    }

    try {
      if (enableBtn) {
        enableBtn.disabled = true;
        enableBtn.textContent = '⏳ Requesting...';
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        if (statusBox) {
          statusBox.innerHTML = `
            <div class="permission-success">
              ✅ <strong>Success!</strong> Getting notification token...
            </div>
          `;
          statusBox.className = 'permission-status-box granted';
        }
        
        // Get FCM token
        try {
          await notificationManager.getToken();
        } catch (error) {
          console.error('Error getting token:', error);
        }
        
        // Go to success step
        setTimeout(() => {
          this.goToStep(3);
        }, 1000);
        
      } else if (permission === 'denied') {
        // User clicked "Block"
        if (statusBox) {
          statusBox.innerHTML = this.getResetInstructionsHTML();
          statusBox.className = 'permission-status-box blocked';
        }
        if (enableBtn) {
          enableBtn.disabled = false;
          enableBtn.textContent = '⚙️ I have reset permissions';
        }
        
      } else {
        // User dismissed
        if (statusBox) {
          statusBox.innerHTML = `
            <div class="permission-dismissed">
              ⚠️ <strong>Permission request dismissed</strong><br>
              <small>Please try again or skip for now</small>
            </div>
          `;
          statusBox.className = 'permission-status-box dismissed';
        }
        if (enableBtn) {
          enableBtn.disabled = false;
          enableBtn.textContent = '🔔 Try Again';
        }
      }

    } catch (error) {
      console.error('Error requesting notifications:', error);
      if (statusBox) {
        statusBox.innerHTML = `
          <div class="permission-error">
            ❌ <strong>Error:</strong> ${error.message}
          </div>
        `;
        statusBox.className = 'permission-status-box error';
      }
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.textContent = '🔔 Try Again';
      }
    }
  }

  /**
   * Skip onboarding
   */
  skipOnboarding() {
    console.log('⏭️ Onboarding skipped');
    this.completeOnboarding();
  }

  /**
   * Complete onboarding
   */
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

  /**
   * Open Chrome settings (helper function)
   */
  openChromeSettings() {
    const settingsUrls = [
      'chrome://settings/content/notifications',
      'chrome://settings/content/siteDetails?site=' + encodeURIComponent(location.origin)
    ];

    try {
      window.open(settingsUrls[0], '_blank');
    } catch (error) {
      alert(
        '⚙️ Please open Chrome Settings manually:\n\n' +
        '1. Tap ⋮ (3 dots)\n' +
        '2. Settings\n' +
        '3. Site settings\n' +
        '4. Notifications'
      );
    }
  }

  /**
   * Copy app URL to clipboard
   */
  async copyAppUrl() {
    const url = location.origin + location.pathname;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        this.showCopySuccess();
      } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showCopySuccess();
      }
    } catch (error) {
      alert('App URL:\n\n' + url + '\n\nPlease copy manually');
    }
  }

  /**
   * Show copy success feedback
   */
  showCopySuccess() {
    const btn = document.getElementById('copyAppUrl');
    if (btn) {
      const originalText = btn.textContent;
      const originalBg = btn.style.background;
      
      btn.textContent = '✅ Copied!';
      btn.style.background = '#48bb78';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
      }, 2000);
    }
  }

  /**
   * Reset onboarding (for testing)
   */
  reset() {
    localStorage.removeItem('onboarding_completed');
    this.hasCompletedOnboarding = false;
    console.log('🔄 Onboarding reset');
  }
}

// ========== CREATE GLOBAL INSTANCE ==========
const onboardingManager = new OnboardingManager();

// ========== CONSOLE HELPER ==========
console.log('💡 Onboarding Manager loaded');
console.log('   - Type onboardingManager.reset() to reset onboarding');
console.log('   - Type onboardingManager.start() to start onboarding manually');
