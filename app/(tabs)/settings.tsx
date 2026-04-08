import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as MediaLibrary from 'expo-media-library';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { deleteAssets } from '@/utils/mediaLibrary';
import { DEFAULT_FOLDERS } from '@/constants/folders';

export default function SettingsScreen() {
  const {
    photoSource,
    sourceAlbumId,
    setPhotoSource,
    sessionGoal,
    setSessionGoal,
    pendingDeletes,
    clearPendingDeletes,
    resetSession,
    sessionStats,
    folders,
  } = useAppStore();

  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);

  useEffect(() => {
    MediaLibrary.getAlbumsAsync().then(setAlbums);
  }, []);

  const handleFinishSession = async () => {
    if (pendingDeletes.length === 0) {
      Alert.alert('No Pending Deletes', 'There are no photos queued for deletion.');
      return;
    }

    Alert.alert(
      'Finish Session',
      `This will permanently delete ${pendingDeletes.length} photo${pendingDeletes.length !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete ${pendingDeletes.length}`,
          style: 'destructive',
          onPress: async () => {
            const ids = pendingDeletes.map((d) => d.assetId);
            await deleteAssets(ids);
            clearPendingDeletes();
            resetSession();
          },
        },
      ]
    );
  };

  const handleResetFolders = () => {
    Alert.alert(
      'Reset Folders',
      'This will restore the default folders. Custom folders will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            useAppStore.setState({ folders: DEFAULT_FOLDERS });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Photo Source */}
        <Text style={styles.sectionTitle}>PHOTO SOURCE</Text>
        <View style={styles.section}>
          <Pressable
            style={[styles.option, photoSource === 'all' && styles.optionActive]}
            onPress={() => setPhotoSource('all')}
          >
            <FontAwesome
              name="photo"
              size={16}
              color={photoSource === 'all' ? Colors.tint : Colors.textSecondary}
            />
            <Text style={[styles.optionText, photoSource === 'all' && styles.optionTextActive]}>
              All Photos
            </Text>
            {photoSource === 'all' && (
              <FontAwesome name="check" size={14} color={Colors.tint} style={styles.checkIcon} />
            )}
          </Pressable>

          {albums.slice(0, 10).map((album) => (
            <Pressable
              key={album.id}
              style={[styles.option, sourceAlbumId === album.id && styles.optionActive]}
              onPress={() => setPhotoSource('album', album.id)}
            >
              <FontAwesome
                name="folder"
                size={16}
                color={sourceAlbumId === album.id ? Colors.tint : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.optionText,
                  sourceAlbumId === album.id && styles.optionTextActive,
                ]}
              >
                {album.title} ({album.assetCount})
              </Text>
              {sourceAlbumId === album.id && (
                <FontAwesome name="check" size={14} color={Colors.tint} style={styles.checkIcon} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Session Goal */}
        <Text style={styles.sectionTitle}>SESSION GOAL</Text>
        <View style={styles.section}>
          <Text style={styles.goalDescription}>
            Set a target for each purge session. Great for chipping away at a big backlog.
          </Text>
          <View style={styles.goalRow}>
            {[0, 50, 100, 200, 500].map((goal) => (
              <Pressable
                key={goal}
                style={[styles.goalChip, sessionGoal === goal && { backgroundColor: Colors.tint, borderColor: Colors.tint }]}
                onPress={() => setSessionGoal(goal)}
              >
                <Text style={[styles.goalChipText, sessionGoal === goal && { color: '#fff' }]}>
                  {goal === 0 ? 'No limit' : `${goal}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Session */}
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.delete }]}>{sessionStats.deleted}</Text>
              <Text style={styles.statLabel}>Deleted</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.keep }]}>{sessionStats.kept}</Text>
              <Text style={styles.statLabel}>Kept</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.sort }]}>{sessionStats.sorted}</Text>
              <Text style={styles.statLabel}>Sorted</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.text }]}>{sessionStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.7 }]}
            onPress={handleFinishSession}
          >
            <FontAwesome name="trash" size={14} color={Colors.delete} />
            <Text style={[styles.dangerText, { color: Colors.delete }]}>
              Execute Pending Deletes ({pendingDeletes.length})
            </Text>
          </Pressable>
        </View>

        {/* Manage */}
        <Text style={styles.sectionTitle}>MANAGE</Text>
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
            onPress={handleResetFolders}
          >
            <FontAwesome name="refresh" size={16} color={Colors.textSecondary} />
            <Text style={styles.optionText}>Reset Folders to Default</Text>
          </Pressable>
          <View style={styles.option}>
            <FontAwesome name="info-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.optionText}>{folders.length} folders configured</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.tint + '11',
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: 15,
    flex: 1,
  },
  optionTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: 0,
  },
  goalChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  goalChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
