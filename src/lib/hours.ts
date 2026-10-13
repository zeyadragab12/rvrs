export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string }>>;

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function cairoNow() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3);
  return { dayIndex: Math.max(0, DAYS.indexOf(day as (typeof DAYS)[number])), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenStatus = { configured: boolean; open: boolean; opensDay?: (typeof DAYS)[number]; opensAt?: string; today?: boolean };

/** Mirrors the database rule (Cairo time, overnight hours allowed). The server is still the authority. */
export function openStatus(hours: Hours | null | undefined): OpenStatus {
  if (!hours || Object.keys(hours).length === 0) return { configured: false, open: true };
  const { dayIndex, minutes } = cairoNow();
  const today = hours[DAYS[dayIndex]];
  const prev = hours[DAYS[(dayIndex + 6) % 7]];
  if (today) {
    const o = toMin(today.open), c = toMin(today.close);
    if ((o <= c && minutes >= o && minutes < c) || (o > c && minutes >= o)) return { configured: true, open: true };
  }
  if (prev) {
    const o = toMin(prev.open), c = toMin(prev.close);
    if (o > c && minutes < c) return { configured: true, open: true };
  }
  if (today && minutes < toMin(today.open)) return { configured: true, open: false, opensDay: DAYS[dayIndex], opensAt: today.open, today: true };
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(dayIndex + i) % 7];
    const w = hours[d];
    if (w) return { configured: true, open: false, opensDay: d, opensAt: w.open, today: false };
  }
  return { configured: true, open: false };
}
