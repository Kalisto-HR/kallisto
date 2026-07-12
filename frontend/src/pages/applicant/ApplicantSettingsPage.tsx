import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  Camera,
  Lock,
  Mail,
  Plus,
  Save,
  Shield,
  Target,
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
  ApplicantMatchProfileEditor,
  type ApplicantMatchProfileForm,
} from "../../components/applicant/ApplicantMatchProfileEditor";
import {
  createApplicantTestScore,
  deleteApplicantTestScore,
  fetchApplicantTestScores,
  fetchApplicantPhotoUrl,
  fetchApplicantProfile,
  updateApplicantTestScore,
  updateApplicantPassword,
  updateApplicantProfile,
  uploadApplicantPhoto,
} from "../../services/applicant/profileService";
import { PASSWORD_CHANGED_REASON } from "../../services/sessionEvents";
import { routes } from "../../routes/routeConfig";
import type { Profile, ApplicantTestScore, ApplicantTestScoreType } from "../../types/domain";

function getInitials(firstName: string, lastName: string): string {
  const first = firstName[0] ?? "";
  const last = lastName[0] ?? "";
  return `${first}${last}`.toUpperCase() || "ST";
}

interface EditableTestScore {
  id: string | null;
  clientId: string;
  testType: ApplicantTestScoreType;
  otherTestName: string;
  score: string;
  outOf: string;
  takenOn: string;
  saving: boolean;
  deleting: boolean;
}

type ApplicantGender = "male" | "female" | "non_binary" | "prefer_not_to_say";

const TEST_SCORE_TYPES: Array<{ value: ApplicantTestScoreType; label: string }> = [
  { value: "IELTS", label: "IELTS" },
  { value: "SAT", label: "SAT" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "ACT", label: "ACT" },
  { value: "HSK", label: "HSK" },
  { value: "CSCA", label: "CSCA" },
  { value: "OTHER", label: "Other" },
];

const APPLICANT_GENDER_OPTIONS: Array<{ value: ApplicantGender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

function normalizeApplicantGender(value: unknown): ApplicantGender | "" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  switch (normalized) {
    case "male":
    case "female":
    case "non_binary":
    case "prefer_not_to_say":
      return normalized;
    case "non-binary":
    case "nonbinary":
    case "other":
      return "non_binary";
    case "prefer not to say":
    case "prefer-not-to-say":
      return "prefer_not_to_say";
    default:
      return "";
  }
}

