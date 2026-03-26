import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export const initOneSignal = async (userId?: string) => {
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] App ID is missing. Push notifications will not be initialized.');
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    });
    console.log('[OneSignal] SDK initialized successfully.');

    if (userId) {
      // Link the Supabase User ID to OneSignal external id
      await OneSignal.login(userId);
      console.log('[OneSignal] User logged in with External ID:', userId);
    }
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
  }
};

export const requestNotificationPermission = async (): Promise<'granted' | 'denied' | 'default' | 'unsupported'> => {
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] App ID is missing.');
    return 'unsupported';
  }

  try {
    // Request the native browser/OS permission prompt via OneSignal
    await OneSignal.Notifications.requestPermission();
    const permission = OneSignal.Notifications.permission;
    console.log('[OneSignal] Permission result:', permission);
    return permission ? 'granted' : 'denied';
  } catch (error) {
    console.error('[OneSignal] Permission request error:', error);
    return 'denied';
  }
};

export const getNotificationStatus = (): { isSupported: boolean; permission: boolean; isSubscribed: boolean } => {
  if (!ONESIGNAL_APP_ID) {
    return { isSupported: false, permission: false, isSubscribed: false };
  }

  try {
    const permission = OneSignal.Notifications.permission;
    // User.PushSubscription can tell us if they are actually subscribed
    const isSubscribed = OneSignal.User?.PushSubscription?.optedIn ?? false;
    return { isSupported: true, permission, isSubscribed };
  } catch {
    return { isSupported: true, permission: false, isSubscribed: false };
  }
};

export const logoutOneSignal = () => {
  try {
    OneSignal.logout();
    console.log('[OneSignal] User logged out.');
  } catch (error) {
    console.error('[OneSignal] Logout error:', error);
  }
};
