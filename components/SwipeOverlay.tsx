import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';

type Props = {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
};

const THRESHOLD_X = 0.3;
const THRESHOLD_Y = 0.25;

export default function SwipeOverlay({ translateX, translateY, screenWidth, screenHeight }: Props) {
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-screenWidth * THRESHOLD_X, -screenWidth * 0.1, 0],
      [1, 0.3, 0]
    ),
  }));

  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, screenWidth * 0.1, screenWidth * THRESHOLD_X],
      [0, 0.3, 1]
    ),
  }));

  const sortStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-screenHeight * THRESHOLD_Y, -screenHeight * 0.08, 0],
      [1, 0.3, 0]
    ),
  }));

  const undoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, screenHeight * 0.08, screenHeight * THRESHOLD_Y],
      [0, 0.3, 1]
    ),
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Delete - Left */}
      <Animated.View style={[styles.overlay, styles.left, { backgroundColor: Colors.delete + '33' }, deleteStyle]}>
        <View style={[styles.iconCircle, { borderColor: Colors.delete }]}>
          <FontAwesome name="trash" size={32} color={Colors.delete} />
        </View>
        <Animated.Text style={[styles.label, { color: Colors.delete }]}>DELETE</Animated.Text>
      </Animated.View>

      {/* Keep - Right */}
      <Animated.View style={[styles.overlay, styles.right, { backgroundColor: Colors.keep + '33' }, keepStyle]}>
        <View style={[styles.iconCircle, { borderColor: Colors.keep }]}>
          <FontAwesome name="check" size={32} color={Colors.keep} />
        </View>
        <Animated.Text style={[styles.label, { color: Colors.keep }]}>KEEP</Animated.Text>
      </Animated.View>

      {/* Sort - Up */}
      <Animated.View style={[styles.overlay, styles.top, { backgroundColor: Colors.sort + '33' }, sortStyle]}>
        <View style={[styles.iconCircle, { borderColor: Colors.sort }]}>
          <FontAwesome name="folder-open" size={28} color={Colors.sort} />
        </View>
        <Animated.Text style={[styles.label, { color: Colors.sort }]}>SORT</Animated.Text>
      </Animated.View>

      {/* Undo - Down */}
      <Animated.View style={[styles.overlay, styles.bottom, { backgroundColor: Colors.undo + '33' }, undoStyle]}>
        <View style={[styles.iconCircle, { borderColor: Colors.undo }]}>
          <FontAwesome name="undo" size={28} color={Colors.undo} />
        </View>
        <Animated.Text style={[styles.label, { color: Colors.undo }]}>UNDO</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  left: {
    left: 16,
    top: '30%',
    width: 80,
    height: 100,
  },
  right: {
    right: 16,
    top: '30%',
    width: 80,
    height: 100,
  },
  top: {
    top: 16,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 100,
  },
  bottom: {
    bottom: 16,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 100,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
});
