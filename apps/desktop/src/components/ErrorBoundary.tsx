import { Component, type ErrorInfo, type ReactNode } from "react";
import { tx } from "../i18n/index.ts";
import { Button, ErrorState } from "./ui/index.ts";

type Props = {
  /** What to show instead of the crashed part; `reset` renders the children again. */
  fallback: (reset: () => void) => ReactNode;
  children: ReactNode;
  /** Change it (e.g. the screen id) to clear a crash when the user moves on. */
  resetKey?: string;
};
type State = { failed: boolean; resetKey: string | undefined };

/**
 * Catches render crashes so staff never see a blank window (master prompt Track B; DN-065).
 * Error details go to the console only: they may contain student data, and there is no
 * error-reporting service yet.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Moving to another screen clears the crash.
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("EduSuite screen crashed", error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}

/** In place of one tool screen: the header and sidebar keep working. */
export function ScreenCrashed({ onRetry, onHome }: { onRetry: () => void; onHome: () => void }) {
  return (
    <div className="space-y-4" role="alert">
      <ErrorState
        title={tx("यह स्क्रीन नहीं खुल पाई")}
        message={tx("कुछ गलत हो गया। फिर से कोशिश करें; बिना सेव किया काम खो सकता है। समस्या बनी रहे तो डैशबोर्ड पर जाकर फिर खोलें।")}
        onRetry={onRetry}
        retryLabel={tx("फिर से कोशिश करें")}
      />
      <Button onClick={onHome}>{tx("डैशबोर्ड पर जाएँ")}</Button>
    </div>
  );
}

/** Last resort for the whole window. */
export function AppCrashed() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-page p-6">
      <div className="max-w-md space-y-4" role="alert">
        <ErrorState
          title={tx("ऐप में कुछ गलत हो गया")}
          message={tx("ऐप दोबारा लोड करें। आपका सेव किया काम सर्वर पर सुरक्षित है।")}
          onRetry={() => window.location.reload()}
          retryLabel={tx("ऐप दोबारा लोड करें")}
        />
      </div>
    </div>
  );
}
