import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import PhotoGrid from '@/components/PhotoGrid';
import { Colors, Spacing } from '@/constants/theme';
import { getOrCreateAlbum, getAlbumAssets } from '@/utils/mediaLibrary';
import { useAppStore } from '@/stores/useAppStore';

export default function FolderDetailScreen() {
  const { id, name, albumName } = useLocalSearchParams<{
    id: string;
    name: string;
    albumName: string;
  }>();
  const folders = useAppStore((s) => s.folders);
  const folder = folders.find((f) => f.id === id);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbumPhotos();
  }, [albumName]);

  const loadAlbumPhotos = async () => {
    if (!albumName) return;
    setLoading(true);
    try {
      const album = await getOrCreateAlbum(albumName);
      if (album) {
        const result = await getAlbumAssets(album.id);
        setAssets(result.assets);
      }
    } catch (error) {
      console.error('Failed to load album photos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: name || 'Folder',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.header}>
          {folder && (
            <View style={[styles.iconBox, { backgroundColor: folder.color + '22' }]}>
              <FontAwesome name={folder.icon as any} size={24} color={folder.color} />
            </View>
          )}
          <Text style={styles.count}>
            {assets.length} photo{assets.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.albumLabel}>Album: {albumName}</Text>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : assets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="folder-open-o" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              No photos yet. Swipe up on photos to sort them here.
            </Text>
          </View>
        ) : (
          <ScrollView>
            <PhotoGrid assets={assets} />
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  albumLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
