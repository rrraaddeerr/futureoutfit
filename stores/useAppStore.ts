import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_FOLDERS, FolderConfig, generateFolderId } from '@/constants/folders';
import * as MediaLibrary from 'expo-media-library';

export type SwipeAction = {
  type: 'delete' | 'keep' | 'sort';
  assetId: string;
  assetUri: string;
  folderId?: string;
  folderAlbumName?: string;
  timestamp: number;
};

export type SessionStats = {
  deleted: number;
  kept: number;
  sorted: number;
  total: number;
};

interface AppState {
  // Folders
  folders: FolderConfig[];
  addFolder: (name: string, icon: string, color: string) => void;
  updateFolder: (id: string, updates: Partial<Pick<FolderConfig, 'name' | 'icon' | 'color'>>) => void;
  removeFolder: (id: string) => void;
  reorderFolders: (folders: FolderConfig[]) => void;

  // Undo stack
  undoStack: SwipeAction[];
  pushAction: (action: SwipeAction) => void;
  popAction: () => SwipeAction | undefined;
  clearUndoStack: () => void;

  // Pending deletes (batched for end of session)
  pendingDeletes: { assetId: string; assetUri: string }[];
  addPendingDelete: (assetId: string, assetUri: string) => void;
  removePendingDelete: (assetId: string) => void;
  clearPendingDeletes: () => void;

  // Session stats
  sessionStats: SessionStats;
  incrementStat: (stat: 'deleted' | 'kept' | 'sorted') => void;
  decrementStat: (stat: 'deleted' | 'kept' | 'sorted') => void;
  resetSession: () => void;

  // Settings
  photoSource: 'all' | 'album';
  sourceAlbumId: string | null;
  setPhotoSource: (source: 'all' | 'album', albumId?: string | null) => void;

  // Last used folder (for quick access in picker)
  lastUsedFolderId: string | null;
  setLastUsedFolder: (id: string) => void;
}

const MAX_UNDO_STACK = 20;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Folders
      folders: DEFAULT_FOLDERS,
      addFolder: (name, icon, color) => {
        const id = generateFolderId();
        const albumName = `Ref: ${name}`;
        set((state) => ({
          folders: [...state.folders, { id, name, albumName, icon, color }],
        }));
      },
      updateFolder: (id, updates) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id
              ? {
                  ...f,
                  ...updates,
                  albumName: updates.name ? `Ref: ${updates.name}` : f.albumName,
                }
              : f
          ),
        }));
      },
      removeFolder: (id) => {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
        }));
      },
      reorderFolders: (folders) => set({ folders }),

      // Undo stack
      undoStack: [],
      pushAction: (action) => {
        set((state) => ({
          undoStack: [action, ...state.undoStack].slice(0, MAX_UNDO_STACK),
        }));
      },
      popAction: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return undefined;
        const [action, ...rest] = undoStack;
        set({ undoStack: rest });
        return action;
      },
      clearUndoStack: () => set({ undoStack: [] }),

      // Pending deletes
      pendingDeletes: [],
      addPendingDelete: (assetId, assetUri) => {
        set((state) => ({
          pendingDeletes: [...state.pendingDeletes, { assetId, assetUri }],
        }));
      },
      removePendingDelete: (assetId) => {
        set((state) => ({
          pendingDeletes: state.pendingDeletes.filter((d) => d.assetId !== assetId),
        }));
      },
      clearPendingDeletes: () => set({ pendingDeletes: [] }),

      // Session stats
      sessionStats: { deleted: 0, kept: 0, sorted: 0, total: 0 },
      incrementStat: (stat) => {
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            [stat]: state.sessionStats[stat] + 1,
            total: state.sessionStats.total + 1,
          },
        }));
      },
      decrementStat: (stat) => {
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            [stat]: Math.max(0, state.sessionStats[stat] - 1),
            total: Math.max(0, state.sessionStats.total - 1),
          },
        }));
      },
      resetSession: () => {
        set({
          sessionStats: { deleted: 0, kept: 0, sorted: 0, total: 0 },
          undoStack: [],
          pendingDeletes: [],
        });
      },

      // Settings
      photoSource: 'all',
      sourceAlbumId: null,
      setPhotoSource: (source, albumId = null) => {
        set({ photoSource: source, sourceAlbumId: albumId });
      },

      // Last used folder
      lastUsedFolderId: null,
      setLastUsedFolder: (id) => set({ lastUsedFolderId: id }),
    }),
    {
      name: 'photopurge-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        folders: state.folders,
        photoSource: state.photoSource,
        sourceAlbumId: state.sourceAlbumId,
        lastUsedFolderId: state.lastUsedFolderId,
      }),
    }
  )
);
