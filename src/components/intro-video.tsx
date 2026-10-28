import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet } from "react-native";

const SOURCE = require("../../assets/videos/rvrs-intro.mp4");
const BRAND_ORANGE = "#F15A24"; // same orange as the video's first frame, so there is no flash while it loads
const OUTRO_MS = 700;
const MAX_MS = 8000; // the clip is 5s

/** Full-screen launch intro. Eases out (soft zoom + fade) when it ends, fails, or is tapped to skip, then calls onDone. */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.muted = Platform.OS === "web"; // browsers block autoplay with sound
    p.play();
  });

  const [progress] = useState(() => new Animated.Value(0)); // 0 = playing, 1 = gone
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  const leave = () => {
    if (started.current) return;
    started.current = true;
    setLeaving(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: OUTRO_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  };

  // On web the setup callback runs before VideoView attaches its <video>, so that play() is a no-op.
  // VideoView attaches in its own effect, which runs before this one, so play again here.
  // The timer is a safety net in case the video never starts or never ends.
  useEffect(() => {
    player.play();
    const timer = setTimeout(leave, MAX_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  useEventListener(player, "playToEnd", leave);
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") leave();
  });

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View style={[styles.root, { opacity }]} pointerEvents={leaving ? "none" : "auto"}>
      <Pressable style={styles.fill} onPress={leave} accessibilityRole="button" accessibilityLabel="Skip intro">
        <Animated.View style={[styles.fill, { transform: [{ scale }] }]}>
          <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BRAND_ORANGE, zIndex: 100 },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
