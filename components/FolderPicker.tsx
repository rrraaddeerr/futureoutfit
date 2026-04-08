import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';

type Props = {
  visible: boolean;
  onSelect: (folderId: string) => void;
  onCancel: () => void;
};

export default function FolderPicker({ visible, onSelect, onCancel }: Props) {
  const { folders, lastUsedFolderId } = useAppStore();

  if (!visible) return null;

  // Put last-used folder first
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.id === lastUsedFolderId) return -1;
    if (b.id === lastUsedFolderId) return 1;
    return 0;
  });

  return (
    <Animated.View
      style={styles.backdrop}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
    >
      <Pressable style={styles.backdropPress} onPress={onCancel} />
      <Animated.View
        style={styles.sheet}
        entering={SlideInDown.springify().damping(18).stiffness(200)}
        exiting={SlideOutDown.duration(200)}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Sort into folder</Text>

        <ScrollView
          style={styles.folderList}
          contentContainerStyle={styles.folderGrid}
          showsVerticalScrollIndicator={false}
        >
          {sortedFolders.map((folder) => (
            <Pressable
              key={folder.id}
              style={({ pressed }) => [
                styles.folderButton,
                { backgroundColor: folder.color + '22', borderColor: folder.color + '66' },
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              onPress={() => onSelect(folder.id)}
            >
              <FontAwesome name={folder.icon as any} size={22} color={folder.color} />
              <Text style={[styles.folderName, { color: folder.color }]} numberOfLines={1}>
                {folder.name}
              </Text>
              {folder.id === lastUsedFolderId && (
                <View style={[styles.recentBadge, { backgroundColor: folder.color }]}>
                  <Text style={styles.recentText}>Recent</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 20, // Safe area padding
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  folderList: {
    maxHeight: 300,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  folderButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '30%',
    minWidth: 90,
    flexGrow: 1,
  },
  folderName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  recentBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recentText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  cancelButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
