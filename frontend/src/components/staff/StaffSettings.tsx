import { useState } from "react";
import { Bell, Database, Settings, Shield } from "lucide-react";
import { ErrorState, SuccessState, UnavailableState } from "../common/PageState";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

interface StaffSettingsProps {
  settings?: Record<string, Record<string, unknown>>;
  onSave?: (payload: Record<string, Record<string, unknown>>) => Promise<void> | void;
}

type SupportedSettingsDraft = {
  maintenanceMode: boolean;
  newUserRegistration: boolean;
  applicationSubmissions: boolean;
  sessionTimeout: string;
  require2FA: boolean;
  notifySecurity: boolean;
  notifyDailySummary: boolean;
  notificationEmail: string;
};

function draftFromSettings(settings?: Record<string, Record<string, unknown>>): SupportedSettingsDraft {
  return {
    maintenanceMode: Boolean(settings?.maintenance_mode?.enabled ?? false),
    newUserRegistration: Boolean(settings?.new_user_registration?.enabled ?? true),
    applicationSubmissions: Boolean(settings?.application_submissions?.enabled ?? true),
    sessionTimeout: String(settings?.session_timeout_minutes?.value ?? 60),
    require2FA: Boolean(settings?.require_2fa_superuser?.enabled ?? true),
    notifySecurity: Boolean(settings?.notify_security?.enabled ?? true),
    notifyDailySummary: Boolean(settings?.notify_daily_summary?.enabled ?? true),
    notificationEmail: String(settings?.notification_email?.value ?? "superstaff@kallisto.uz"),
  };
}

function disabledOperationCards() {
  return [
    {
      title: "IP whitelist",
      description: "Staff IP restriction is not wired into the backend yet.",
    },
    {
      title: "Backup schedule",
      description: "Automatic backup scheduling is not available in this release.",
    },
    {
      title: "Backup retention",
      description: "Backup retention policy management is not available in this release.",
    },
    {
      title: "Manual backup and restore",
      description: "Manual backup and restore actions are not connected to backend jobs.",
    },
    {
      title: "Reset to defaults",
      description: "Default-setting reset is not implemented yet.",
    },
  ];
}

export default function StaffSettings({ settings, onSave }: StaffSettingsProps) {
  const [draft, setDraft] = useState<SupportedSettingsDraft>(() => draftFromSettings(settings));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      await onSave({
        maintenance_mode: { enabled: draft.maintenanceMode },
        new_user_registration: { enabled: draft.newUserRegistration },
        application_submissions: { enabled: draft.applicationSubmissions },
        session_timeout_minutes: { value: Number(draft.sessionTimeout || "60") },
        require_2fa_superuser: { enabled: draft.require2FA },
        notify_security: { enabled: draft.notifySecurity },
        notify_daily_summary: { enabled: draft.notifyDailySummary },
        notification_email: { value: draft.notificationEmail.trim() },
      });
      setSaved(true);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure supported platform controls. Unsupported operations are shown separately as unavailable.
        </p>
      </section>

      {saveError ? <ErrorState message={saveError} /> : null}
      {saved ? <SuccessState message="Settings saved." /> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Platform configuration
            </CardTitle>
            <CardDescription>These settings persist through the live staff settings API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ToggleRow
              title="Maintenance mode"
              description="Temporarily disable platform access for maintenance."
              checked={draft.maintenanceMode}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, maintenanceMode: checked }))}
            />
            <ToggleRow
              title="New user registration"
              description="Allow new applicants to register accounts."
              checked={draft.newUserRegistration}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, newUserRegistration: checked }))}
            />
            <ToggleRow
              title="Application submissions"
              description="Allow applicants to submit new applications."
              checked={draft.applicationSubmissions}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, applicationSubmissions: checked }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Supported authentication and session controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={draft.sessionTimeout}
                onChange={(event) => setDraft((current) => ({ ...current, sessionTimeout: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Users are logged out after this period of inactivity.</p>
            </div>

            <ToggleRow
              title="Two-factor authentication"
              description="Require 2FA for staff accounts."
              checked={draft.require2FA}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, require2FA: checked }))}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Alert and summary preferences that are currently supported.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ToggleRow
              title="Security alerts"
              description="Notify staff about suspicious activity and security events."
              checked={draft.notifySecurity}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, notifySecurity: checked }))}
            />
            <ToggleRow
              title="Daily summary"
              description="Receive a daily platform activity summary."
              checked={draft.notifyDailySummary}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, notifyDailySummary: checked }))}
            />
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification email</Label>
              <Input
                id="notification-email"
                type="email"
                value={draft.notificationEmail}
                onChange={(event) => setDraft((current) => ({ ...current, notificationEmail: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Unavailable operations
            </CardTitle>
            <CardDescription>Visible for transparency, but not implemented in the backend yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disabledOperationCards().map((item) => (
              <UnavailableState key={item.title} title={item.title} description={item.description} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
      <div>
        <div className="font-medium text-foreground">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
