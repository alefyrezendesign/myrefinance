import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export const initOneSignal = async (userId?: string) => {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID is missing. Push notifications will not be initialized.');
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    });

    if (userId) {
      // Link the Supabase User ID to OneSignal external id
      await OneSignal.login(userId);
      console.log('OneSignal: User logged in with ID', userId);
    }
  } catch (error) {
    console.error('OneSignal initialization error:', error);
  }
};

export const logoutOneSignal = () => {
    OneSignal.logout();
};
