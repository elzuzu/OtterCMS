import { useState, useCallback } from 'react';

export function useSync() {
  const [syncState, setSyncState] = useState({
    lastSync: null,
    pendingChanges: false,
    error: null
  });

  const checkSyncStatus = useCallback(async () => {
    try {
      const status = await window.api.getSyncStatus();
      setSyncState({
        lastSync: status.last_sync ? new Date(status.last_sync) : null,
        pendingChanges: status.pending_changes,
        error: status.error || null
      });
      return status;
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const performSync = useCallback(async () => {
    try {
      const result = await window.api.performSync();
      if (result.success) {
        setSyncState(prev => ({
          ...prev,
          lastSync: new Date(),
          pendingChanges: false,
          error: null
        }));
      } else {
        setSyncState(prev => ({
          ...prev,
          error: result.error || 'Erreur inconnue lors de la synchronisation'
        }));
      }
      return result;
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, []);

  return {
    syncState,
    checkSyncStatus,
    performSync
  };
} 