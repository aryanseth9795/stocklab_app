import React, { useEffect } from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInUp,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  BounceIn,
  FlipInXUp,
  Layout,
} from "react-native-reanimated";

// ============ ENTERING ANIMATIONS (Layout Animations) ============
// Use these directly on Animated.View with the 'entering' prop
export const EnterAnimations = {
  fadeIn: FadeIn.duration(400),
  fadeInDown: FadeInDown.duration(400).springify(),
  fadeInUp: FadeInUp.duration(400).springify(),
  fadeInLeft: FadeInLeft.duration(400).springify(),
  fadeInRight: FadeInRight.duration(400).springify(),
  slideInDown: SlideInDown.duration(400).springify(),
  slideInUp: SlideInUp.duration(400).springify(),
  slideInLeft: SlideInLeft.duration(400).springify(),
  slideInRight: SlideInRight.duration(400).springify(),
  zoomIn: ZoomIn.duration(300).springify(),
  bounceIn: BounceIn.duration(500),
  flipIn: FlipInXUp.duration(500),
};

// Staggered list item animation
export const createStaggeredEnter = (index: number, baseDelay = 50) => {
  const delay = Math.min(index * baseDelay, 300);
  return FadeInDown.delay(delay).duration(400).springify();
};

// ============ ANIMATED COMPONENTS ============

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

// Card with staggered entrance animation
export function AnimatedCard({
  children,
  index = 0,
  style,
}: AnimatedCardProps) {
  return (
    <Animated.View
      entering={createStaggeredEnter(index)}
      layout={Layout.springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

// Pressable with scale animation
export function AnimatedPressable({
  children,
  onPress,
  style,
  disabled = false,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Animated.View
        onTouchStart={disabled ? undefined : handlePressIn}
        onTouchEnd={disabled ? undefined : handlePressOut}
        onTouchCancel={disabled ? undefined : handlePressOut}
      >
        {typeof onPress === "function" ? (
          <Animated.View onTouchEnd={onPress}>{children}</Animated.View>
        ) : (
          children
        )}
      </Animated.View>
    </Animated.View>
  );
}

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Simple fade in with Reanimated
export function FadeInView({
  children,
  duration = 500,
  delay = 0,
  style,
}: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

interface PulseViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

// Continuous pulse animation
export function PulseView({ children, style, active = true }: PulseViewProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
        true,
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Slide in from any direction
export function SlideInView({
  children,
  direction = "up",
  delay = 0,
  style,
}: SlideInViewProps) {
  const enteringAnimation = {
    left: SlideInLeft.delay(delay).springify(),
    right: SlideInRight.delay(delay).springify(),
    up: SlideInUp.delay(delay).springify(),
    down: SlideInDown.delay(delay).springify(),
  }[direction];

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
}

interface PriceFlashProps {
  children: React.ReactNode;
  trigger: number | string;
  style?: StyleProp<ViewStyle>;
  flashColor?: string;
}

// Flash animation when value changes
export function PriceFlash({
  children,
  trigger,
  style,
  flashColor = "rgba(99,102,241,0.25)",
}: PriceFlashProps) {
  const flash = useSharedValue(0);

  useEffect(() => {
    flash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 300 }),
    );
  }, [trigger, flash]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      ["transparent", flashColor],
    ),
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

interface ShakeViewProps {
  children: React.ReactNode;
  trigger: boolean;
  style?: StyleProp<ViewStyle>;
}

// Shake animation for errors
export function ShakeView({ children, trigger, style }: ShakeViewProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [trigger, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

interface CountUpProps {
  value: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

// Animated count up number
export function CountUp({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 2,
}: CountUpProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animatedValue]);

  const animatedProps = useAnimatedStyle(() => {
    const displayValue = animatedValue.value.toFixed(decimals);
    return {} as any; // This is a placeholder - text animation needs AnimatedText
  });

  // Note: For actual text animation, use Animated.Text with useAnimatedProps
  return null;
}

// ============ SCALE BUTTON HOOK ============
export function useScaleAnimation(initialScale = 1) {
  const scale = useSharedValue(initialScale);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return { animatedStyle, onPressIn, onPressOut };
}

// ============ FLIP ANIMATION HOOK ============
export function useFlipAnimation() {
  const rotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }],
    backfaceVisibility: "hidden",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value + 180}deg` }],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  }));

  const flip = () => {
    rotation.value = withSpring(isFlipped.value ? 0 : 180, {
      damping: 20,
      stiffness: 90,
    });
    isFlipped.value = !isFlipped.value;
  };

  return { frontStyle, backStyle, flip };
}
