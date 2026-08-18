import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private clearCacheAndReload = async () => {
    try {
      const theme = await AsyncStorage.getItem('gymos-theme');
      const baseUrl = await AsyncStorage.getItem('api-base-url');
      
      await AsyncStorage.clear();
      
      if (theme) await AsyncStorage.setItem('gymos-theme', theme);
      if (baseUrl) await AsyncStorage.setItem('api-base-url', baseUrl);
      
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (e) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center p-6 bg-background">
          <View className="w-full max-w-md p-8 items-center bg-card rounded-xl border border-border shadow-sm">
            <Text className="text-2xl font-black text-foreground mb-4 text-center">Something went wrong</Text>
            <Text className="text-sm font-semibold text-muted-foreground text-center mb-6">
              The application encountered an unexpected error. If this persists, it may be due to a stale cache from a recent update.
            </Text>
            
            <TouchableOpacity 
              className="bg-primary rounded-md px-6 py-3 items-center w-full mb-4"
              onPress={this.clearCacheAndReload}
            >
              <Text className="text-primary-foreground font-bold text-center">Clear Cache & Reload App</Text>
            </TouchableOpacity>
            
            <ScrollView className="w-full mt-4 bg-muted p-4 rounded-md border border-border" style={{ maxHeight: 200 }}>
              <Text className="text-xs text-muted-foreground font-mono">
                {this.state.error ? String(this.state.error) : null}
              </Text>
              <Text className="text-xs text-muted-foreground font-mono mt-2">
                {this.state.errorInfo ? String(this.state.errorInfo.componentStack) : null}
              </Text>
            </ScrollView>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
