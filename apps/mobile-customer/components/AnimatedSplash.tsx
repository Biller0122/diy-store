import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Branded launch animation shown on top of the app on cold start.
 * The SHOPTOOL wordmark scales/fades in, an orange bracket draws in, and a
 * row of dots pulses while the first data loads. Fades itself out after a
 * minimum on-screen time, then calls `onFinish` so the host can unmount it.
 */

const BG = '#0A0A12';
const WHITE = '#F5F5FF';
const ORANGE = '#FF6A1A';
const GREY = '#9A9AB5';

const MIN_VISIBLE_MS = 1700;

function Dot({ index }: { index: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(v);
  }, [index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: interpolate(v.value, [0.3, 1], [0.7, 1]) }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const progress = useSharedValue(0);
  const tagline = useSharedValue(0);
  const bracket = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 13, stiffness: 110 });
    bracket.value = withDelay(260, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    tagline.value = withDelay(420, withTiming(1, { duration: 520 }));

    const t = setTimeout(() => runOnJS(onFinish)(), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [progress, tagline, bracket, onFinish]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.82, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [12, 0]) },
    ],
  }));

  const bracketStyle = useAnimatedStyle(() => ({
    opacity: bracket.value,
    transform: [{ translateX: interpolate(bracket.value, [0, 1], [-14, 0]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [8, 0]) }],
  }));

  return (
    <Animated.View style={styles.root} exiting={FadeOut.duration(420)} pointerEvents="none">
      <Animated.View style={[styles.wordRow, wordStyle]}>
        <Text style={styles.shop}>SHOP</Text>
        <Text style={styles.tool}>TOOL</Text>
        <Animated.View style={[styles.bracket, bracketStyle]} />
      </Animated.View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Барилгын материалын ухаалаг шийдэл
      </Animated.Text>

      <View style={styles.dots}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shop: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: 1,
    color: WHITE,
  },
  tool: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: 1,
    color: ORANGE,
  },
  bracket: {
    width: 18,
    height: 30,
    marginLeft: 6,
    marginTop: -14,
    borderColor: ORANGE,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  tagline: {
    marginTop: 14,
    fontSize: 13,
    letterSpacing: 0.4,
    color: GREY,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 34,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: ORANGE,
  },
});
