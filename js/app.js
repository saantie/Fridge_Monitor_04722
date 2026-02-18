// State
let currentDevice = null;
let tempChart = null;
let deferredPrompt = null;

// DOM Elements
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');
const devicesList = document.getElementById('devicesList');
const deviceDetail = document.getElementById('deviceDetail');
const refreshBtn = document.getElementById('refreshBtn');
const backBtn = document.getElementById('backBtn');
const editNameBtn = document.getElementById('editNameBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const editModal = document.getElementById('editModal');
const exportModal = document.getElementById('exportModal');
const notificationModal = document.getElementById('notificationModal');
const cancelBtn = document.getElementById('cancelBtn');
const saveNameBtn = document.getElementById('saveNameBtn');
const newNameInput = document.getElementById('newNameInput');
const notificationBtn = document.getElementById('notificationBtn');
const notificationToggle = document.getElementById('notificationToggle');
const closeNotificationBtn = document.getElementById('closeNotificationBtn');
const cancelExportBtn = document.getElementById('cancelExportBtn');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const dismissBtn = document.getElementById('dismissBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerServiceWorker();
  setupInstallPrompt();
  initNotifications();
  populateYearSelect();
});

async function initApp() {
  await loadDevices();
  
  refreshBtn.addEventListener('click', () => {
    refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => refreshBtn.style.transform = '', 300);
    loadDevices();
  });
  
  backBtn.addEventListener('click', showDevicesList);
  editNameBtn.addEventListener('click', showEditModal);
  exportPdfBtn.addEventListener('click', showExportModal);
  notificationBtn.addEventListener('click', showNotificationModal);
  
  cancelBtn.addEventListener('click', hideEditModal);
  saveNameBtn.addEventListener('click', saveDeviceName);
  
  cancelExportBtn.addEventListener('click', hideExportModal);
  generatePdfBtn.addEventListener('click', generatePDF);
  
  closeNotificationBtn.addEventListener('click', hideNotificationModal);
  notificationToggle.addEventListener('change', toggleNotifications);
  
  // Time range buttons
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const hours = parseInt(e.target.dataset.hours);
      loadDeviceData(currentDevice, hours);
    });
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.error('Service Worker registration failed:', err));
  }
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.classList.remove('hidden');
  });
  
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installPrompt.classList.add('hidden');
    }
  });
  
  dismissBtn.addEventListener('click', () => {
    installPrompt.classList.add('hidden');
  });
}

async function initNotifications() {
  const initialized = await notificationManager.init();
  if (initialized) {
    notificationManager.setupForegroundNotifications();
  }
}

async function toggleNotifications(e) {
  if (e.target.checked) {
    const success = await notificationManager.enable();
    if (!success) {
      e.target.checked = false;
    }
  } else {
    await notificationManager.disable();
  }
}

function populateYearSelect() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // สร้างตัวเลือกปี (ปีปัจจุบัน และ 2 ปีย้อนหลัง)
  for (let year = currentYear; year >= currentYear - 2; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year + 543; // แสดงเป็น พ.ศ.
    yearSelect.appendChild(option);
  }
  
  // ตั้งค่าเดือนและปีปัจจุบัน
  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;
}

async function loadDevices() {
  try {
    showLoading();
    const response = await API.getLatestStatus();
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    displayDevices(response.devices);
    hideLoading();
  } catch (error) {
    showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
  }
}

function displayDevices(devices) {
  devicesList.innerHTML = '';
  
  devices.forEach(device => {
    const card = createDeviceCard(device);
    devicesList.appendChild(card);
  });
}

function createDeviceCard(device) {
  const card = document.createElement('div');
  card.className = 'device-card';
  
  const latest = device.latest_data;
  let chillerStatus = 'normal';
  let freezerStatus = 'normal';
  let overallStatus = 'normal';
  
  if (latest) {
    chillerStatus = getAlertLevel(latest.chiller, 'chiller');
    freezerStatus = getAlertLevel(latest.freezer, 'freezer');
    overallStatus = chillerStatus === 'critical' || freezerStatus === 'critical' ? 'critical' :
                    chillerStatus === 'warning' || freezerStatus === 'warning' ? 'warning' : 'normal';
  }
  
  card.innerHTML = `
    <div class="device-card-header">
      <h3>${device.device_name}</h3>
      <span class="device-status ${overallStatus}"></span>
    </div>
    <div class="device-temps">
      <div class="device-temp">
        <div class="device-temp-label">Chiller</div>
        <div class="device-temp-value ${chillerStatus}">
          ${latest ? latest.chiller.toFixed(1) : '--'}°C
        </div>
      </div>
      <div class="device-temp">
        <div class="device-temp-label">Freezer</div>
        <div class="device-temp-value ${freezerStatus}">
          ${latest ? latest.freezer.toFixed(1) : '--'}°C
        </div>
      </div>
    </div>
    ${device.location !== '-' ? `<div class="device-location">📍 ${device.location}</div>` : ''}
    <div class="device-last-update">
      🕐 ${latest ? formatTimestamp(latest.timestamp) : 'ไม่มีข้อมูล'}
    </div>
  `;
  
  card.addEventListener('click', () => showDeviceDetail(device));
  
  return card;
}

