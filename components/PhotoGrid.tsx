import React from 'react';
import { StyleSheet, View, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { Colors, Spacing } from '@/constants/theme';

const COLUMNS = 3;
const GAP = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS;

type Props = {
  assets: MediaLibrary.Asset[];
  onPress?: (asset: MediaLibrary.Asset) => void;
};

export default function PhotoGrid({ assets, onPress }: Props) {
  return (
    <View style={styles.grid}>
      {assets.map((asset) => (
        <Pressable
          key={asset.id}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          onPress={() => onPress?.(asset)}
        >
          <Image
            source={{ uri: asset.uri }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={asset.id}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    padding: GAP,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
