import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console with component context
    console.error(`ErrorBoundary caught an error in ${this.props.componentName || 'component'}:`, error);
    console.error("Component stack:", errorInfo.componentStack);
    
    this.setState({
      errorInfo
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-900/20 rounded-md text-white">
          <h2 className="text-xl font-bold mb-2">Something went wrong {this.props.componentName ? `in ${this.props.componentName}` : ''}</h2>
          <div className="mb-3 text-sm text-red-300">
            {this.state.error && this.state.error.toString()}
          </div>
          <details className="mb-2">
            <summary className="cursor-pointer text-red-300 text-sm">View detailed error stack</summary>
            <pre className="mt-2 p-2 bg-gray-800 text-xs overflow-auto rounded max-h-60">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <button
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 