function toEditableTestScore(item: ApplicantTestScore): EditableTestScore {
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

function profileString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

function profileStringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function buildMatchProfileForm(data: Record<string, unknown> | null | undefined): ApplicantMatchProfileForm {
  const source = data ?? {};
  return {
    nationality: profileString(source, "nationality"),
    educationLevel: profileString(source, "educationLevel"),
    gpa: profileString(source, "gpa"),
    gpaScale: profileString(source, "gpaScale"),
    intendedMajor: profileString(source, "intendedMajor"),
    budgetPerYear: profileString(source, "budgetPerYear"),
    preferredLanguage: profileString(source, "preferredLanguage"),
    preferredCity: profileString(source, "preferredCity"),
    documentsReady: profileStringArray(source, "documentsReady"),
    achievements: profileStringArray(source, "achievements").join("\n"),
  };
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullableNumber(value: string): number | null {
  return optionalNumber(value) ?? null;
}

function linesToArray(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function cleanMatchProfilePayload(value: ApplicantMatchProfileForm): Record<string, unknown> {
  return {
    nationality: value.nationality.trim(),
    educationLevel: value.educationLevel,
    gpa: nullableNumber(value.gpa),
    gpaScale: nullableNumber(value.gpaScale),
    intendedMajor: value.intendedMajor.trim(),
    budgetPerYear: nullableNumber(value.budgetPerYear),
    preferredLanguage: value.preferredLanguage,
    preferredCity: value.preferredCity.trim(),
    documentsReady: value.documentsReady,
    achievements: linesToArray(value.achievements),
  };
}

export function ApplicantSettingsPage() {
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<ApplicantGender | "">("");
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
  const [matchProfile, setMatchProfile] = useState<ApplicantMatchProfileForm>(() => buildMatchProfileForm(null));
  const [savingMatchProfile, setSavingMatchProfile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const defaultTab = searchParams.get("tab") === "match-profile" ? "match-profile" : "profile";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchApplicantProfile();
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
        setGender(normalizeApplicantGender(profileData.gender));
        setMatchProfile(buildMatchProfileForm(profileData));
        setEmailNotifications(typeof notifications.email === "boolean" ? notifications.email : true);
        setPushNotifications(typeof notifications.push === "boolean" ? notifications.push : true);
        const visibility =
          privacy.profileVisibility === "private" || privacy.profileVisibility === "partners"
            ? privacy.profileVisibility
            : "partners";
        setProfileVisibility(visibility);

        setTestScoresLoading(true);
        const scores = await fetchApplicantTestScores();
        setTestScores(scores.map(toEditableTestScore));
        setTestScoresLoading(false);

        const fetchedPhotoUrl = await fetchApplicantPhotoUrl();
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
    if (!gender) {
      setError("Select a gender option before saving your profile.");
      setSuccess(null);
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      await updateApplicantProfile({
        firstName,
        lastName,
        data: { bio, gender },
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
            gender,
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

  const saveMatchProfile = async () => {
    const gpa = optionalNumber(matchProfile.gpa);
    const gpaScale = optionalNumber(matchProfile.gpaScale);
    const budgetPerYear = optionalNumber(matchProfile.budgetPerYear);

    if (matchProfile.gpa.trim() && (gpa === undefined || gpa < 0)) {
      setError("GPA must be a valid number greater than or equal to 0.");
      setSuccess(null);
      return;
    }
    if (matchProfile.gpaScale.trim() && (gpaScale === undefined || gpaScale <= 0)) {
      setError("GPA scale must be a valid number greater than 0.");
      setSuccess(null);
      return;
    }
    if (gpa !== undefined && gpaScale !== undefined && gpa > gpaScale) {
      setError("GPA cannot be greater than GPA scale.");
      setSuccess(null);
      return;
    }
    if (matchProfile.budgetPerYear.trim() && (budgetPerYear === undefined || budgetPerYear < 0)) {
      setError("Budget per year must be a valid number greater than or equal to 0.");
      setSuccess(null);
      return;
    }

    setSavingMatchProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const data = cleanMatchProfilePayload(matchProfile);
      await updateApplicantProfile({ data });
      setProfile((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          data: {
            ...(current.data ?? {}),
            ...data,
          },
        };
      });
      setSuccess("Match profile saved. Your Fit Score will use the updated fields.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save match profile");
    } finally {
      setSavingMatchProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotifications(true);
    setError(null);
    setSuccess(null);
    try {
      await updateApplicantProfile({
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
      await updateApplicantProfile({
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
      const result = await updateApplicantPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      if (result.reauthRequired) {
        window.location.replace(`${routes.auth.signIn}?reason=${encodeURIComponent(result.reason ?? PASSWORD_CHANGED_REASON)}`);
        return;
      }
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
      await uploadApplicantPhoto(file);
      const fetchedPhotoUrl = await fetchApplicantPhotoUrl();
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
          const nextType = value as ApplicantTestScoreType;
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
        ? await updateApplicantTestScore(item.id, payload)
        : await createApplicantTestScore(payload);

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
      await deleteApplicantTestScore(item.id);
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

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="match-profile" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Match Profile</span>
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
                  <AvatarFallback className="brand-avatar-mark text-2xl text-white">
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={(value) => setGender(value as ApplicantGender)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICANT_GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Required for application analytics and partner reporting.
                  </p>
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
                  setGender(normalizeApplicantGender(profile.data?.gender));
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

        <TabsContent value="match-profile" className="space-y-6">
          <ApplicantMatchProfileEditor
            value={matchProfile}
            saving={savingMatchProfile}
            onChange={setMatchProfile}
            onSave={() => void saveMatchProfile()}
            onReset={() => {
              setMatchProfile(buildMatchProfileForm(profile.data));
              setSuccess(null);
              setError(null);
            }}
          />
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
