import { Button } from "../ui/button";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-3">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function SuccessState({ message }: { message: string }) {
  return <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>;
}
