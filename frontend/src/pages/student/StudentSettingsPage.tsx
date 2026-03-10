import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Lock,
  Mail,
  Plus,
  Save,
  Shield,
  Trash2,
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
  createStudentTestScore,
  deleteStudentTestScore,
  fetchStudentTestScores,
  fetchStudentPhotoUrl,
  fetchStudentProfile,
  updateStudentTestScore,
  updateStudentPassword,
  updateStudentProfile,
  uploadStudentPhoto,
} from "../../services/client/profileService";
import type { Profile, StudentTestScore, StudentTestScoreType } from "../../types/domain";

function getInitials(firstName: string, lastName: string): string {
  const first = firstName[0] ?? "";
  const last = lastName[0] ?? "";
  return `${first}${last}`.toUpperCase() || "ST";
}

interface EditableTestScore {
  id: string | null;
  clientId: string;
  testType: StudentTestScoreType;
  otherTestName: string;
  score: string;
  outOf: string;
  takenOn: string;
  saving: boolean;
  deleting: boolean;
}

const TEST_SCORE_TYPES: Array<{ value: StudentTestScoreType; label: string }> = [
  { value: "IELTS", label: "IELTS" },
  { value: "SAT", label: "SAT" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "ACT", label: "ACT" },
  { value: "OTHER", label: "Other" },
];

function toEditableTestScore(item: StudentTestScore): EditableTestScore {
  return {
    id: item.id,
    clientId: item.id,
    testType: item.testType,
    otherTestName: item.otherTestName ?? "",
    score: Number.isFinite(item.score) ? String(item.score) : "",
    outOf: Number.isFinite(item.outOf) ? String(item.outOf) : "",
    takenOn: item.takenOn ?? "",
    saving: false,
    deleting: false,
  };
}

function createBlankTestScoreRow(): EditableTestScore {
  return {
    id: null,
    clientId: `tmp-${crypto.randomUUID()}`,
    testType: "IELTS",
    otherTestName: "",
    score: "",
    outOf: "",
    takenOn: "",
    saving: false,
    deleting: false,
  };
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
  const [testScores, setTestScores] = useState<EditableTestScore[]>([]);
  const [testScoresLoading, setTestScoresLoading] = useState(false);
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

        setTestScoresLoading(true);
        const scores = await fetchStudentTestScores();
        setTestScores(scores.map(toEditableTestScore));
        setTestScoresLoading(false);

        const fetchedPhotoUrl = await fetchStudentPhotoUrl();
        setPhotoUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return fetchedPhotoUrl;
        });
      } catch (err) {
        setTestScoresLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setTestScoresLoading(false);
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

  const updateTestScoreField = (
    clientId: string,
    key: keyof Pick<EditableTestScore, "testType" | "otherTestName" | "score" | "outOf" | "takenOn">,
    value: string,
  ) => {
    setTestScores((current) =>
      current.map((item) => {
        if (item.clientId !== clientId) {
          return item;
        }
        if (key === "testType") {
          const nextType = value as StudentTestScoreType;
          return {
            ...item,
            testType: nextType,
            otherTestName: nextType === "OTHER" ? item.otherTestName : "",
          };
        }
        return { ...item, [key]: value };
      }),
    );
  };

  const addNewTestScoreRow = () => {
    setSuccess(null);
    setError(null);
    setTestScores((current) => [...current, createBlankTestScoreRow()]);
  };

  const removeUnsavedTestScoreRow = (clientId: string) => {
    setTestScores((current) => current.filter((item) => item.clientId !== clientId));
  };

  const saveTestScore = async (item: EditableTestScore) => {
    const score = Number(item.score);
    const outOf = Number(item.outOf);
    if (!Number.isFinite(score) || score < 0) {
      setError("Score must be a valid number greater than or equal to 0.");
      setSuccess(null);
      return;
    }
    if (!Number.isFinite(outOf) || outOf <= 0) {
      setError("Out of must be a valid number greater than 0.");
      setSuccess(null);
      return;
    }
    if (score > outOf) {
      setError("Score must be less than or equal to out of.");
      setSuccess(null);
      return;
    }
    if (item.testType === "OTHER" && item.otherTestName.trim().length === 0) {
      setError("Specify the test name when type is Other.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setTestScores((current) =>
      current.map((row) => (row.clientId === item.clientId ? { ...row, saving: true } : row)),
    );

    try {
      const payload = {
        testType: item.testType,
        otherTestName: item.testType === "OTHER" ? item.otherTestName.trim() : null,
        score,
        outOf,
        takenOn: item.takenOn.trim() ? item.takenOn.trim() : null,
      };
      const saved = item.id
        ? await updateStudentTestScore(item.id, payload)
        : await createStudentTestScore(payload);

      setTestScores((current) =>
        current.map((row) => (row.clientId === item.clientId ? { ...toEditableTestScore(saved), saving: false } : row)),
      );
      setSuccess(item.id ? "Test score updated." : "Test score added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save test score");
      setTestScores((current) =>
        current.map((row) => (row.clientId === item.clientId ? { ...row, saving: false } : row)),
      );
    }
  };

  const removeTestScore = async (item: EditableTestScore) => {
    if (!item.id) {
      removeUnsavedTestScoreRow(item.clientId);
      return;
    }
    setError(null);
    setSuccess(null);
    setTestScores((current) =>
      current.map((row) => (row.clientId === item.clientId ? { ...row, deleting: true } : row)),
    );
    try {
      await deleteStudentTestScore(item.id);
      setTestScores((current) => current.filter((row) => row.clientId !== item.clientId));
      setSuccess("Test score removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test score");
      setTestScores((current) =>
        current.map((row) => (row.clientId === item.clientId ? { ...row, deleting: false } : row)),
      );
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
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

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-medium">Test Scores</h3>
                    <p className="text-sm text-muted-foreground">
                      Add standardized tests here. You can import these into applications.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addNewTestScoreRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add new
                  </Button>
                </div>

                {testScoresLoading ? (
                  <p className="text-sm text-muted-foreground">Loading test scores...</p>
                ) : null}

                {!testScoresLoading && testScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No test scores yet. Click Add new to add your first score.
                  </p>
                ) : null}

                {testScores.map((item) => (
                  <div key={item.clientId} className="space-y-3 rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Test type</Label>
                        <Select
                          value={item.testType}
                          onValueChange={(value) => updateTestScoreField(item.clientId, "testType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEST_SCORE_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {item.testType === "OTHER" ? (
                        <div className="space-y-2">
                          <Label>Other test name</Label>
                          <Input
                            value={item.otherTestName}
                            onChange={(event) => updateTestScoreField(item.clientId, "otherTestName", event.target.value)}
                            placeholder="e.g. Duolingo English Test"
                          />
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>Score</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.score}
                          onChange={(event) => updateTestScoreField(item.clientId, "score", event.target.value)}
                          placeholder="Enter score"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Out of</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.outOf}
                          onChange={(event) => updateTestScoreField(item.clientId, "outOf", event.target.value)}
                          placeholder="Max score"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Taken on (optional)</Label>
                        <Input
                          type="date"
                          value={item.takenOn}
                          onChange={(event) => updateTestScoreField(item.clientId, "takenOn", event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={item.saving || item.deleting}
                        onClick={() => void removeTestScore(item)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {item.deleting ? "Removing..." : "Remove"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={item.saving || item.deleting}
                        onClick={() => void saveTestScore(item)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {item.saving ? "Saving..." : item.id ? "Save score" : "Add score"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
