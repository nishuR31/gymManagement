import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

export function MiniCalendar() {
  const [time, setTime] = useState(new Date());
  const { isDark } = useTheme();

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

  const primaryColor = isDark ? '#E50000' : '#E50000'; // Assuming valor brand color
  const foregroundColor = isDark ? '#FAFAFA' : '#09090B';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';

  return (
    <View className="flex-row items-center justify-center self-start gap-4 rounded-full border border-border/80 bg-background/80 px-4 py-2 shadow-sm">
      <View className="flex-row items-center gap-2">
        <CalendarIcon size={16} color={primaryColor} />
        <Text className="font-semibold text-sm text-foreground">{day}, {date}</Text>
      </View>
      <View className="w-[1px] h-4 bg-border/80" />
      <View className="flex-row items-center gap-2">
        <Clock size={16} color={primaryColor} />
        <Text className="font-medium text-sm text-muted-foreground">{timeStr}</Text>
      </View>
    </View>
  );
}
