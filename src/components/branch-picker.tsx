import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useIsFocused } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, Platform, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { useBranchSelection } from "@/lib/branch-selection";
import { distanceKm } from "@/lib/geo";
import { openStatus } from "@/lib/hours";
import { useBranches, useBranchStatus, type Branch } from "@/lib/menu";
import { colors, fonts, radius, shadow, tabBarSpace } from "@/theme/tokens";

type Pos = { lat: number; lng: number };

/**
 * Open/close state for the branch sheet. Opens by itself once on first launch when there are several branches
 * and none has been picked yet, and always closes when the screen loses focus.
 */
export function useBranchPicker() {
  const branches = useBranches();
  const { selectedId, loaded } = useBranchSelection();
  const focused = useIsFocused();
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const many = (branches.data?.length ?? 0) > 1;
  const open = focused && (manualOpen || (loaded && !selectedId && many && !dismissed));
  return {
    open,
    many,
    show: () => setManualOpen(true),
    close: () => {
      setManualOpen(false);
      setDismissed(true);
    },
  };
}

/** Home screen pill that shows the current branch. Tapping it opens the sheet. Plain text when there is one branch. */
export function BranchPill({ onPress, many }: { onPress: () => void; many: boolean }) {
  const { t, pick } = useI18n();
  const { branch } = useBranchStatus();
  const branches = useBranches();

  if (branches.isPending) return <Skeleton height={60} r={radius.pill} />;
  if (!branch) return null;

  const name = `${branch.is_demo ? `${t.demoBranch}: ` : ""}${pick(branch.name_en, branch.name_ar)}`;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.orderingFrom} ${name}. ${t.chooseBranch}`}
      disabled={!many}
      onPress={onPress}
      scaleTo={0.98}
      style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.white }, shadow.card]}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="location" size={20} color={colors.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.gray }}>{t.orderingFrom}</Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.black }}>{name}</Text>
      </View>
      {many && <Ionicons name="chevron-down" size={20} color={colors.gray} />}
    </PressableScale>
  );
}

const fill = { position: "absolute", top: 0, bottom: 0, start: 0, end: 0 } as const;

/**
 * Bottom sheet rendered inside the screen, not in a full-screen popup. The floating tab bar belongs to the navigator
 * and is drawn above screen content, so it stays visible on top of the sheet and the sheet appears to rise out of it.
 * Place it as the last child of the screen's root view.
 */
export function BranchSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, pick } = useI18n();
  const branches = useBranches();
  const { branch: current } = useBranchStatus();
  const { select } = useBranchSelection();
  const [pos, setPos] = useState<Pos | null>(null);
  const [finding, setFinding] = useState(false);
  const [denied, setDenied] = useState(false);

  // Android back button closes the sheet instead of leaving the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const rows = useMemo(() => {
    const list = (branches.data ?? []).map((b) => ({ b, km: pos && b.lat !== null && b.lng !== null ? distanceKm(pos, { lat: b.lat, lng: b.lng }) : null }));
    return pos ? list.sort((x, y) => (x.km ?? Infinity) - (y.km ?? Infinity)) : list;
  }, [branches.data, pos]);
  const nearestId = pos ? rows[0]?.b.id : undefined;

  const choose = (b: Branch) => {
    select(b.id);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onClose();
  };

  const findNearest = async () => {
    setDenied(false);
    setFinding(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setDenied(true);
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const me = { lat: here.coords.latitude, lng: here.coords.longitude };
      setPos(me);
      const nearest = (branches.data ?? [])
        .filter((b) => b.lat !== null && b.lng !== null)
        .sort((x, y) => distanceKm(me, { lat: x.lat!, lng: x.lng! }) - distanceKm(me, { lat: y.lat!, lng: y.lng! }))[0];
      if (nearest) choose(nearest);
    } catch {
      setDenied(true);
    } finally {
      setFinding(false);
    }
  };

  return (
    <View pointerEvents={visible ? "auto" : "none"} style={fill}>
      {visible && (
        <>
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={{ ...fill, backgroundColor: "rgba(23,19,15,0.45)" }}>
            <PressableScale accessibilityRole="button" accessibilityLabel={t.cancel} haptic={false} scaleTo={1} onPress={onClose} style={{ flex: 1 }} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(220).easing(Easing.in(Easing.cubic))}
            style={[{ position: "absolute", start: 0, end: 0, bottom: 0, maxHeight: "86%", backgroundColor: colors.cream, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl }, shadow.lift]}
          >
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border }} />
            </View>
            {/* Bottom padding keeps the last branch clear of the tab bar that floats over this sheet. */}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarSpace + 16, gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 4 }}>
                <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.5, color: colors.black }}>{t.chooseBranch}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.gray }}>{t.chooseBranchSub}</Text>
              </View>

              <PressableScale
                accessibilityRole="button"
                onPress={findNearest}
                disabled={finding}
                style={[{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: radius.pill, backgroundColor: colors.black }, shadow.lift]}
              >
                <Ionicons name={finding ? "hourglass-outline" : "navigate"} size={20} color={colors.cream} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.cream }}>{t.nearestBranch}</Text>
              </PressableScale>
              {denied && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.danger }}>{t.branchLocationDenied}</Text>}

              {branches.isError && <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.danger }}>{t.branchesLoadError}</Text>}

              {rows.map(({ b, km }) => {
                const on = b.id === current?.id;
                const closed = !openStatus(b.opening_hours).open;
                return (
                  <PressableScale
                    key={b.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${pick(b.name_en, b.name_ar)}${km !== null ? `, ${t.kmAway(km.toFixed(0))}` : ""}${closed ? `, ${t.branchClosed}` : ""}`}
                    onPress={() => choose(b)}
                    scaleTo={0.98}
                    style={[
                      { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: on ? colors.orangeSoft : colors.white, borderWidth: 2, borderColor: on ? colors.orange : "transparent" },
                      shadow.card,
                    ]}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? colors.orange : colors.cream, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={on ? "checkmark" : "storefront"} size={22} color={on ? colors.white : colors.orange} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{pick(b.name_en, b.name_ar)}</Text>
                      {!!b.address && <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.gray }}>{b.address}</Text>}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {b.id === nearestId && <Tag label={t.nearestNote} bg={colors.yellowSoft} fg={colors.black} />}
                        {km !== null && <Tag label={t.kmAway(km < 10 ? km.toFixed(1) : km.toFixed(0))} bg={colors.cream} fg={colors.gray} />}
                        {closed && <Tag label={t.branchClosed} bg={colors.dangerSoft} fg={colors.danger} />}
                      </View>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: bg }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}
