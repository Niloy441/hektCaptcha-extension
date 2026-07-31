// ============================================
// hektCaptcha Solver - Background Service Worker
// ============================================

const GITHUB_OWNER = "Niloy441";  // তোমার GitHub username
const GITHUB_REPO = "hektCaptcha-extension";  // তোমার repo name
const UPDATE_CHECK_INTERVAL_MINUTES = 60; // প্রতি ঘন্টায় চেক

// --- Auto-Update System ---
async function checkForUpdate(manual = false) {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': `hektCaptcha/${currentVersion}`
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.log('[hektCaptcha] GitHub API rate limit hit. Will retry later.');
      } else {
        console.error('[hektCaptcha] Update check failed:', response.status);
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, '');

    console.log(`[hektCaptcha] Current: ${currentVersion}, Latest: ${latestVersion}`);

    if (isNewerVersion(latestVersion, currentVersion)) {
      // নতুন ভার্সন পাওয়া গেছে!
      const stored = await chrome.storage.local.get('dismissedVersion');
      if (!manual && stored.dismissedVersion === latestVersion) {
        return { success: true, hasUpdate: false, message: 'Update dismissed' };
      }

      // Notification দেখাও
      await chrome.notifications.create('hektCaptcha-update', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🚀 hektCaptcha Update Available!',
        message: `Version ${latestVersion} is now available. Click to download.`,
        buttons: [
          { title: '⬇️ Download Update' },
          { title: '❌ Dismiss' }
        ],
        priority: 2,
        requireInteraction: true
      });

      // Store update info
      await chrome.storage.local.set({
        latestVersion: latestVersion,
        releaseUrl: release.html_url,
        releaseNotes: release.body || '',
        publishedAt: release.published_at
      });

      // Badge দেখাও
      await chrome.action.setBadgeText({ text: 'NEW' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

      return { success: true, hasUpdate: true, version: latestVersion, url: release.html_url };
    } else {
      // No update
      await chrome.action.setBadgeText({ text: '' });
      return { success: true, hasUpdate: false, message: 'You are up to date!' };
    }
  } catch (error) {
    console.error('[hektCaptcha] Update check error:', error);
    return { success: false, error: error.message };
  }
}

// ভার্সন কম্পেয়ার করার ফাংশন
function isNewerVersion(latest, current) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

// --- Notification Button Handler ---
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId !== 'hektCaptcha-update') return;

  const stored = await chrome.storage.local.get(['latestVersion', 'releaseUrl']);

  if (buttonIndex === 0) {
    // Download button
    if (stored.releaseUrl) {
      chrome.tabs.create({ url: stored.releaseUrl });
    }
  } else if (buttonIndex === 1) {
    // Dismiss button
    await chrome.storage.local.set({ dismissedVersion: stored.latestVersion });
    await chrome.notifications.clear(notificationId);
    await chrome.action.setBadgeText({ text: '' });
  }
});

// Notification click handler (body click)
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === 'hektCaptcha-update') {
    const stored = await chrome.storage.local.get('releaseUrl');
    if (stored.releaseUrl) {
      chrome.tabs.create({ url: stored.releaseUrl });
    }
  }
});

// --- Alarms Setup ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hektCaptcha-update-check') {
    checkForUpdate(false);
  }
});

// --- Install/Startup ---
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[hektCaptcha] Extension installed/updated:', details.reason);

  // Default settings
  await chrome.storage.sync.set({
    autoSolve: true,
    autoSubmit: false,
    debugMode: false,
    customCaptchaSelector: ''
  });

  // First update check after 5 minutes
  chrome.alarms.create('hektCaptcha-update-check', {
    delayInMinutes: 5,
    periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES
  });

  // Immediate check
  checkForUpdate(false);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[hektCaptcha] Extension started');
  checkForUpdate(false);
});

// --- Message Handler (from popup/content) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_UPDATE') {
    checkForUpdate(true).then(result => {
      sendResponse(result);
    });
    return true; // Async response
  }

  if (message.type === 'GET_UPDATE_INFO') {
    chrome.storage.local.get(['latestVersion', 'releaseUrl', 'releaseNotes', 'publishedAt'])
      .then(data => sendResponse(data));
    return true;
  }

  if (message.type === 'DISMISS_UPDATE') {
    chrome.storage.local.set({ dismissedVersion: message.version }).then(() => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log('[hektCaptcha] Background service worker loaded');
