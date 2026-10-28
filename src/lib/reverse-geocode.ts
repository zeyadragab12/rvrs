import * as Location from "expo-location";

/** Human-readable address for a point, or null when the device can't resolve one (offline, web, no result). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!r) return null;
    const street = [r.streetNumber, r.street].filter(Boolean).join(" ");
    const parts = [r.name && r.name !== r.street && r.name !== r.streetNumber ? r.name : null, street || null, r.district, r.city ?? r.subregion, r.region];
    const seen = new Set<string>();
    const unique = parts.filter((p): p is string => !!p && !seen.has(p) && !!seen.add(p));
    return unique.length ? unique.join(", ") : null;
  } catch {
    return null;
  }
}
