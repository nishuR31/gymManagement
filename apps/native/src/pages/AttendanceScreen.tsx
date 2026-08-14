import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Search, LogOut, UserRound, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as attendanceApi from '../features/attendance/attendanceApi';
import type { AttendanceDto, DailyAttendanceDto, MonthlyAttendanceDto } from '@gym/shared';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTime } from '../utils/format';

export function AttendanceScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [currentAttendances, setCurrentAttendances] = useState<AttendanceDto[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceDto | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [disambiguationMatches, setDisambiguationMatches] = useState<attendanceApi.DisambiguationMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [current, daily] = await Promise.all([
        attendanceApi.listCurrent(),
        attendanceApi.getDailyAttendance(today)
      ]);
      setCurrentAttendances(current);
      setDailyStats(daily);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load attendance data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async (queryOverride?: string): Promise<void> => {
    const query = queryOverride ?? searchQuery.trim();
    if (!query) return;

    setIsCheckingIn(true);
    try {
      const result = await attendanceApi.checkIn({ query });
      if (result.matches) {
        setDisambiguationMatches(result.matches);
      } else if (result.attendance) {
        Toast.show({ type: 'success', text1: `Checked in ${result.attendance.member.firstName}` });
        setSearchQuery("");
        setDisambiguationMatches([]);
        loadData();
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getApiErrorMessage(error, "Check-in failed") });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId: string, memberName: string): Promise<void> => {
    try {
      await attendanceApi.checkOut({ attendanceId });
      Toast.show({ type: 'success', text1: `Checked out ${memberName}` });
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: getApiErrorMessage(error, "Check-out failed") });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Front Desk</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Attendance</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Manage check-ins and active members</Text>
          
          <View className="flex-row gap-2 mt-2">
            <View className="flex-1 relative justify-center">
              <Input
                placeholder="Search name, phone, or ID"
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={!isCheckingIn}
                className="pl-10"
              />
              <View className="absolute left-3 top-3">
                <Search size={16} color={activeColors.mutedForeground} />
              </View>
            </View>
            <Button onPress={() => handleCheckIn()} disabled={isCheckingIn || !searchQuery.trim()} className="mt-0 h-10 px-4">
              <Text className="text-primary-foreground font-bold text-sm">Check In</Text>
            </Button>
          </View>
        </View>

        <View className="flex-row gap-4 mb-4">
          <Card className="flex-1">
            <CardContent className="p-4">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Total Visits</Text>
              <Text className="mt-2 text-3xl font-black text-foreground">{dailyStats?.count ?? 0}</Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Currently Active</Text>
              <Text className="mt-2 text-3xl font-black text-foreground">{currentAttendances.length}</Text>
            </CardContent>
          </Card>
        </View>

        <Card className="mb-4">
          <CardHeader className="flex-row justify-between items-center px-4 py-4 border-b border-border">
            <CardTitle>Currently In Gym</CardTitle>
            <View className="flex-row items-center bg-primary/10 px-2 py-1 rounded-full">
              <View className="w-2 h-2 rounded-full bg-primary mr-2" />
              <Text className="text-primary font-bold text-xs">{currentAttendances.length} Active</Text>
            </View>
          </CardHeader>
          <CardContent className="p-4">
            {currentAttendances.length === 0 ? (
              <View className="items-center py-6">
                <Users size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">Gym is empty</Text>
                <Text className="text-sm text-muted-foreground">No members are currently checked in.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {currentAttendances.map((attendance) => (
                  <View key={attendance.id} className="flex-row items-center justify-between p-3 rounded-md border border-border bg-card">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <UserRound size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-sm" numberOfLines={1}>
                          {attendance.member.firstName} {attendance.member.lastName}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">
                          {formatDateTime(attendance.checkInAt)} · {attendance.checkInMethod}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleCheckOut(attendance.id, attendance.member.firstName)} className="bg-secondary px-3 py-2 rounded-md flex-row items-center">
                      <LogOut size={14} color={activeColors.foreground} className="mr-2" />
                      <Text className="text-foreground font-bold text-xs">Check Out</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={disambiguationMatches.length > 0} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-card rounded-lg p-4 shadow-lg border border-border">
            <Text className="text-lg font-bold text-foreground mb-2">Multiple Members Found</Text>
            <Text className="text-sm font-semibold text-muted-foreground mb-4">Select the correct member to check in:</Text>
            
            <View className="gap-3 max-h-80">
              <ScrollView>
                {disambiguationMatches.map(match => (
                  <TouchableOpacity
                    key={match.id}
                    onPress={() => handleCheckIn(match.memberCode)}
                    className="flex-row items-center justify-between p-3 rounded-md border border-border mb-2"
                  >
                    <View>
                      <Text className="font-bold text-foreground">{match.firstName} {match.lastName}</Text>
                      <Text className="text-xs font-semibold text-muted-foreground">{match.phone}</Text>
                    </View>
                    <Text className="text-xs font-black text-primary">{match.memberCode}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Button variant="outline" onPress={() => setDisambiguationMatches([])} className="mt-4">
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
