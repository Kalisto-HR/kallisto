import { Button } from "../ui/button";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-5">
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
    <div className="rounded-lg border bg-card p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function UnavailableState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SuccessState({ message }: { message: string }) {
  return <div className="rounded-lg border border-success/20 bg-success/8 p-4 text-sm text-success">{message}</div>;
}
