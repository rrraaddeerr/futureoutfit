import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { FolderConfig } from '@/constants/folders';

const ICON_OPTIONS = [
  'cube', 'paint-brush', 'lightbulb-o', 'user', 'home', 'map-marker',
  'camera', 'star', 'heart', 'film', 'scissors', 'wrench', 'leaf',
  'diamond', 'car', 'book', 'music', 'flag',
];

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A06CD5', '#FF9A76',
  '#6BCB77', '#4D96FF', '#FF6B9D', '#C4B5FD', '#67E8F9',
];

type Props = {
  visible: boolean;
  onSave: (name: string, icon: string, color: string) => void;
  onCancel: () => void;
  initial?: FolderConfig | null;
};

export default function FolderForm({ visible, onSave, onCancel, initial }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || 'star');
  const [color, setColor] = useState(initial?.color || COLOR_OPTIONS[0]);

  if (!visible) return null;

  return (
    <Animated.View
      style={styles.backdrop}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
    >
      <Pressable style={styles.backdropPress} onPress={onCancel} />
      <Animated.View
        style={styles.sheet}
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{initial ? 'Edit Folder' : 'New Folder'}</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor={Colors.textMuted}
          autoFocus
        />

        <Text style={styles.sectionTitle}>Icon</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
          {ICON_OPTIONS.map((ic) => (
            <Pressable
              key={ic}
              style={[styles.iconOption, icon === ic && { backgroundColor: color + '33', borderColor: color }]}
              onPress={() => setIcon(ic)}
            >
              <FontAwesome name={ic as any} size={20} color={icon === ic ? color : Colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <Pressable
              key={c}
              style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, { backgroundColor: color, opacity: name.trim() ? 1 : 0.4 }]}
            onPress={() => name.trim() && onSave(name.trim(), icon, color)}
            disabled={!name.trim()}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
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
    paddingBottom: Spacing.xl + 20,
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
  input: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
    fontSize: 16,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionRow: {
    marginBottom: Spacing.md,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceLight,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: Colors.text,
    transform: [{ scale: 1.15 }],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
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
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  saveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
