import { ErrorState } from "../../../components/ui/ErrorState";

export function ServiceUnavailablePage({ error, onRetry, retrying = false }: { error?: unknown; onRetry: () => void; retrying?: boolean }) {
  return <ErrorState error={error} variant="service_unavailable" onRetry={onRetry} retrying={retrying} />;
}
