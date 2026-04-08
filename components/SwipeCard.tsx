import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import SwipeOverlay from './SwipeOverlay';
import { Colors, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.35;
const SWIPE_Y_THRESHOLD = SCREEN_HEIGHT * 0.22;
const VELOCITY_THRESHOLD = 500;

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

type Props = {
  asset: MediaLibrary.Asset;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  index: number;
};

export default function SwipeCard({ asset, onSwipe, isTop, index }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const hasTriggeredHaptic = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerHeavyHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    onSwipe(direction);
  };

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // Haptic feedback when crossing threshold
      const pastThreshold =
        Math.abs(event.translationX) > SWIPE_X_THRESHOLD ||
        Math.abs(event.translationY) > SWIPE_Y_THRESHOLD;

      if (pastThreshold && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(triggerHaptic)();
      } else if (!pastThreshold && hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velX = Math.abs(event.velocityX);
      const velY = Math.abs(event.velocityY);

      let direction: SwipeDirection = null;

      // Determine primary swipe direction
      if (absX > absY) {
        // Horizontal swipe
        if (absX > SWIPE_X_THRESHOLD || velX > VELOCITY_THRESHOLD) {
          direction = event.translationX < 0 ? 'left' : 'right';
        }
      } else {
        // Vertical swipe
        if (absY > SWIPE_Y_THRESHOLD || velY > VELOCITY_THRESHOLD) {
          direction = event.translationY < 0 ? 'up' : 'down';
        }
      }

      if (direction) {
        // Fly off screen
        runOnJS(triggerHeavyHaptic)();
        const targetX =
          direction === 'left' ? -SCREEN_WIDTH * 1.5 :
          direction === 'right' ? SCREEN_WIDTH * 1.5 : 0;
        const targetY =
          direction === 'up' ? -SCREEN_HEIGHT * 1.5 :
          direction === 'down' ? SCREEN_HEIGHT * 1.5 : 0;

        translateX.value = withTiming(targetX, { duration: 300 });
        translateY.value = withTiming(targetY, { duration: 300 }, () => {
          runOnJS(handleSwipe)(direction);
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    // Stacked card offset for non-top cards
    const stackScale = isTop ? 1 : interpolate(index, [1, 2, 3], [0.95, 0.9, 0.85]);
    const stackTranslateY = isTop ? 0 : interpolate(index, [1, 2, 3], [10, 20, 30]);

    return {
      transform: [
        { translateX: isTop ? translateX.value : 0 },
        { translateY: isTop ? translateY.value : stackTranslateY },
        { rotate: isTop ? `${rotation}deg` : '0deg' },
        { scale: isTop ? scale.value : stackScale },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle, { zIndex: 100 - index }]}>
        <Image
          source={{ uri: asset.uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          recyclingKey={asset.id}
        />
        {isTop && (
          <SwipeOverlay
            translateX={translateX}
            translateY={translateY}
            screenWidth={SCREEN_WIDTH}
            screenHeight={SCREEN_HEIGHT}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
