import { createClient } from "jsr:@supabase/supabase-js@2";

// verify_jwt is off on purpose: callers are authenticated with the x-webhook-secret header instead.

type Msg = { title: string; body: string };
type Locale = "en" | "ar";

const MESSAGES: Record<string, Record<Locale, (n: string) => Msg>> = {
  pending: {
    en: (n) => ({ title: "Order received", body: `We got your order ${n}. We will confirm it shortly.` }),
    ar: (n) => ({ title: "تم استلام طلبك", body: `وصلنا طلبك ${n}. سنؤكده قريبا.` }),
  },
  confirmed: {
    en: (n) => ({ title: "Order confirmed", body: `${n} is confirmed and will be prepared soon.` }),
    ar: (n) => ({ title: "تم تأكيد الطلب", body: `تم تأكيد ${n} وسيتم تحضيره قريبا.` }),
  },
  preparing: {
    en: (n) => ({ title: "Preparing your order", body: `The kitchen has started on ${n}.` }),
    ar: (n) => ({ title: "جاري تحضير طلبك", body: `بدأ المطبخ في تحضير ${n}.` }),
  },
  ready_for_pickup: {
    en: (n) => ({ title: "Ready for pickup", body: `${n} is ready. Come and get it.` }),
    ar: (n) => ({ title: "طلبك جاهز للاستلام", body: `${n} جاهز. تفضل بالاستلام.` }),
  },
  out_for_delivery: {
    en: (n) => ({ title: "On the way", body: `${n} is out for delivery.` }),
    ar: (n) => ({ title: "طلبك في الطريق", body: `${n} خرج للتوصيل.` }),
  },
  completed: {
    en: (n) => ({ title: "Order completed", body: `${n} is complete. Enjoy!` }),
    ar: (n) => ({ title: "اكتمل الطلب", body: `اكتمل ${n}. بالهناء والشفاء!` }),
  },
  rejected: {
    en: (n) => ({ title: "Order not accepted", body: `Sorry, we couldn't accept ${n}. Open the app for details.` }),
    ar: (n) => ({ title: "لم يتم قبول الطلب", body: `نأسف، تعذر قبول ${n}. افتح التطبيق للتفاصيل.` }),
  },
  cancelled: {
    en: (n) => ({ title: "Order cancelled", body: `${n} was cancelled. Open the app for details.` }),
    ar: (n) => ({ title: "تم إلغاء الطلب", body: `تم إلغاء ${n}. افتح التطبيق للتفاصيل.` }),
  },
};

function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: secret } = await db.rpc("push_webhook_secret");
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEqual(provided, secret as string)) return json({ error: "unauthorized" }, 401);

  let historyId: string | undefined;
  try {
    historyId = (await req.json()).history_id;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!historyId || !/^[0-9a-f-]{36}$/i.test(historyId)) return json({ error: "bad request" }, 400);

  // Claim this status change. A second call for the same change stops here.
  const claim = await db.from("notification_log").insert({ history_id: historyId });
  if (claim.error) return json({ skipped: claim.error.code === "23505" ? "duplicate" : claim.error.message });

  const finish = (result: unknown) => db.from("notification_log").update({ result }).eq("history_id", historyId!);

  const { data: h } = await db
    .from("order_status_history")
    .select("to_status, orders(id, order_number, user_id)")
    .eq("id", historyId)
    .single();
  // deno-lint-ignore no-explicit-any
  const order = (h as any)?.orders;
  // deno-lint-ignore no-explicit-any
  const status: string | undefined = (h as any)?.to_status;
  if (!order || !status || !MESSAGES[status]) {
    await finish({ skipped: "no message for this status" });
    return json({ skipped: "no message" });
  }
  if (!order.user_id) {
    await finish({ skipped: "guest order" });
    return json({ skipped: "guest order" });
  }

  const { data: profile } = await db.from("profiles").select("locale, notification_prefs").eq("id", order.user_id).single();
  if (profile && profile.notification_prefs?.order_updates === false) {
    await finish({ skipped: "turned off by customer" });
    return json({ skipped: "opted out" });
  }
  const locale: Locale = profile?.locale === "ar" ? "ar" : "en";

  const { data: tokens } = await db.from("device_tokens").select("token").eq("user_id", order.user_id);
  if (!tokens?.length) {
    await finish({ skipped: "no devices" });
    return json({ skipped: "no devices" });
  }

  // Only the order number and a status line go in the payload. No names, addresses, amounts or payment details.
  const msg = MESSAGES[status][locale](order.order_number);
  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    title: msg.title,
    body: msg.body,
    data: { orderId: order.id, status },
    channelId: "orders",
    priority: "high",
    sound: "default",
  }));

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(messages) });
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  if (!res || !res.ok) {
    await finish({ error: `expo push failed with status ${res?.status}` });
    return json({ error: "push service error" }, 502);
  }

  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  const tickets: any[] = body.data ?? [];
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status === "error" && t.details?.error === "DeviceNotRegistered") dead.push(messages[i].to);
  });
  if (dead.length) await db.from("device_tokens").delete().in("token", dead);

  await finish({ sent: tickets.filter((t) => t.status === "ok").length, failed: tickets.filter((t) => t.status === "error").length, removed_tokens: dead.length });
  return json({ ok: true, sent: tickets.length });
});
