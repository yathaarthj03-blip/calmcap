import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CalmCap Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('corridor.v1');
    } catch {
      // ignore
    }
    const cleanUrl = window.location.origin + window.location.pathname + '#/app/dashboard';
    window.location.href = cleanUrl;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121414] text-[#E7EFEB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1A1E1D] border border-[#2D3532] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Something interrupted CalmCap</h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                A saved setting or data state was incompatible. Click below to refresh with clean demo data.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-[11px] p-2.5 rounded bg-[#121414] border border-[#2D3532] text-amber-400/90 text-left overflow-auto max-h-28 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full h-11 rounded-xl bg-[#C5A350] hover:bg-[#B59340] text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset & Launch CalmCap Demo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
