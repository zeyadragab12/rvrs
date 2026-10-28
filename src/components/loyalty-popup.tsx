import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { Easing, Extrapolation, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LoyaltyCard } from "@/components/loyalty-card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useI18n } from "@/i18n";
import { useLoyalty } from "@/lib/loyalty";
import { colors, shadow } from "@/theme/tokens";

/** Size of the ball the card shrinks into when it closes. */
const BALL = 0.12;
const CLOSE_MS = 340;

/**
 * The loyalty card as a popup. It opens with a calm fade and grow. It closes as a liquid ball: the card turns
 * orange and round, squeezes down and is pulled back into the button it came from.
 */
function LoyaltyPopup({ visible, origin, onClose }: { visible: boolean; origin: { x: number; y: number }; onClose: () => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  // Keep the modal mounted while the closing animation plays.
  const [lingering, setLingering] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (!visible) setLingering(true);
  }
  const open = useSharedValue(0); // fade/grow in
  const ball = useSharedValue(0); // 0 = full card, 1 = ball at the button
  const squeezeY = useSharedValue(0); // runs slightly ahead of the width so the blob looks like it is stretching
  const dx = origin.x - width / 2;
  const dy = origin.y - height / 2;

  useEffect(() => {
    if (visible) {
      ball.set(0);
      squeezeY.set(0);
      open.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
      return;
    }
    const pull = Easing.in(Easing.cubic);
    ball.set(withTiming(1, { duration: CLOSE_MS, easing: pull }));
    squeezeY.set(withTiming(1, { duration: CLOSE_MS - 90, easing: pull }));
    const reset = setTimeout(() => {
      setLingering(false);
      open.set(0);
    }, CLOSE_MS + 30);
    return () => clearTimeout(reset);
  }, [visible, open, ball, squeezeY]);

  const backdrop = useAnimatedStyle(() => ({ opacity: open.value * 0.5 * (1 - ball.value) }));
  const blob = useAnimatedStyle(() => {
    const grow = interpolate(open.value, [0, 1], [0.94, 1]);
    return {
      opacity: open.value,
      transform: [
        { translateX: ball.value * dx },
        { translateY: ball.value * dy },
        { scaleX: grow * interpolate(ball.value, [0, 1], [1, BALL]) },
        { scaleY: grow * interpolate(squeezeY.value, [0, 1], [1, BALL]) },
      ],
    };
  });
  const skin = useAnimatedStyle(() => ({
    borderRadius: interpolate(ball.value, [0, 1], [32, 400]),
    backgroundColor: interpolateColor(ball.value, [0.25, 1], [colors.black, colors.orange]),
  }));
  const content = useAnimatedStyle(() => ({ opacity: interpolate(ball.value, [0, 0.4], [1, 0], Extrapolation.CLAMP) }));

  return (
    <Modal visible={visible || lingering} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: colors.black }, backdrop]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancel} onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={blob}>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0 }, skin]} />
          <Animated.View style={content}>
            <LoyaltyCard onNavigate={onClose} />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Round button for the home header, next to the cart. Opens the loyalty card popup. */
export function LoyaltyButton() {
  const { t } = useI18n();
  const { signedIn, unlocked, rewardPending } = useLoyalty();
  const ref = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const ready = signedIn && unlocked && !rewardPending;

  const show = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setOrigin({ x: x + w / 2, y: y + h / 2 });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={ref} collapsable={false}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.loyaltyTitle}
          onPress={show}
          style={[{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.orange }, shadow.glow]}
        >
          <Ionicons name="ribbon" size={22} color={colors.white} />
          {ready && <View style={{ position: "absolute", top: 0, end: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.yellow, borderWidth: 2, borderColor: colors.cream }} />}
        </PressableScale>
      </View>
      <LoyaltyPopup visible={open} origin={origin} onClose={() => setOpen(false)} />
    </>
  );
}
