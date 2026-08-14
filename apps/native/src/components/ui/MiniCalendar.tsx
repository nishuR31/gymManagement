import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { useAppSelector } from '../../store/hooks';
import { themeColors } from '../../constants/colors';

export function MiniCalendar() {
  const [time, setTime] = useState(new Date());
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][time.getDay()];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][time.getMonth()];
  const date = `${month} ${time.getDate()}`;
  
  let hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes} ${ampm}`;

  return (
    <View className="flex-row items-center justify-center self-start gap-4 rounded-full border border-border/50 bg-background/50 px-4 py-2 shadow-sm">
      <View className="flex-row items-center gap-2">
        <CalendarIcon size={16} color={activeColors.primary} />
        <Text className="font-semibold text-foreground text-sm">{day}, {date}</Text>
      </View>
      <View className="w-[1px] h-4 bg-border/50" />
      <View className="flex-row items-center gap-2">
        <Clock size={16} color={activeColors.primary} />
        <Text className="font-medium text-muted-foreground text-sm">{timeStr}</Text>
      </View>
    </View>
  );
}
