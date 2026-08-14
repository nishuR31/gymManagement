import 'react-native-reanimated';
import './global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store';
import { LoginScreen } from './src/pages/LoginScreen';

import { MemberLoginScreen } from './src/pages/MemberLoginScreen';
import { DashboardScreen } from './src/pages/DashboardScreen';
import { PublicHomeScreen } from './src/pages/PublicHomeScreen';
import { MemberAccountScreen } from './src/pages/MemberAccountScreen';
import { MembershipsScreen } from './src/pages/MembershipsScreen';
import { PlansScreen } from './src/pages/PlansScreen';
import { AttendanceScreen } from './src/pages/AttendanceScreen';
import { MembersScreen } from './src/pages/MembersScreen';
import { InventoryScreen } from './src/pages/InventoryScreen';
import { OrdersScreen } from './src/pages/OrdersScreen';
import { StaffScreen } from './src/pages/StaffScreen';
import { ReportsScreen } from './src/pages/ReportsScreen';
import { PaymentsScreen } from './src/pages/PaymentsScreen';
import { InquiriesScreen } from './src/pages/InquiriesScreen';
import { SettingsScreen } from './src/pages/SettingsScreen';
import { PrivacyScreen } from './src/pages/PrivacyScreen';
import { TermsScreen } from './src/pages/TermsScreen';
import { DownloadAppScreen } from './src/pages/DownloadAppScreen';
import { FeaturesScreen } from './src/pages/FeaturesScreen';
import { Toaster } from './src/components/ui/Toaster';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { loadThemeSettings } from './src/features/theme/themeSlice';
import { bootstrapAuthThunk } from './src/features/auth/authSlice';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { loadApiBaseUrl } from './src/services/api';
import { registerForPushNotificationsAsync } from './src/services/notifications';

import { themeColors } from './src/constants/colors';

const Stack = createNativeStackNavigator();

function RootApp() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  const isLoaded = useAppSelector((state) => state.theme.isLoaded);

  const activeColors = themeColors[theme === 'dark' || theme === 'amoled' ? 'dark' : 'light'];

  useEffect(() => {
    loadApiBaseUrl()
      .catch(() => console.warn("Failed to load API base URL, using default"))
      .finally(() => {
        dispatch(loadThemeSettings());
        dispatch(bootstrapAuthThunk());
        registerForPushNotificationsAsync().catch(console.warn);
      });
  }, [dispatch]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View className={`flex-1 ${theme === 'dark' || theme === 'amoled' ? 'dark' : ''} ${theme === 'amoled' ? 'amoled' : ''} theme-${styleMode}`}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: activeColors.background },
            headerTintColor: activeColors.foreground,
          }}>
            <Stack.Screen name="Home" component={PublicHomeScreen} options={{ title: 'Valor Fitness', headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Staff Login' }} />

            <Stack.Screen name="MemberLogin" component={MemberLoginScreen} options={{ title: 'Member Login' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', headerBackVisible: false }} />
            <Stack.Screen name="MemberAccount" component={MemberAccountScreen} options={{ title: 'My Account' }} />
            <Stack.Screen name="Memberships" component={MembershipsScreen} options={{ title: 'Memberships' }} />
            <Stack.Screen name="Plans" component={PlansScreen} options={{ title: 'Plans' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
            <Stack.Screen name="Members" component={MembersScreen} options={{ title: 'Members' }} />
            <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
            <Stack.Screen name="Staff" component={StaffScreen} options={{ title: 'Staff' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
            <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
            <Stack.Screen name="Inquiries" component={InquiriesScreen} options={{ title: 'Inquiries' }} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Features" component={FeaturesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DownloadApp" component={DownloadAppScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
        <Toaster />
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <RootApp />
      </Provider>
    </ErrorBoundary>
  );
}
