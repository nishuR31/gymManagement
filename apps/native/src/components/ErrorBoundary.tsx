import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';

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

  public render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#f8d7da' }}>
          <Text style={{ fontSize: 20, color: '#721c24', fontWeight: 'bold', marginBottom: 10 }}>Oops, something went wrong.</Text>
          <ScrollView style={{ flex: 1, width: '100%' }}>
            <Text style={{ color: '#721c24', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</Text>
            <Text style={{ color: '#721c24', marginTop: 10 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</Text>
          </ScrollView>
          <Button title="Try Again" onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })} />
        </View>
      );
    }

    return this.props.children;
  }
}
