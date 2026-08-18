import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Search, LogOut, UserRound, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as attendanceApi from '../features/attendance/attendanceApi';
import type { AttendanceDto, DailyAttendanceDto } from '@gym/shared';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTime } from '../utils/format';

export function AttendanceScreen() {
  const { colors } = useTheme();

  const [currentAttendances, setCurrentAttendances] = useState<AttendanceDto[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [disambiguationMatches, setDisambiguationMatches] = useState<
    attendanceApi.DisambiguationMatch[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [current, daily] = await Promise.all([
        attendanceApi.listCurrent(),
        attendanceApi.getDailyAttendance(today),
      ]);
      setCurrentAttendances(current);
      setDailyStats(daily);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load attendance data' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCheckIn = useCallback(
    async (queryOverride?: string): Promise<void> => {
      const query = queryOverride ?? searchQuery.trim();
      if (!query) return;
      setIsCheckingIn(true);
      try {
        const result = await attendanceApi.checkIn({ query });
        if (result.matches) {
          setDisambiguationMatches(result.matches);
        } else if (result.attendance) {
          Toast.show({
            type: 'success',
            text1: `Checked in ${result.attendance.member.firstName}`,
          });
          setSearchQuery('');
          setDisambiguationMatches([]);
          void loadData();
        }
      } catch (error) {
        Toast.show({ type: 'error', text1: getApiErrorMessage(error, 'Check-in failed') });
      } finally {
        setIsCheckingIn(false);
      }
    },
    [searchQuery, loadData],
  );

  const handleCheckOut = useCallback(
    async (attendanceId: string, memberName: string): Promise<void> => {
      try {
        await attendanceApi.checkOut({ attendanceId });
        Toast.show({ type: 'success', text1: `Checked out ${memberName}` });
        void loadData();
      } catch (error) {
        Toast.show({ type: 'error', text1: getApiErrorMessage(error, 'Check-out failed') });
      }
    },
    [loadData],
  );

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      {/* Header with embedded check-in bar */}
      <View className="mb-6 rounded-xl border border-border bg-card px-4 py-4">
        <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-1">
          Front Desk
        </Text>
        <Text className="text-3xl font-black text-foreground leading-tight mb-1">
          Attendance
        </Text>
        <Text className="text-sm font-semibold text-muted-foreground mb-4">
          Manage check-ins and active members
        </Text>

        {/* Check-in bar */}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              placeholder="Search name, phone, or ID"
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!isCheckingIn}
              leftIcon={<Search size={16} color={colors.mutedForeground} />}
            />
          </View>
          <Button
            onPress={() => handleCheckIn()}
            disabled={isCheckingIn || !searchQuery.trim()}
            isLoading={isCheckingIn}
            className="h-10 px-4 mt-0"
          >
            Check In
          </Button>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Total Visits
            </Text>
            <Text className="mt-2 text-3xl font-black text-foreground">
              {dailyStats?.count ?? 0}
            </Text>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Currently Active
            </Text>
            <Text className="mt-2 text-3xl font-black text-foreground">
              {currentAttendances.length}
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* Active members list */}
      <Card>
        <CardHeader className="flex-row justify-between items-center px-4 py-3 border-b border-border">
          <CardTitle>Currently In Gym</CardTitle>
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="flex-row items-center px-2 py-1 rounded-full"
          >
            <View
              style={{ backgroundColor: colors.primary }}
              className="w-2 h-2 rounded-full mr-2"
            />
            <Text style={{ color: colors.primary }} className="font-bold text-xs">
              {currentAttendances.length} Active
            </Text>
          </View>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <SkeletonRows rows={3} showAvatar />
          ) : currentAttendances.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Gym is empty"
              description="No members are currently checked in."
            />
          ) : (
            <View className="gap-3">
              {currentAttendances.map((attendance) => (
                <View
                  key={attendance.id}
                  className="flex-row items-center justify-between p-3 rounded-lg border border-border"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-full mr-3"
                    >
                      <UserRound size={20} color={colors.primary} />
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
                  <TouchableOpacity
                    onPress={() =>
                      handleCheckOut(attendance.id, attendance.member.firstName)
                    }
                    style={{ backgroundColor: colors.secondary }}
                    className="px-3 py-2 rounded-lg flex-row items-center gap-1.5"
                    activeOpacity={0.7}
                  >
                    <LogOut size={14} color={colors.foreground} />
                    <Text className="text-foreground font-bold text-xs">Check Out</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Disambiguation modal */}
      <Modal
        visible={disambiguationMatches.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setDisambiguationMatches([])}
        statusBarTranslucent
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setDisambiguationMatches([])}>
          <Pressable>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
                className="rounded-2xl p-5 border"
              >
                <Text className="text-lg font-black text-foreground mb-1">
                  Multiple Members Found
                </Text>
                <Text className="text-sm font-semibold text-muted-foreground mb-4">
                  Select the correct member to check in:
                </Text>

                <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {disambiguationMatches.map((match) => (
                      <TouchableOpacity
                        key={match.id}
                        onPress={() => handleCheckIn(match.memberCode)}
                        style={{ backgroundColor: colors.secondary }}
                        className="flex-row items-center justify-between p-3 rounded-xl"
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text className="font-bold text-foreground">
                            {match.firstName} {match.lastName}
                          </Text>
                          <Text className="text-xs font-semibold text-muted-foreground">
                            {match.phone}
                          </Text>
                        </View>
                        <Text style={{ color: colors.primary }} className="text-xs font-black">
                          {match.memberCode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Button
                  variant="outline"
                  onPress={() => setDisambiguationMatches([])}
                  className="mt-4"
                >
                  Cancel
                </Button>
              </View>
            </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}
