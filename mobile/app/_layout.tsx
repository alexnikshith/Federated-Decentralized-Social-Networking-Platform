import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../assets/styles/global.css';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { useAuthStore } from '../src/epics/identity/store/authStore';
import { useSettingsStore } from '../src/epics/identity/store/settingsStore';
import { useRouter, useSegments } from 'expo-router';
import { Alert } from 'react-native';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  const { updateDailyUsage, dailyUsageMinutes, timeLimitMinutes, isLimitIgnoredToday, ignoreLimit, setTimeLimit } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();

  // Track daily usage
  useEffect(() => {
    const interval = setInterval(() => {
      updateDailyUsage(1);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Check time limit
  useEffect(() => {
    if (timeLimitMinutes && dailyUsageMinutes >= timeLimitMinutes && !isLimitIgnoredToday) {
      Alert.alert(
        "Time Limit Reached",
        `You have reached your daily limit of ${timeLimitMinutes} minutes.`,
        [
          {
            text: "Ignore",
            onPress: () => ignoreLimit(),
            style: "cancel"
          },
          {
            text: "Extend 10 mins",
            onPress: () => setTimeLimit(timeLimitMinutes + 10)
          }
        ]
      );
    }
  }, [dailyUsageMinutes, timeLimitMinutes, isLimitIgnoredToday]);

  useEffect(() => {
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the login page if the user is not authenticated
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect away from the login page if the user is authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-post" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
