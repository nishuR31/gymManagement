import Toast from 'react-native-toast-message';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ToastBody({
  icon,
  borderColor,
  text1,
  text2,
}: {
  icon: React.ReactNode;
  borderColor: string;
  text1: string;
  text2?: string;
}) {
  return (
    <View className="w-full pl-4 pr-4 md:pr-8 items-end self-end max-w-sm" style={{ marginTop: 16 }}>
      <View
        style={{ borderColor }}
        className="bg-zinc-950 border shadow-2xl p-4 flex-row items-start w-full rounded-2xl"
      >
        <View className="mt-0.5">{icon}</View>
      <View className="flex-1 ml-3 mr-2">
        <Text className="text-zinc-100 font-semibold text-[15px]" numberOfLines={2}>
          {text1}
        </Text>
        {text2 ? (
          <Text className="text-zinc-400 text-sm mt-0.5" numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => Toast.hide()} className="p-1 -mr-2">
        <X size={16} color="#71717a" />
      </TouchableOpacity>
    </View>
    </View>
  );
}

export function Toaster() {
  const insets = useSafeAreaInsets();
  // Position toasts at the top right, accounting for the status bar
  const topOffset = insets.top > 0 ? insets.top : 16;

  const toastConfig = {
    success: (props: any) => (
      <ToastBody
        icon={<CheckCircle2 size={20} color="#10b981" />}
        borderColor="#10b98133"
        text1={props.text1}
        text2={props.text2}
      />
    ),
    error: (props: any) => (
      <ToastBody
        icon={<AlertCircle size={20} color="#ef4444" />}
        borderColor="#ef444433"
        text1={props.text1}
        text2={props.text2}
      />
    ),
    warning: (props: any) => (
      <ToastBody
        icon={<AlertTriangle size={20} color="#f59e0b" />}
        borderColor="#f59e0b33"
        text1={props.text1}
        text2={props.text2}
      />
    ),
    info: (props: any) => (
      <ToastBody
        icon={<Info size={20} color="#3b82f6" />}
        borderColor="#3b82f633"
        text1={props.text1}
        text2={props.text2}
      />
    ),
  };

  return (
    <Toast
      config={toastConfig}
      topOffset={topOffset}
      visibilityTime={3500}
      position="top"
    />
  );
}
