import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Lock,
  Mail,
  Save,
  Shield,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessState,
} from "../../components/common/PageState";
import {
  fetchStudentPhotoUrl,
  fetchStudentProfile,
  updateStudentPassword,
  updateStudentProfile,
  uploadStudentPhoto,
} from "../../services/client/profileService";
import type { Profile } from "../../types/domain";

function getInitials(firstName: string, lastName: string): string {
  const first = firstName[0] ?? "";
  const last = lastName[0] ?? "";
  return `${first}${last}`.toUpperCase() || "ST";
}

export function StudentSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("partners");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStudentProfile();
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);

        const profileData = data.data ?? {};
        const notifications =
          typeof profileData.notifications === "object" && profileData.notifications !== null
            ? (profileData.notifications as Record<string, unknown>)
            : {};
        const privacy =
          typeof profileData.privacy === "object" && profileData.privacy !== null
            ? (profileData.privacy as Record<string, unknown>)
            : {};

        setBio(typeof profileData.bio === "string" ? profileData.bio : "");
        setEmailNotifications(typeof notifications.email === "boolean" ? notifications.email : true);
        setPushNotifications(typeof notifications.push === "boolean" ? notifications.push : true);
        const visibility =
          privacy.profileVisibility === "private" || privacy.profileVisibility === "partners"
            ? privacy.profileVisibility
            : "partners";
        setProfileVisibility(visibility);

        const fetchedPhotoUrl = await fetchStudentPhotoUrl();
        setPhotoUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return fetchedPhotoUrl;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStudentProfile({
        firstName,
        lastName,
        data: { bio },
      });

      setProfile((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          firstName,
          lastName,
          data: {
            ...(current.data ?? {}),
            bio,
          },
        };
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotifications(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStudentProfile({
        data: {
          notifications: {
            email: emailNotifications,
            push: pushNotifications,
          },
        },
      });
      setProfile((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          data: {
            ...(current.data ?? {}),
            notifications: {
              email: emailNotifications,
              push: pushNotifications,
            },
          },
        };
      });
      setSuccess("Notification preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification preferences");
    } finally {
      setSavingNotifications(false);
    }
  };

  const savePrivacy = async () => {
    setSavingPrivacy(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStudentProfile({
        data: {
          privacy: {
            profileVisibility,
          },
        },
      });
      setProfile((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          data: {
            ...(current.data ?? {}),
            privacy: {
              profileVisibility,
            },
          },
        };
      });
      setSuccess("Privacy settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save privacy settings");
    } finally {
      setSavingPrivacy(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword.trim()) {
      setError("Current password is required.");
      setSuccess(null);
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required.");
      setSuccess(null);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setSuccess(null);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      setSuccess(null);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New password confirmation does not match.");
      setSuccess(null);
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStudentPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccess("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadPhoto = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo file exceeds 2MB limit.");
      setSuccess(null);
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      await uploadStudentPhoto(file);
      const fetchedPhotoUrl = await fetchStudentPhotoUrl();
      setPhotoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return fetchedPhotoUrl;
      });
      setSuccess("Profile photo updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error && !profile) return <ErrorState message={error} />;
  if (!profile) {
    return <EmptyState title="Profile unavailable" description="No settings data found." />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </section>
      {error ? <ErrorState message={error} /> : null}
      {success ? <SuccessState message={success} /> : null}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  {photoUrl ? <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-2xl text-white">
                    {getInitials(firstName, lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void uploadPhoto(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploadingPhoto ? "Uploading..." : "Upload photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG, or WEBP. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" value={profile.email} disabled className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setFirstName(profile.firstName);
                  setLastName(profile.lastName);
                  setBio(typeof profile.data?.bio === "string" ? profile.data.bio : "");
                  setSuccess(null);
                  setError(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={() => void saveProfile()} disabled={savingProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password and Sessions</CardTitle>
              <CardDescription>
                Update your password securely using your current credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void savePassword()} disabled={savingPassword}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control your notification channels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Application updates and reminders.
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Push notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Alerts on supported devices.
                  </div>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
              <p className="text-xs text-muted-foreground">
                Changes are saved to your account profile.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => void saveNotifications()} disabled={savingNotifications}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingNotifications ? "Saving..." : "Save preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can view your profile in partner workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-visibility">Profile visibility</Label>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger id="profile-visibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partners">Visible to partner institutions</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border p-3">
                <div>
                  <div className="font-medium">Data controls</div>
                  <div className="text-sm text-muted-foreground">
                    Data export and account deletion are still handled by support.
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void savePrivacy()} disabled={savingPrivacy}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingPrivacy ? "Saving..." : "Save privacy settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
