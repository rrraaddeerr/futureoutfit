import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CardStack from '@/components/CardStack';
import { Colors, Spacing } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { deleteAssets } from '@/utils/mediaLibrary';

export default function SwipeScreen() {
  const { sessionStats, pendingDeletes, clearPendingDeletes, resetSession } = useAppStore();
  const hasSession = sessionStats.total > 0;

  const finishSession = async () => {
    if (pendingDeletes.length > 0) {
      const ids = pendingDeletes.map((d) => d.assetId);
      await deleteAssets(ids);
      clearPendingDeletes();
    }
    resetSession();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with session stats */}
      <View style={styles.header}>
        <Text style={styles.title}>PhotoPurge</Text>
        {hasSession && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.delete }]}>{sessionStats.deleted}</Text>
              <Text style={styles.statLabel}>delete</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.keep }]}>{sessionStats.kept}</Text>
              <Text style={styles.statLabel}>keep</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.sort }]}>{sessionStats.sorted}</Text>
              <Text style={styles.statLabel}>sorted</Text>
            </View>
          </View>
        )}
      </View>

      {/* Card stack */}
      <View style={styles.cardArea}>
        <CardStack />
      </View>

      {/* Finish session button */}
      {pendingDeletes.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.finishButton, pressed && { opacity: 0.7 }]}
          onPress={finishSession}
        >
          <Text style={styles.finishText}>
            Finish & Delete {pendingDeletes.length} photo{pendingDeletes.length !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}

      {/* Swipe hints */}
      {!hasSession && (
        <View style={styles.hints}>
          <Text style={styles.hintText}>
            <Text style={{ color: Colors.delete }}>← Delete</Text>
            {'  '}
            <Text style={{ color: Colors.keep }}>Keep →</Text>
            {'  '}
            <Text style={{ color: Colors.sort }}>↑ Sort</Text>
            {'  '}
            <Text style={{ color: Colors.undo }}>↓ Undo</Text>
          </Text>
        </View>
      )}
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  cardArea: {
    flex: 1,
  },
  finishButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.delete,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hints: {
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
