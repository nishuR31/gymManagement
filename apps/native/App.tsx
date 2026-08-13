// @ts-expect-error NativeWind css import
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

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }: any) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-primary text-2xl font-bold">Valor Fitness</Text>
      <Text className="text-muted-foreground mt-2 mb-6">Welcome to the Native App!</Text>
      <Button onPress={() => navigation.navigate("Login")}>
        Login to Account
      </Button>
    </View>
  );
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: 'hsl(var(--background))' },
          headerTintColor: 'hsl(var(--foreground))',
        }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Valor Fitness' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', headerBackVisible: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
