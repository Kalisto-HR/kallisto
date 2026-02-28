// @ts-nocheck
import React, { useState } from 'react';
import { Settings, Bell, Shield, Database, Mail, Globe } from 'lucide-react';

interface SuperuserSettingsProps {
  settings?: Record<string, Record<string, unknown>>;
  onSave?: (payload: Record<string, Record<string, unknown>>) => Promise<void> | void;
}

export default function SuperuserSettings({ settings, onSave }: SuperuserSettingsProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(Boolean(settings?.maintenance_mode?.enabled ?? false));
  const [newUserRegistration, setNewUserRegistration] = useState(Boolean(settings?.new_user_registration?.enabled ?? true));
  const [applicationSubmissions, setApplicationSubmissions] = useState(Boolean(settings?.application_submissions?.enabled ?? true));
  const [sessionTimeout, setSessionTimeout] = useState(String(settings?.session_timeout_minutes?.value ?? 60));
  const [require2FA, setRequire2FA] = useState(Boolean(settings?.require_2fa_superuser?.enabled ?? true));
  const [notifyDrafts, setNotifyDrafts] = useState(Boolean(settings?.notify_drafts?.enabled ?? true));
  const [notifySecurity, setNotifySecurity] = useState(Boolean(settings?.notify_security?.enabled ?? true));
  const [notifyDailySummary, setNotifyDailySummary] = useState(Boolean(settings?.notify_daily_summary?.enabled ?? true));
  const [notificationEmail, setNotificationEmail] = useState(String(settings?.notification_email?.value ?? "superadmin@damen.com"));

  const handleSave = async () => {
    const payload = {
      maintenance_mode: { enabled: maintenanceMode },
      new_user_registration: { enabled: newUserRegistration },
      application_submissions: { enabled: applicationSubmissions },
      session_timeout_minutes: { value: Number(sessionTimeout || "60") },
      require_2fa_superuser: { enabled: require2FA },
      notify_drafts: { enabled: notifyDrafts },
      notify_security: { enabled: notifySecurity },
      notify_daily_summary: { enabled: notifyDailySummary },
      notification_email: { value: notificationEmail },
    };

    if (onSave) {
      await onSave(payload);
      alert("Settings saved.");
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Settings</h1>
        <p className="text-[#737373]">
          Configure platform settings and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Platform Configuration */}
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-[#171717]">Platform Configuration</h2>
                <p className="text-sm text-[#737373] mt-0.5">General platform settings</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">Maintenance Mode</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Temporarily disable platform access for maintenance
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">New User Registration</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Allow new users to register accounts
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={newUserRegistration} onChange={(e) => setNewUserRegistration(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">Application Submissions</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Allow users to submit new applications
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={applicationSubmissions} onChange={(e) => setApplicationSubmissions(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-[#171717]">Security Settings</h2>
                <p className="text-sm text-[#737373] mt-0.5">Authentication and security options</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block font-medium text-[#171717] mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              />
              <p className="text-sm text-[#737373] mt-1">
                Automatically log out users after this period of inactivity
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">Two-Factor Authentication</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Require 2FA for all superuser accounts
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={require2FA} onChange={(e) => setRequire2FA(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-[#171717] mb-2">
                IP Whitelist (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Enter IP addresses (one per line)&#10;192.168.1.0/24&#10;10.0.0.0/8"
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
              />
              <p className="text-sm text-[#737373] mt-1">
                Restrict superuser access to specific IP addresses or ranges
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-[#171717]">Notification Settings</h2>
                <p className="text-sm text-[#737373] mt-0.5">Configure alert preferences</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">New Draft Requests</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Notify when new drafts require approval
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifyDrafts} onChange={(e) => setNotifyDrafts(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">Security Alerts</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Notify about suspicious activities or security events
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifySecurity} onChange={(e) => setNotifySecurity(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#171717]">Daily Summary</div>
                <div className="text-sm text-[#737373] mt-0.5">
                  Receive daily platform activity summary
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifyDailySummary} onChange={(e) => setNotifyDailySummary(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717]"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-[#171717] mb-2">
                Notification Email
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-[#171717]">Data & Backup</h2>
                <p className="text-sm text-[#737373] mt-0.5">Database and backup settings</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block font-medium text-[#171717] mb-2">
                Automatic Backup Schedule
              </label>
              <select className="w-full max-w-xs px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                <option value="daily">Daily at 2:00 AM</option>
                <option value="hourly">Every Hour</option>
                <option value="weekly">Weekly (Sunday 2:00 AM)</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#171717] mb-2">
                Backup Retention Period
              </label>
              <select className="w-full max-w-xs px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors">
                Create Manual Backup
              </button>
              <button className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors">
                Restore from Backup
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button className="px-6 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors">
            Reset to Defaults
          </button>
          <button
            onClick={() => void handleSave()}
            className="px-6 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

