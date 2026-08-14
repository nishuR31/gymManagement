import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { APP_NAME } from '../utils/env';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutThunk } from '../features/auth/authSlice';
import { Button } from '../components/ui/Button';
import { User, LogOut, Activity, CreditCard, Dumbbell, Settings } from 'lucide-react-native';
import { isAdminRole } from '../utils/roles';
import { FloatingDock } from '../components/layout/FloatingDock';

import { themeColors } from '../constants/colors';

export function DashboardScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const theme = useAppSelector((state) => state.theme.theme);
  const dispatch = useAppDispatch();

  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const handleLogout = () => {
    dispatch(logoutThunk());
    navigation.replace("Home");
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
            <Text className="text-muted-foreground">Welcome back, {user?.email || "User"}!</Text>
          </View>
          <Button variant="ghost" size="icon" onPress={handleLogout}>
            <LogOut size={24} color={activeColors.foreground} />
          </Button>
        </View>

        <Card className="mb-4">
          <CardHeader className="flex-row items-center space-x-2">
            <Activity size={24} color={activeColors.primary} />
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-foreground mb-4">This is your {APP_NAME} command center.</Text>
            <View className="gap-2">
              <TouchableOpacity className="flex-row items-center gap-3 p-3 rounded-md bg-secondary" onPress={() => navigation.navigate('MemberAccount', { mode: 'profile' })}>
                <User size={20} color={activeColors.primary} />
                <Text className="text-foreground font-medium">My Account</Text>
              </TouchableOpacity>
              
              {isAdminRole(user?.role) && (
                <>
                  <TouchableOpacity className="flex-row items-center gap-3 p-3 rounded-md bg-secondary" onPress={() => navigation.navigate('Memberships')}>
                    <CreditCard size={20} color={activeColors.primary} />
                    <Text className="text-foreground font-medium">Memberships</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-row items-center gap-3 p-3 rounded-md bg-secondary" onPress={() => navigation.navigate('Plans')}>
                    <Dumbbell size={20} color={activeColors.primary} />
                    <Text className="text-foreground font-medium">Workout & Diet Plans</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-row items-center gap-3 p-3 rounded-md bg-secondary" onPress={() => navigation.navigate('Settings')}>
                    <Settings size={20} color={activeColors.primary} />
                    <Text className="text-foreground font-medium">Settings</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </CardContent>
        </Card>

      </ScrollView>
      <FloatingDock />
    </SafeAreaView>
  );
}
