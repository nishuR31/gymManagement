import './global.css';
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { Text, View } from 'react-native';
import { LoginScreen } from './src/pages/LoginScreen';
import { DashboardScreen } from './src/pages/DashboardScreen';
import { Button } from './src/components/ui/Button';

import { Toaster } from './src/components/ui/Toaster';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { loadThemeSettings } from './src/features/theme/themeSlice';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

import { PublicHomeScreen } from './src/pages/PublicHomeScreen';

function RootApp() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  const isLoaded = useAppSelector((state) => state.theme.isLoaded);

  useEffect(() => {
    dispatch(loadThemeSettings());
  }, [dispatch]);

  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  if (!isLoaded) {
    return null; // Or a splash screen
  }

  return (
    <SafeAreaProvider>
      <View className={`flex-1 ${theme === 'dark' ? 'dark' : ''} theme-${styleMode}`}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: 'hsl(var(--background))' },
            headerTintColor: 'hsl(var(--foreground))',
          }}>
            <Stack.Screen name="Home" component={PublicHomeScreen} options={{ title: 'Valor Fitness', headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', headerBackVisible: false }} />
          </Stack.Navigator>
        </NavigationContainer>
        <Toaster />
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <RootApp />
    </Provider>
  );
}
