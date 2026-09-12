// src/utils/downloadNotification.js
//
// Shared "download complete" system notification for all PDF downloads
// in the app (Carbon Credit report, SoiLENZ Advisory report, etc).
// Tapping the notification re-opens the file's share/open sheet.

import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import Share from 'react-native-share';

const CHANNEL_ID = 'downloads';

let channelReady = null;

async function ensureChannel() {
  if (Platform.OS !== 'android') return null;
  if (!channelReady) {
    channelReady = notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Downloads',
      importance: AndroidImportance.DEFAULT,
    });
  }
  return channelReady;
}

async function openDownloadedFile(data) {
  if (!data?.filePath) return;
  try {
    await Share.open({
      url: `file://${data.filePath}`,
      type: data.mimeType || 'application/pdf',
    });
  } catch (e) {
    // User dismissing the share sheet isn't an error.
  }
}

export async function notifyPdfDownloaded({ title, filePath }) {
  try {
    await notifee.requestPermission();
    const channelId = await ensureChannel();

    await notifee.displayNotification({
      title: 'Download complete',
      body: `${title} saved to Downloads`,
      android: {
        channelId: channelId ?? undefined,
        pressAction: { id: 'open-pdf' },
      },
      data: { filePath, mimeType: 'application/pdf' },
    });
  } catch (e) {
    // Notifications are a nice-to-have; never let this break the download flow.
  }
}

notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS) {
    openDownloadedFile(detail.notification?.data);
  }
});

export async function handleBackgroundNotificationEvent({ type, detail }) {
  if (type === EventType.PRESS) {
    await openDownloadedFile(detail.notification?.data);
  }
}
