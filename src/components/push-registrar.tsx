import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useProfile } from "@/lib/account";
import { registerForPush } from "@/lib/push";
import { useSession } from "@/lib/session";

/** Renders nothing. Registers this phone for order alerts and opens the order when an alert is tapped. */
export function PushRegistrar() {
  const { user } = useSession();
  const profile = useProfile();
  const wantsAlerts = profile.data ? profile.data.notification_prefs?.order_updates !== false : false;

  useEffect(() => {
    if (user && wantsAlerts) registerForPush();
  }, [user, wantsAlerts]);

  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const orderId = response.notification.request.content.data?.orderId;
    if (typeof orderId === "string") router.push({ pathname: "/order/[id]", params: { id: orderId } });
  }, [response]);

  return null;
}
