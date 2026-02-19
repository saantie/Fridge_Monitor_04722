/**
 * Onboarding & Permission Manager
 * Handles first-time setup after PWA installation
 */

class OnboardingManager {
  constructor() {
    this.hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true';
    this.isPWA = this.checkIfPWA();
  }

  // Check if running as installed PWA
  checkIfPWA() {
    // Check display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if launched from home screen (iOS)
    const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    // Check if Android TWA or installed PWA
    const isAndroidPWA = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSStandalone || isAndroidPWA;
  }

  shouldShowOnboarding() {
    // Show onboarding if:
    // 1. Running as PWA
    // 2. Haven't completed onboarding before
    // 3. Don't have notification permission yet
    
    return this.isPWA && 
           !this.hasCompletedOnboarding && 
           Notification.permission !== 'granted';
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
    // Create and show onboarding modal
    this.createOnboardingUI();
    
    const modal = document.getElementById('onboardingModal');
    modal.classList.remove('hidden');
    
    // Prevent closing by clicking outside
    modal.style.pointerEvents = 'auto';
  }

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

            <div id="notificationError" class="notification-error hidden"></div>

            <button id="onboardingEnableNotifications" class="btn-primary btn-large">
              🔔 Enable Notifications
            </button>
            <button id="onboardingSkip" class="btn-secondary">Skip for now</button>
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
    // Step 1 -> Step 2
    const next1 = document.getElementById('onboardingNext1');
    if (next1) {
      next1.addEventListener('click', () => this.goToStep(2));
    }

    // Enable Notifications
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.requestNotifications());
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
  }

  goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.add('hidden');
    });

    // Show target step
    const targetStep = document.getElementById(`onboardingStep${stepNumber}`);
    if (targetStep) {
      targetStep.classList.remove('hidden');
    }
  }

  async requestNotifications() {
    const errorDiv = document.getElementById('notificationError');
    const enableBtn = document.getElementById('onboardingEnableNotifications');
    
    try {
      enableBtn.disabled = true;
      enableBtn.textContent = '⏳ Requesting...';

      // Check if iOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        errorDiv.classList.remove('hidden');
        errorDiv.innerHTML = `
          ⚠️ <strong>iOS Not Supported</strong><br>
          <small>Safari on iOS doesn't support web push notifications. Please use Chrome on Android or Desktop browser.</small>
        `;
        enableBtn.disabled = false;
        enableBtn.textContent = '🔔 Enable Notifications';
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Get FCM token
        await notificationManager.getToken();
        
        // Go to success step
        this.goToStep(3);
        
      } else if (permission === 'denied') {
        errorDiv.classList.remove('hidden');
        errorDiv.innerHTML = this.getPermissionDeniedMessage();
        enableBtn.disabled = false;
        enableBtn.textContent = '🔔 Enable Notifications';
        
      } else {
        // User dismissed
        errorDiv.classList.remove('hidden');
        errorDiv.innerHTML = '⚠️ You dismissed the permission request. Please try again or skip.';
        enableBtn.disabled = false;
        enableBtn.textContent = '🔔 Try Again';
      }

    } catch (error) {
      console.error('Error requesting notifications:', error);
      errorDiv.classList.remove('hidden');
      errorDiv.innerHTML = `❌ Error: ${error.message}`;
      enableBtn.disabled = false;
      enableBtn.textContent = '🔔 Enable Notifications';
    }
  }

  getPermissionDeniedMessage() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      return `
        ❌ <strong>Permission Blocked</strong><br>
        <small>To enable notifications:</small><br>
        <ol style="margin: 0.5rem 0 0 1rem; text-align: left; font-size: 0.85rem;">
          <li>Tap ⋮ (menu) → Settings</li>
          <li>Site settings → Notifications</li>
          <li>Find this site → Allow</li>
          <li>Reload the app</li>
        </ol>
      `;
    } else {
      return `
        ❌ <strong>Permission Blocked</strong><br>
        <small>Click the 🔒 lock icon in address bar → Notifications → Allow</small>
      `;
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
      // Remove after animation
      setTimeout(() => {
        modal.remove();
      }, 300);
    }

    console.log('✅ Onboarding completed');
  }

  // Reset onboarding (for testing)
  reset() {
    localStorage.removeItem('onboarding_completed');
    this.hasCompletedOnboarding = false;
    console.log('🔄 Onboarding reset');
  }
}

// Create global instance
const onboardingManager = new OnboardingManager();
