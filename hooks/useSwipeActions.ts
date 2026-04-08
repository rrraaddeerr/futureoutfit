import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore, SwipeAction } from '@/stores/useAppStore';
import { addAssetToAlbum, removeAssetFromAlbum } from '@/utils/mediaLibrary';

export function useSwipeActions() {
  const {
    folders,
    pushAction,
    popAction,
    addPendingDelete,
    removePendingDelete,
    incrementStat,
    decrementStat,
    setLastUsedFolder,
  } = useAppStore();

  const handleDelete = useCallback(
    (assetId: string, assetUri: string) => {
      // Don't delete immediately - queue for batch deletion at end of session
      addPendingDelete(assetId, assetUri);
      pushAction({
        type: 'delete',
        assetId,
        assetUri,
        timestamp: Date.now(),
      });
      incrementStat('deleted');
    },
    [addPendingDelete, pushAction, incrementStat]
  );

  const handleKeep = useCallback(
    (assetId: string, assetUri: string) => {
      pushAction({
        type: 'keep',
        assetId,
        assetUri,
        timestamp: Date.now(),
      });
      incrementStat('kept');
    },
    [pushAction, incrementStat]
  );

  const handleSort = useCallback(
    async (assetId: string, assetUri: string, folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      setLastUsedFolder(folderId);

      const success = await addAssetToAlbum(assetId, folder.albumName);
      if (success) {
        pushAction({
          type: 'sort',
          assetId,
          assetUri,
          folderId,
          folderAlbumName: folder.albumName,
          timestamp: Date.now(),
        });
        incrementStat('sorted');
      } else {
        // If failed, give error haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [folders, pushAction, incrementStat, setLastUsedFolder]
  );

  const handleUndo = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    restoredAsset?: { id: string; uri: string };
  }> => {
    const action = popAction();
    if (!action) {
      return { success: false, message: 'Nothing to undo' };
    }

    switch (action.type) {
      case 'delete':
        // Remove from pending deletes (hasn't been actually deleted yet)
        removePendingDelete(action.assetId);
        decrementStat('deleted');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return {
          success: true,
          message: 'Photo restored',
          restoredAsset: { id: action.assetId, uri: action.assetUri },
        };

      case 'keep':
        decrementStat('kept');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return {
          success: true,
          message: 'Photo brought back',
          restoredAsset: { id: action.assetId, uri: action.assetUri },
        };

      case 'sort':
        if (action.folderAlbumName) {
          await removeAssetFromAlbum(action.assetId, action.folderAlbumName);
        }
        decrementStat('sorted');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const folder = folders.find((f) => f.id === action.folderId);
        return {
          success: true,
          message: `Removed from ${folder?.name || 'folder'}`,
          restoredAsset: { id: action.assetId, uri: action.assetUri },
        };

      default:
        return { success: false, message: 'Unknown action' };
    }
  }, [popAction, removePendingDelete, decrementStat, folders]);

  return {
    handleDelete,
    handleKeep,
    handleSort,
    handleUndo,
  };
}
