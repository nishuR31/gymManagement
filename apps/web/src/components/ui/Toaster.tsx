import { Toaster as Sonner } from "sonner";
import { useAppSelector } from "../../store/hooks";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  // If we wanted to listen to the theme to dynamically switch sonner's internal theme
  const theme = useAppSelector((state) => state.theme.theme);

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      position="top-right"
      swipeDirections={["left", "right", "bottom", "top"]}
      visibleToasts={3}
      hotkey={["c", "C"]}
      expand={true}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:card-base group-[.toaster]:shadow-lg group-[.toaster]:p-4 group-[.toaster]:flex group-[.toaster]:gap-3 group-[.toaster]:w-full group-[.toaster]:items-start",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:btn-primary group-[.toast]:h-8 group-[.toast]:px-3 group-[.toast]:text-xs",
          cancelButton: "group-[.toast]:btn-secondary group-[.toast]:h-8 group-[.toast]:px-3 group-[.toast]:text-xs",
          closeButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-accent hover:group-[.toast]:text-accent-foreground group-[.toast]:border-border",
          error: "group-[.toaster]:border-destructive group-[.toaster]:text-destructive",
          success: "group-[.toaster]:border-green-500 group-[.toaster]:text-green-600 dark:group-[.toaster]:text-green-400",
          warning: "group-[.toaster]:border-yellow-500 group-[.toaster]:text-yellow-600 dark:group-[.toaster]:text-yellow-400",
          info: "group-[.toaster]:border-blue-500 group-[.toaster]:text-blue-600 dark:group-[.toaster]:text-blue-400",
        },
      }}
      {...props}
    />
  );
}
