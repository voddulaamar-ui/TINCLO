/**
 * PWA Service — Service Worker registration, push notifications, offline sync, install prompt.
 */

const PwaService = {
  swRegistration: null,
  deferredInstallPrompt: null,

  // ── Register Service Worker ────────────────────────────────────────────────
  async register() {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      console.log('✅ Service Worker registered');

      // Check for updates every 60s
      setInterval(() => reg.update(), 60000);

      // Listen for new SW waiting (update available)
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.onUpdateAvailable?.();
          }
        });
      });

      return reg;
    } catch (err) {
      console.warn('SW registration failed:', err);
      return null;
    }
  },

  // ── Skip waiting (apply update) ───────────────────────────────────────────
  applyUpdate() {
    if (this.swRegistration?.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },

  // ── Install prompt capture ─────────────────────────────────────────────────
  captureInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.onInstallAvailable?.();
    });
  },

  async promptInstall() {
    if (!this.deferredInstallPrompt) return false;
    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    return outcome === 'accepted';
  },

  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },

  // ── Push Notifications ─────────────────────────────────────────────────────
  async subscribeToPush() {
    if (!this.swRegistration) return null;
    if (!('PushManager' in window)) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;

      // In production, use your VAPID public key here
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BPlaceholderVAPIDPublicKey12345678901234567890', // replace with real key
      });

      return subscription;
    } catch (err) {
      console.warn('Push subscription failed:', err);
      return null;
    }
  },

  async unsubscribeFromPush() {
    if (!this.swRegistration) return;
    const subscription = await this.swRegistration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  },

  // ── Offline Detection ──────────────────────────────────────────────────────
  isOnline() {
    return navigator.onLine;
  },

  onOnlineStatusChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  },

  // ── Background Sync ────────────────────────────────────────────────────────
  async requestBackgroundSync(tag = 'sync-offline-actions') {
    if (!this.swRegistration) return;
    try {
      await this.swRegistration.sync.register(tag);
    } catch {
      // Background sync not supported — will retry on next online event
    }
  },

  // ── Queue offline action ───────────────────────────────────────────────────
  async queueOfflineAction(request) {
    try {
      const cache = await caches.open('tinclo-offline-queue');
      await cache.put(request, new Response('queued'));
      await this.requestBackgroundSync();
    } catch {}
  },

  // Callbacks (set by the app)
  onUpdateAvailable: null,
  onInstallAvailable: null,
};

export default PwaService;
