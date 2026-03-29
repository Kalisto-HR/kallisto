import { Button } from "../ui/button";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="brand-panel p-6 text-sm text-muted-foreground">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 space-y-3 shadow-[0_18px_38px_-30px_rgba(181,73,73,0.32)]">
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
    <div className="brand-panel p-6">
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
    <div className="brand-panel space-y-4 p-6">
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
  return <div className="rounded-xl border border-success/20 bg-success/8 p-4 text-sm text-success shadow-[0_18px_38px_-30px_rgba(47,122,89,0.32)]">{message}</div>;
}
