import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Herkent de fout die ontstaat wanneer de browser een verouderde versie van de
 * gebundelde modules heeft (bijv. na een wijziging in de bouwconfiguratie): dan
 * wijzen React's interne waarden in die modules naar null en crasht de pagina.
 */
const STALE_BUNDLE_PATTERNS = [
  /Cannot read properties of null \(reading '(useRef|useState|useEffect|useMemo|useCallback|useContext|createRef)'\)/,
  /Failed to fetch dynamically imported module/,
  /Importing a module script failed/,
  /error loading dynamically imported module/i,
];

export function isStaleBundleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return STALE_BUNDLE_PATTERNS.some(pattern => pattern.test(message));
}

// Eén automatische herlaadbeurt per browsersessie, zodat een echte fout never in een loop belandt.
const RELOAD_FLAG = "lastonesleft:stale-bundle-reloaded";

function hasReloadedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    return false;
  }
}

function markReloadedThisSession(): void {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* opslag niet beschikbaar: geen automatische herlaadbeurt */
  }
}

/**
 * App-level error boundary. Vangt runtime crashes in de React-tree zodat
 * gebruikers geen blank screen zien, maar een nette fallback met retry-knop.
 *
 * Geen externe monitoring (geen Sentry) — voor MVP loggen we alleen naar
 * de browser console (zichtbaar in Lovable Cloud / dev tools).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Geen secrets/tokens in de error tree verwacht; alleen voor debugging.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold">Er ging iets mis</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            De pagina kon niet worden geladen. Probeer het opnieuw of ga terug naar de homepagina.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={this.handleReset} variant="outline">
              Probeer opnieuw
            </Button>
            <Button onClick={this.handleReload}>Pagina herladen</Button>
          </div>
          <a
            href="/"
            className="mt-4 inline-block text-sm text-muted-foreground underline hover:text-foreground"
          >
            Terug naar home
          </a>
        </div>
      </div>
    );
  }
}
