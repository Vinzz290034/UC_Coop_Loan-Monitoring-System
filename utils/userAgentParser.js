/**
 * Utility function to parse user agent strings and extract client details
 * (Device type, Browser name/version, Operating System)
 */
export function parseUserAgent(userAgentString = '') {
  const ua = userAgentString || '';

  // 1. Device Type Detection
  let deviceType = 'Desktop';
  if (/mobile/i.test(ua) && !/ipad|tablet/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/tv|smarttv|googletv|appletv/i.test(ua)) {
    deviceType = 'Smart TV';
  }

  // 2. Operating System Detection
  let operatingSystem = 'Unknown OS';
  if (/windows nt 10\.0/i.test(ua)) operatingSystem = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) operatingSystem = 'Windows 8.1';
  else if (/windows nt 6\.2/i.test(ua)) operatingSystem = 'Windows 8';
  else if (/windows nt 6\.1/i.test(ua)) operatingSystem = 'Windows 7';
  else if (/windows/i.test(ua)) operatingSystem = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = 'iOS';
  else if (/mac os x/i.test(ua)) operatingSystem = 'macOS';
  else if (/android/i.test(ua)) operatingSystem = 'Android';
  else if (/linux/i.test(ua)) operatingSystem = 'Linux';
  else if (/cros/i.test(ua)) operatingSystem = 'ChromeOS';

  // 3. Browser Detection
  let browser = 'Unknown Browser';
  if (/edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/edg\/([0-9.]+)/i);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/opr\/([0-9.]+)|opera\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/(?:opr|opera)\/([0-9.]+)/i);
    browser = `Opera ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/chrome\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/chrome\/([0-9.]+)/i);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/firefox\/([0-9.]+)/i);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/version\/([0-9.]+).*safari/i.test(ua)) {
    const match = ua.match(/version\/([0-9.]+)/i);
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/safari\/([0-9.]+)/i.test(ua)) {
    browser = 'Safari';
  } else if (/msie|trident/i.test(ua)) {
    browser = 'Internet Explorer';
  }

  return {
    deviceType,
    browser,
    operatingSystem,
  };
}

/**
 * Extract clean client IP address from express request object
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}
