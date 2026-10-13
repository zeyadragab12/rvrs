import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts } from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { IntroVideo } from "@/components/intro-video";
import { PushRegistrar } from "@/components/push-registrar";
import { BranchSelectionProvider } from "@/lib/branch-selection";
import { CartProvider } from "@/lib/cart";
import { FulfillmentProvider } from "@/lib/fulfillment";
import { SessionProvider } from "@/lib/session";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 2 } } }));
  const [loaded, error] = useFonts({ ArchivoBlack_400Regular, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
      <FulfillmentProvider>
        <BranchSelectionProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <PushRegistrar />
          <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
            <Stack.Screen name="product/[id]" options={{ presentation: "modal" }} />
            <Stack.Screen name="cart" options={{ presentation: "modal" }} />
            <Stack.Screen name="checkout" options={{ presentation: "modal" }} />
            <Stack.Screen name="address" options={{ presentation: "modal" }} />
          </Stack>
          {!introDone && <IntroVideo onDone={() => setIntroDone(true)} />}
        </CartProvider>
        </BranchSelectionProvider>
      </FulfillmentProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
