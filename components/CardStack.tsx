import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import SwipeCard, { SwipeDirection } from './SwipeCard';
import FolderPicker from './FolderPicker';
import UndoToast from './UndoToast';
import ActionFeedback from './ActionFeedback';
import { useSwipeActions } from '@/hooks/useSwipeActions';
import { usePhotos } from '@/hooks/usePhotos';
import { useAppStore } from '@/stores/useAppStore';
import { Colors, Spacing } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const VISIBLE_CARDS = 3;

type FeedbackState = {
  action: 'delete' | 'keep' | 'sort' | 'undo' | null;
  folderName?: string;
};

export default function CardStack() {
  const { photos, loading, hasPermission, hasMore, checkPrefetch, removePhoto, restorePhoto } = usePhotos();
  const { handleDelete, handleKeep, handleSort, handleUndo } = useSwipeActions();
  const folders = useAppStore((s) => s.folders);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pendingSortAsset, setPendingSortAsset] = useState<MediaLibrary.Asset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ action: null });

  const visiblePhotos = photos.slice(0, VISIBLE_CARDS);

  useEffect(() => {
    checkPrefetch();
  }, [photos.length, checkPrefetch]);

  const advanceCard = useCallback(() => {
    if (visiblePhotos.length > 0) {
      removePhoto(visiblePhotos[0].id);
    }
  }, [visiblePhotos, removePhoto]);

  const triggerFeedback = useCallback((action: FeedbackState['action'], folderName?: string) => {
    setFeedback({ action, folderName });
  }, []);

  const onSwipe = useCallback(
    (direction: SwipeDirection) => {
      const asset = visiblePhotos[0];
      if (!asset) return;

      switch (direction) {
        case 'left':
          handleDelete(asset.id, asset.uri);
          triggerFeedback('delete');
          advanceCard();
          break;
        case 'right':
          handleKeep(asset.id, asset.uri);
          triggerFeedback('keep');
          advanceCard();
          break;
        case 'up':
          setPendingSortAsset(asset);
          setShowFolderPicker(true);
          break;
        case 'down':
          handleUndo().then((result) => {
            if (result.success) {
              triggerFeedback('undo');
              setToastMessage(result.message);
              if (result.restoredAsset) {
                restorePhoto(result.restoredAsset);
              }
            } else {
              setToastMessage(result.message);
            }
          });
          break;
      }
    },
    [visiblePhotos, handleDelete, handleKeep, handleUndo, advanceCard, restorePhoto, triggerFeedback]
  );

  const onFolderSelect = useCallback(
    (folderId: string) => {
      if (pendingSortAsset) {
        const folder = folders.find((f) => f.id === folderId);
        handleSort(pendingSortAsset.id, pendingSortAsset.uri, folderId);
        triggerFeedback('sort', folder?.name);
        advanceCard();
      }
      setShowFolderPicker(false);
      setPendingSortAsset(null);
    },
    [pendingSortAsset, handleSort, advanceCard, folders, triggerFeedback]
  );

  const onFolderCancel = useCallback(() => {
    setShowFolderPicker(false);
    setPendingSortAsset(null);
  }, []);

  // Permission not granted
  if (hasPermission === false) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="lock" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Photo Access Required</Text>
        <Text style={styles.emptyText}>
          PhotoPurge needs access to your photo library to work. Please enable it in Settings.
        </Text>
      </View>
    );
  }

  // Loading
  if (loading && photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Loading photos...</Text>
      </View>
    );
  }

  // No photos left
  if (visiblePhotos.length === 0 && !hasMore) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="check-circle" size={48} color={Colors.keep} />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptyText}>
          No more photos to review. Nice work.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {visiblePhotos
          .slice(0, VISIBLE_CARDS)
          .reverse()
          .map((asset, reverseIdx) => {
            const index = VISIBLE_CARDS - 1 - reverseIdx;
            return (
              <SwipeCard
                key={asset.id}
                asset={asset}
                onSwipe={onSwipe}
                isTop={index === 0}
                index={index}
              />
            );
          })}
      </View>

      {/* Action feedback animations */}
      <ActionFeedback
        action={feedback.action}
        folderName={feedback.folderName}
        onComplete={() => setFeedback({ action: null })}
      />

      <FolderPicker
        visible={showFolderPicker}
        onSelect={onFolderSelect}
        onCancel={onFolderCancel}
      />

      <UndoToast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
