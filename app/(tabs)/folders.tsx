import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { FolderConfig } from '@/constants/folders';
import FolderForm from '@/components/FolderForm';

export default function FoldersScreen() {
  const { folders, addFolder, updateFolder, removeFolder } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderConfig | null>(null);

  const handleSave = (name: string, icon: string, color: string) => {
    if (editingFolder) {
      updateFolder(editingFolder.id, { name, icon, color });
    } else {
      addFolder(name, icon, color);
    }
    setShowForm(false);
    setEditingFolder(null);
  };

  const handleEdit = (folder: FolderConfig) => {
    setEditingFolder(folder);
    setShowForm(true);
  };

  const handleDelete = (folder: FolderConfig) => {
    Alert.alert(
      'Delete Folder',
      `Remove "${folder.name}"? Photos already in the "${folder.albumName}" album won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeFolder(folder.id),
        },
      ]
    );
  };

  const openFolderDetail = (folder: FolderConfig) => {
    router.push({
      pathname: '/folder/[id]',
      params: { id: folder.id, name: folder.name, albumName: folder.albumName },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
          onPress={() => {
            setEditingFolder(null);
            setShowForm(true);
          }}
        >
          <FontAwesome name="plus" size={16} color={Colors.text} />
          <Text style={styles.addText}>New</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {folders.map((folder) => (
          <Pressable
            key={folder.id}
            style={({ pressed }) => [styles.folderRow, pressed && { opacity: 0.8 }]}
            onPress={() => openFolderDetail(folder)}
          >
            <View style={[styles.iconBox, { backgroundColor: folder.color + '22' }]}>
              <FontAwesome name={folder.icon as any} size={20} color={folder.color} />
            </View>
            <View style={styles.folderInfo}>
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.albumName}>{folder.albumName}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => handleEdit(folder)}>
                <FontAwesome name="pencil" size={14} color={Colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDelete(folder)}>
                <FontAwesome name="trash-o" size={14} color={Colors.textMuted} />
              </Pressable>
              <FontAwesome name="chevron-right" size={12} color={Colors.textMuted} />
            </View>
          </Pressable>
        ))}

        {folders.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome name="folder-open-o" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No folders yet. Tap "New" to create one.</Text>
          </View>
        )}
      </ScrollView>

      <FolderForm
        visible={showForm}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingFolder(null);
        }}
        initial={editingFolder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  albumName: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
