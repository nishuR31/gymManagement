import React from 'react';
import Toast from 'react-native-toast-message';
import { View, Text } from 'react-native';

export function Toaster() {
  const toastConfig = {
    success: (props: any) => (
      <View className="bg-background border-l-4 border-green-500 shadow-md p-4 flex-row items-center w-11/12 rounded-lg">
        <View className="flex-1">
          <Text className="text-foreground font-semibold">{props.text1}</Text>
          {props.text2 ? <Text className="text-muted-foreground text-sm mt-1">{props.text2}</Text> : null}
        </View>
      </View>
    ),
    error: (props: any) => (
      <View className="bg-background border-l-4 border-destructive shadow-md p-4 flex-row items-center w-11/12 rounded-lg">
        <View className="flex-1">
          <Text className="text-foreground font-semibold">{props.text1}</Text>
          {props.text2 ? <Text className="text-muted-foreground text-sm mt-1">{props.text2}</Text> : null}
        </View>
      </View>
    ),
    info: (props: any) => (
      <View className="bg-background border-l-4 border-blue-500 shadow-md p-4 flex-row items-center w-11/12 rounded-lg">
        <View className="flex-1">
          <Text className="text-foreground font-semibold">{props.text1}</Text>
          {props.text2 ? <Text className="text-muted-foreground text-sm mt-1">{props.text2}</Text> : null}
        </View>
      </View>
    )
  };

  return <Toast config={toastConfig} />;
}
