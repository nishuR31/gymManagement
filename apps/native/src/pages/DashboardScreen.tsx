import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { APP_NAME } from '../utils/env';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutThunk } from '../features/auth/authSlice';
import { Button } from '../components/ui/Button';
import { User, LogOut, Activity } from 'lucide-react-native';

export function DashboardScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logoutThunk());
    navigation.replace("Home");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
            <Text className="text-muted-foreground">Welcome back, {user?.email || "User"}!</Text>
          </View>
          <Button variant="ghost" size="icon" onPress={handleLogout}>
            <LogOut size={24} color="hsl(var(--foreground))" />
          </Button>
        </View>

        <Card className="mb-4">
          <CardHeader className="flex-row items-center space-x-2">
            <Activity size={24} color="hsl(var(--primary))" />
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-foreground">This is your {APP_NAME} command center.</Text>
            <Text className="text-muted-foreground mt-2">More features coming soon...</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center space-x-2">
            <User size={24} color="hsl(var(--primary))" />
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-foreground font-medium">Email: {user?.email}</Text>
            <Text className="text-foreground font-medium mt-1">Role: {user?.role}</Text>
          </CardContent>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
