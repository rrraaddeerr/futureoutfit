import * as MediaLibrary from 'expo-media-library';

// Cache album references to avoid repeated lookups
const albumCache = new Map<string, MediaLibrary.Album>();

export async function requestPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPhotos(
  cursor?: string,
  albumId?: string | null,
  pageSize = 50
): Promise<{
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
}> {
  const options: MediaLibrary.AssetsOptions = {
    first: pageSize,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [MediaLibrary.SortBy.creationTime],
    ...(cursor ? { after: cursor } : {}),
    ...(albumId ? { album: albumId } : {}),
  };

  const result = await MediaLibrary.getAssetsAsync(options);
  return {
    assets: result.assets,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
  };
}

export async function getOrCreateAlbum(albumName: string): Promise<MediaLibrary.Album | null> {
  // Check cache first
  const cached = albumCache.get(albumName);
  if (cached) return cached;

  // Try to find existing album
  const existing = await MediaLibrary.getAlbumAsync(albumName);
  if (existing) {
    albumCache.set(albumName, existing);
    return existing;
  }

  // Album doesn't exist yet - will be created when first asset is added
  return null;
}

export async function addAssetToAlbum(
  assetId: string,
  albumName: string
): Promise<boolean> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    if (!asset) return false;

    let album = await getOrCreateAlbum(albumName);

    if (!album) {
      // Create album with this asset
      album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      if (album) {
        albumCache.set(albumName, album);
      }
      return !!album;
    }

    // Add to existing album
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    return true;
  } catch (error) {
    console.error('Failed to add asset to album:', error);
    return false;
  }
}

export async function removeAssetFromAlbum(
  assetId: string,
  albumName: string
): Promise<boolean> {
  try {
    const album = await getOrCreateAlbum(albumName);
    if (!album) return false;

    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    if (!asset) return false;

    await MediaLibrary.removeAssetsFromAlbumAsync([asset], album);
    return true;
  } catch (error) {
    console.error('Failed to remove asset from album:', error);
    return false;
  }
}

export async function deleteAssets(assetIds: string[]): Promise<boolean> {
  try {
    const result = await MediaLibrary.deleteAssetsAsync(assetIds);
    return result;
  } catch (error) {
    console.error('Failed to delete assets:', error);
    return false;
  }
}

export async function getAlbums(): Promise<MediaLibrary.Album[]> {
  return MediaLibrary.getAlbumsAsync();
}

export async function getAlbumAssets(
  albumId: string,
  cursor?: string,
  pageSize = 50
): Promise<{
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
}> {
  const result = await MediaLibrary.getAssetsAsync({
    first: pageSize,
    album: albumId,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [MediaLibrary.SortBy.creationTime],
    ...(cursor ? { after: cursor } : {}),
  });

  return {
    assets: result.assets,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
  };
}
