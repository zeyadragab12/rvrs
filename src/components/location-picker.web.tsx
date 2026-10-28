export type LatLng = { lat: number; lng: number };

/** react-native-maps has no web build. Web users rely on "Use my current location" instead. */
export function LocationPicker(_props: { value: LatLng | null; onChange: (c: LatLng) => void; height?: number }) {
  return null;
}
