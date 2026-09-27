/**
 * Tiện ích nhận diện thiết bị & định danh phiên duy nhất cho người dùng
 */

const DEVICE_ID_KEY = 'tku_device_id';

/**
 * Lấy hoặc khởi tạo Device ID ngẫu nhiên lưu tại LocalStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = `dev_${crypto.randomUUID()}`;
    } else {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Phân tích userAgent để tạo tên thiết bị thân thiện (Ví dụ: Chrome trên Windows 11)
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Thiết bị không xác định';
  }

  const userAgent = navigator.userAgent;

  // 1. Nhận diện hệ điều hành
  let os = 'Thiết bị khác';
  if (/Windows NT 10.0/i.test(userAgent)) {
    os = 'Windows 10/11';
  } else if (/Windows NT 6.3/i.test(userAgent)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6.1/i.test(userAgent)) {
    os = 'Windows 7';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    os = 'macOS';
  } else if (/iPhone/i.test(userAgent)) {
    os = 'iPhone';
  } else if (/iPad/i.test(userAgent)) {
    os = 'iPad';
  } else if (/Android/i.test(userAgent)) {
    os = 'Android';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
  }

  // 2. Nhận diện trình duyệt
  let browser = 'Trình duyệt Web';
  if (/Edg\//i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(userAgent)) {
    browser = 'Mozilla Firefox';
  } else if (/OPR\//i.test(userAgent) || /Opera\//i.test(userAgent)) {
    browser = 'Opera';
  }

  return `${browser} (${os})`;
}
