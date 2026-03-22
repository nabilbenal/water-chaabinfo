import React, { Component, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  children: ReactNode;
  height?: number;
}

interface State {
  hasError: boolean;
}

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2"
          style={{ height: this.props.height ?? 220 }}
        >
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Carte indisponible</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-primary underline"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
