import React, { useState, useEffect } from 'react';
import PwaService from '../services/PwaService';

/**
 * PwaInstallPrompt — shows a banner prompting users to install TINCLO as a PWA.
 * Also shows update-available notification.
 */
const PwaInstallPrompt = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate]   = useState(false);

  useEffect(() => {
    // Capture install prompt
    PwaService.captureInstallPrompt();
    PwaService.onInstallAvailable = () => {
      if (!PwaService.isInstalled()) setShowInstall(true);
    };
    PwaService.onUpdateAvailable = () => setShowUpdate(true);

    // Register SW
    PwaService.register();
  }, []);

  const handleInstall = async () => {
    const accepted = await PwaService.promptInstall();
    setShowInstall(false);
    if (accepted) console.log('🎉 PWA installed');
  };

  const handleUpdate = () => {
    PwaService.applyUpdate();
    setShowUpdate(false);
  };

  if (!showInstall && !showUpdate) return null;

  return (
    <>
      {/* Install banner */}
      {showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-[800] md:left-auto md:right-6 md:bottom-6 md:w-[360px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-200 p-4 animate-[slideUp_0.3s_ease]">
          <div className="flex items-start gap-3">
            <div className="text-3xl">💼</div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-black text-gray-900">Install TINCLO</h3>
              <p className="m-0 mt-1 text-xs text-gray-500">Add to your home screen for quick access, offline support, and push notifications.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleInstall}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg border-none cursor-pointer hover:bg-indigo-700 transition-colors">
                  Install App
                </button>
                <button onClick={() => setShowInstall(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg border-none cursor-pointer hover:bg-gray-200 transition-colors">
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update banner */}
      {showUpdate && (
        <div className="fixed top-20 left-4 right-4 z-[800] md:left-auto md:right-6 md:w-[360px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-indigo-200 p-4 animate-[slideDown_0.3s_ease]">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔄</div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-black text-gray-900">Update Available</h3>
              <p className="m-0 mt-1 text-xs text-gray-500">A new version of TINCLO is available.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleUpdate}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg border-none cursor-pointer hover:bg-indigo-700 transition-colors">
                  Update Now
                </button>
                <button onClick={() => setShowUpdate(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg border-none cursor-pointer hover:bg-gray-200 transition-colors">
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaInstallPrompt;
