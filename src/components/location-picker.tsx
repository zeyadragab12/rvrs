import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, type MapPressEvent, type MarkerDragStartEndEvent } from "react-native-maps";
import { colors, radius } from "@/theme/tokens";

export type LatLng = { lat: number; lng: number };

const CAIRO: LatLng = { lat: 30.0444, lng: 31.2357 };
const DELTA = 0.01;

/** Map with a single pin. Tap the map or drag the pin to change `value`; `value` changes from outside move the camera. */
export function LocationPicker({ value, onChange, height = 260 }: { value: LatLng | null; onChange: (c: LatLng) => void; height?: number }) {
  const map = useRef<MapView>(null);
  const start = value ?? CAIRO;

  useEffect(() => {
    if (value) map.current?.animateToRegion({ latitude: value.lat, longitude: value.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }, 350);
  }, [value]);

  const pick = (e: MapPressEvent | MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onChange({ lat: latitude, lng: longitude });
  };

  return (
    <View style={{ height, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: colors.orange }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={{ latitude: start.lat, longitude: start.lng, latitudeDelta: value ? DELTA : 0.2, longitudeDelta: value ? DELTA : 0.2 }}
        onPress={pick}
        toolbarEnabled={false}
      >
        {value && <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} draggable onDragEnd={pick} pinColor={colors.orange} />}
      </MapView>
    </View>
  );
}
