import { useState, useCallback, useEffect, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { getPhotos, requestPermissions } from '@/utils/mediaLibrary';
import { useAppStore } from '@/stores/useAppStore';

const PAGE_SIZE = 50;
const PREFETCH_THRESHOLD = 10; // Load more when this many cards remain

export function usePhotos() {
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);
  const { photoSource, sourceAlbumId, pendingDeletes } = useAppStore();

  const loadPhotos = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (reset) {
      cursorRef.current = undefined;
      setPhotos([]);
    }

    try {
      setLoading(true);
      const albumId = photoSource === 'album' ? sourceAlbumId : null;
      const result = await getPhotos(
        reset ? undefined : cursorRef.current,
        albumId,
        PAGE_SIZE
      );

      cursorRef.current = result.endCursor;
      setHasMore(result.hasNextPage);

      setPhotos((prev) => {
        if (reset) return result.assets;
        // Deduplicate
        const existingIds = new Set(prev.map((a) => a.id));
        const newAssets = result.assets.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newAssets];
      });
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [photoSource, sourceAlbumId]);

  const initialize = useCallback(async () => {
    const granted = await requestPermissions();
    setHasPermission(granted);
    if (granted) {
      await loadPhotos(true);
    }
  }, [loadPhotos]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Filter out pending deletes from the photo list
  const pendingDeleteIds = new Set(pendingDeletes.map((d) => d.assetId));
  const availablePhotos = photos.filter((p) => !pendingDeleteIds.has(p.id));

  // Prefetch more when running low
  const checkPrefetch = useCallback(() => {
    if (availablePhotos.length < PREFETCH_THRESHOLD && hasMore && !loadingRef.current) {
      loadPhotos();
    }
  }, [availablePhotos.length, hasMore, loadPhotos]);

  const removePhoto = useCallback((assetId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== assetId));
  }, []);

  const restorePhoto = useCallback((asset: { id: string; uri: string }) => {
    // Re-fetch the asset to get full info
    MediaLibrary.getAssetInfoAsync(asset.id).then((fullAsset) => {
      if (fullAsset) {
        setPhotos((prev) => [fullAsset, ...prev]);
      }
    });
  }, []);

  return {
    photos: availablePhotos,
    loading,
    hasPermission,
    hasMore,
    loadMore: loadPhotos,
    checkPrefetch,
    removePhoto,
    restorePhoto,
    refresh: () => loadPhotos(true),
  };
}
