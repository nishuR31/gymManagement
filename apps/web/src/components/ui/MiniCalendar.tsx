import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export function MiniCalendar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const day = time.toLocaleDateString("en-US", { weekday: "short" });
  const date = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="inline-flex items-center gap-4 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-primary" />
        <span className="font-semibold">{day}, {date}</span>
      </div>
      <div className="h-4 w-px bg-border/50" />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <span className="font-medium text-muted-foreground tabular-nums">{timeStr}</span>
      </div>
    </div>
  );
}
