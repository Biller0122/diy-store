import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export function LoadingSkeleton({ height = 16, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.skeleton, { height, width, opacity }]} />;
}

const styles = StyleSheet.create({
  skeleton: { borderRadius: radius.md, backgroundColor: colors.surface },
});
