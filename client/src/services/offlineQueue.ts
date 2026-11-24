import { openDB, DBSchema } from 'idb';
import { LocationUpdatePayload } from '../types';
import { api } from './api';

interface FleetSyncDB extends DBSchema {
  gpsQueue: {
    key: number;
    value: LocationUpdatePayload & { id?: number };
    indexes: { 'by-timestamp': string };
  };
}

const DB_NAME = 'fleetsync_offline_db';
const DB_VERSION = 1;

export const initOfflineDB = async () => {
  return openDB<FleetSyncDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('gpsQueue')) {
        const store = db.createObjectStore('gpsQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });
};

/**
 * Queue location point to IndexedDB if network drops or socket fails
 */
export const queueLocationPoint = async (point: LocationUpdatePayload) => {
  try {
    const db = await initOfflineDB();
    await db.add('gpsQueue', point);
    console.log('📦 Queued offline GPS point to IndexedDB:', point.lat, point.lng);
  } catch (error) {
    console.error('Failed to queue offline point:', error);
  }
};

/**
 * Get count of pending offline points
 */
export const getQueuedPointsCount = async (): Promise<number> => {
  try {
    const db = await initOfflineDB();
    return await db.count('gpsQueue');
  } catch {
    return 0;
  }
};

/**
 * Sync all queued points to server via HTTP batch endpoint
 */
export const syncQueuedPoints = async (): Promise<number> => {
  try {
    const db = await initOfflineDB();
    const allPoints = await db.getAll('gpsQueue');

    if (allPoints.length === 0) return 0;

    console.log(`🚀 Syncing ${allPoints.length} queued GPS points to server...`);
    const response = await api.post('/tracking/batch', { points: allPoints });

    if (response.status === 200) {
      const tx = db.transaction('gpsQueue', 'readwrite');
      await tx.objectStore('gpsQueue').clear();
      await tx.done;
      console.log(`✅ Successfully synced and flushed ${allPoints.length} points.`);
      return allPoints.length;
    }
    return 0;
  } catch (error) {
    console.error('Error syncing queued offline points:', error);
    return 0;
  }
};
