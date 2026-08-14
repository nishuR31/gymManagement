import Toast from 'react-native-toast-message';
import { View, Text } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

export function Toaster() {
  const toastConfig = {
    success: (props: any) => (
      <View className="bg-zinc-900 border border-zinc-800 shadow-lg p-4 flex-row items-center w-11/12 rounded-xl mt-4">
        <CheckCircle2 size={20} color="#10b981" />
        <View className="flex-1 ml-3">
          <Text className="text-zinc-100 font-semibold text-[15px]">{props.text1}</Text>
          {props.text2 ? <Text className="text-zinc-400 text-sm mt-0.5">{props.text2}</Text> : null}
        </View>
      </View>
    ),
    error: (props: any) => (
      <View className="bg-zinc-900 border border-zinc-800 shadow-lg p-4 flex-row items-center w-11/12 rounded-xl mt-4">
        <AlertCircle size={20} color="#ef4444" />
        <View className="flex-1 ml-3">
          <Text className="text-zinc-100 font-semibold text-[15px]">{props.text1}</Text>
          {props.text2 ? <Text className="text-zinc-400 text-sm mt-0.5">{props.text2}</Text> : null}
        </View>
      </View>
    ),
    info: (props: any) => (
      <View className="bg-zinc-900 border border-zinc-800 shadow-lg p-4 flex-row items-center w-11/12 rounded-xl mt-4">
        <Info size={20} color="#3b82f6" />
        <View className="flex-1 ml-3">
          <Text className="text-zinc-100 font-semibold text-[15px]">{props.text1}</Text>
          {props.text2 ? <Text className="text-zinc-400 text-sm mt-0.5">{props.text2}</Text> : null}
        </View>
      </View>
    )
  };

  return <Toast config={toastConfig} />;
}
