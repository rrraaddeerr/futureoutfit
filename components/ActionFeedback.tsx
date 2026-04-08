import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ActionType = 'delete' | 'keep' | 'sort' | 'undo' | null;

type Props = {
  action: ActionType;
  folderName?: string;
  onComplete: () => void;
};

// Particle for explosion effect
function ExplosionParticle({ index, total }: { index: number; total: number }) {
  const progress = useSharedValue(0);
  const angle = (index / total) * Math.PI * 2;
  const distance = 80 + Math.random() * 120;
  const size = 6 + Math.random() * 12;
  const emoji = ['💥', '🔥', '💨', '✨', '🧨'][index % 5];

  useEffect(() => {
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value - 40 * progress.value },
      { scale: interpolate(progress.value, [0, 0.3, 1], [0, 1.5, 0]) },
      { rotate: `${progress.value * 360}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
  }));

  return (
    <Animated.Text style={[styles.particle, style, { fontSize: size }]}>
      {emoji}
    </Animated.Text>
  );
}

// Vault lock effect for keep
function VaultEffect() {
  const drop = useSharedValue(-100);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const shieldScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 });
    drop.value = withSequence(
      withTiming(0, { duration: 250, easing: Easing.bounce }),
    );
    scale.value = withSpring(1.2, { damping: 8, stiffness: 300 });
    shieldScale.value = withSequence(
      withDelay(200, withSpring(1.4, { damping: 6 })),
      withDelay(100, withTiming(0, { duration: 300 }))
    );
    opacity.value = withDelay(500, withTiming(0, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }, { scale: shieldScale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.centerEffect, style]}>
      <Text style={styles.bigEmoji}>🛡️</Text>
      <Text style={styles.effectLabel}>SAFE</Text>
    </Animated.View>
  );
}

// Folder inhale effect for sort
function FolderEffect({ folderName }: { folderName?: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const folderOpen = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 });
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    folderOpen.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(300, withTiming(0, { duration: 200 }))
    );
    opacity.value = withDelay(500, withTiming(0, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.centerEffect, style]}>
      <Text style={styles.bigEmoji}>📂</Text>
      {folderName && <Text style={styles.effectLabel}>{folderName}</Text>}
    </Animated.View>
  );
}

// Time rewind for undo
function RewindEffect() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 });
    rotation.value = withTiming(-720, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withDelay(200, withTiming(0, { duration: 300 }))
    );
    opacity.value = withDelay(500, withTiming(0, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.centerEffect, style]}>
      <Text style={styles.bigEmoji}>⏪</Text>
      <Text style={styles.effectLabel}>REWIND</Text>
    </Animated.View>
  );
}

export default function ActionFeedback({ action, folderName, onComplete }: Props) {
  const screenShake = useSharedValue(0);

  useEffect(() => {
    if (action === 'delete') {
      // Screen shake for explosions
      screenShake.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    const timer = setTimeout(() => {
      onComplete();
    }, 800);

    return () => clearTimeout(timer);
  }, [action]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenShake.value }],
  }));

  if (!action) return null;

  const PARTICLE_COUNT = 16;

  return (
    <Animated.View style={[styles.container, shakeStyle]} pointerEvents="none">
      {action === 'delete' && (
        <View style={styles.explosionCenter}>
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <ExplosionParticle key={i} index={i} total={PARTICLE_COUNT} />
          ))}
          <Text style={styles.bigEmoji}>🧨</Text>
        </View>
      )}
      {action === 'keep' && <VaultEffect />}
      {action === 'sort' && <FolderEffect folderName={folderName} />}
      {action === 'undo' && <RewindEffect />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explosionCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  particle: {
    position: 'absolute',
  },
  centerEffect: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 64,
  },
  effectLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
