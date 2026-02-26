// @ts-nocheck
import { Shield } from 'lucide-react';
import { Button } from '../ui/button';

interface AccessDeniedProps {
  onBackToDashboard: () => void;
}

export function AccessDenied({ onBackToDashboard }: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-xl border p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to view this page. This area may be restricted to certain roles or require a specific university context.
        </p>
        <Button onClick={onBackToDashboard} className="w-full">
          Go back to Dashboard
        </Button>
      </div>
    </div>
  );
}