async function showDeviceDetail(device) {
  currentDevice = device;
  devicesList.classList.add('hidden');
  deviceDetail.classList.remove('hidden');
  
  document.getElementById('deviceTitle').textContent = device.device_name;
  
  if (device.latest_data) {
    updateCurrentTemp(device.latest_data);
  }
  
  await loadDeviceData(device, 24);
}

async function loadDeviceData(device, hours) {
  try {
    showLoading();
    const response = await API.getDeviceData(device.device_name, hours);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (!tempChart) {
      tempChart = new TempChart('tempChart');
    }
    
    tempChart.create(response.data);
    hideLoading();
  } catch (error) {
    showError('ไม่สามารถโหลดข้อมูลกราฟได้: ' + error.message);
  }
}

function updateCurrentTemp(data) {
  const chillerTemp = document.getElementById('chillerTemp');
  const freezerTemp = document.getElementById('freezerTemp');
  const chillerStatus = document.getElementById('chillerStatus');
  const freezerStatus = document.getElementById('freezerStatus');
  const lastUpdate = document.getElementById('lastUpdate');
  
  chillerTemp.textContent = data.chiller.toFixed(1);
  freezerTemp.textContent = data.freezer.toFixed(1);
  
  const chillerLevel = getAlertLevel(data.chiller, 'chiller');
  const freezerLevel = getAlertLevel(data.freezer, 'freezer');
  
  chillerStatus.className = `temp-status ${chillerLevel}`;
  chillerStatus.textContent = getStatusText(chillerLevel);
  
  freezerStatus.className = `temp-status ${freezerLevel}`;
  freezerStatus.textContent = getStatusText(freezerLevel);
  
  lastUpdate.textContent = formatTimestamp(data.timestamp);
}

function getAlertLevel(temp, type) {
  if (type === 'chiller') {
    if (temp < -20 || temp > 15) return 'critical';
    if ((temp >= -20 && temp <= 2) || (temp >= 8 && temp <= 15)) return 'warning';
    return 'normal';
  } else {
    if (temp < -30 || temp > 0) return 'critical';
    if ((temp >= -30 && temp <= -20) || (temp >= -10 && temp <= 0)) return 'warning';
    return 'normal';
  }
}

function getStatusText(level) {
  switch (level) {
    case 'normal': return '✓ ปกติ';
    case 'warning': return '⚠ เตือน';
    case 'critical': return '🚨 วิกฤต';
    default: return '';
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showDevicesList() {
  deviceDetail.classList.add('hidden');
  devicesList.classList.remove('hidden');
  if (tempChart) {
    tempChart.destroy();
    tempChart = null;
  }
  loadDevices();
}

function showEditModal() {
  newNameInput.value = currentDevice.device_name;
  editModal.classList.remove('hidden');
  newNameInput.focus();
}

function hideEditModal() {
  editModal.classList.add('hidden');
}

function showExportModal() {
  exportModal.classList.remove('hidden');
}

function hideExportModal() {
  exportModal.classList.add('hidden');
}

function showNotificationModal() {
  notificationModal.classList.remove('hidden');
}

function hideNotificationModal() {
  notificationModal.classList.add('hidden');
}

async function saveDeviceName() {
  const newName = newNameInput.value.trim();
  
  if (!newName) {
    alert('กรุณาใส่ชื่อเครื่อง');
    return;
  }
  
  try {
    showLoading();
    const response = await API.updateDeviceName(currentDevice.device_id, newName);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    currentDevice.device_name = newName;
    document.getElementById('deviceTitle').textContent = newName;
    hideEditModal();
    hideLoading();
    
    alert('✅ บันทึกชื่อเครื่องสำเร็จ');
  } catch (error) {
    showError('ไม่สามารถบันทึกชื่อได้: ' + error.message);
  }
}

async function generatePDF() {
  const year = parseInt(yearSelect.value);
  const month = parseInt(monthSelect.value);
  
  hideExportModal();
  
  await pdfExporter.generateMonthlyPDF(currentDevice, year, month);
}

function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showError(message) {
  errorText.textContent = message;
  errorMsg.classList.remove('hidden');
  hideLoading();
  
  setTimeout(() => {
    errorMsg.classList.add('hidden');
  }, 5000);
}
