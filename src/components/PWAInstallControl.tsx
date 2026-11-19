import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [copied, setCopied] = useState(false);

  const openGuide = () => {
    setActiveTab(isIOS ? 'ios' : 'android');
    setShowGuide(true);
  };

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    openGuide();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  // In header mode, suppress automatically once installed as standalone app
  if (isInstalled && variant === 'header') {
    return null;
  }

  return (
    <>
      {variant === 'card' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="w-4 h-4" />
              Installed in standalone app mode
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isInstallable
                    ? 'Install NeuroPredict App'
                    : isIOS
                    ? 'Install on iPhone / iPad'
                    : 'Get Mobile App (Android & iOS)'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied' : 'Copy Phone Link'}</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePrimaryClick}
          aria-label="Install NeuroPredict app on Android or iOS"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          {isInstallable ? (
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          )}
          <span className="hidden sm:inline">
            {isInstallable ? 'Install App' : isIOS ? 'Install on iOS' : 'Get App'}
          </span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {showGuide &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/pwa-192x192.png"
                    alt="NeuroPredict App Icon"
                    className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div>
                    <h3
                      id="pwa-install-title"
                      className="font-display text-base font-bold text-slate-900 dark:text-slate-50"
                    >
                      Install NeuroPredict
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add to your Android or iPhone Home Screen
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close installation guide"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Platform Switcher */}
              <div className="mt-5 grid grid-cols-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'android'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Android (Chrome)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'ios'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  iPhone / iPad (Safari)
                </button>
              </div>

              {activeTab === 'android' ? (
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {isInstallable ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setShowGuide(false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Now on Android</span>
                    </button>
                  ) : (
                    <ol className="space-y-3 text-xs leading-relaxed">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>
                          Open this NeuroPredict link in <strong>Google Chrome</strong> on your Android
                          phone{isAndroid ? '' : ' (copy the link below)'}.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span className="inline-flex flex-wrap items-center gap-1">
                          Tap the menu icon <MoreVertical className="w-3.5 h-3.5 inline" /> in the top
                          right corner of Chrome.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>
                          Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>, then
                          confirm <strong>Install</strong>.
                        </span>
                      </li>
                    </ol>
                  )}
                </div>
              ) : (
                <ol className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      Open this NeuroPredict link in <strong>Safari</strong> on your iPhone or iPad.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-blue-600 dark:text-blue-400" /> in
                      the Safari toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      Scroll down, tap <PlusSquare className="w-3.5 h-3.5 inline" />{' '}
                      <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                    </span>
                  </li>
                </ol>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'App URL Copied' : 'Copy App URL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Showing cached app shell</span>
    </div>
  );
};
