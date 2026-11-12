import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono/600SemiBold";
import { SessionProvider } from "@/features/auth";
import { QueryProvider } from "@/providers";
import { palette } from "@/lib/theme";

export { RouteError as ErrorBoundary } from "@/components/feedback";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const ready = fontsReady || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.page } }}
          />
        </SessionProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
