{
  "manifest_version": 3,
  "name": "hektCaptcha Solver",
  "version": "1.0.0",
  "description": "Automatically solve hCaptcha using AI. With lifetime auto-update.",
  "permissions": [
    "activeTab",
    "storage",
    "alarms",
    "notifications",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end",
      "all_frames": true
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["*"],
      "matches": ["<all_urls>"]
    }
  ]
}
