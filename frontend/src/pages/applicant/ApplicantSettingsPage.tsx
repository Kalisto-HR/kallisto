import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  APPLICANT_PHOTO_UPDATED_EVENT,
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
import {
  getDistrictByCode,
  getLocalizedLocationName,
  getRegionByCode,
  uzbekistanLocations,
} from "../../i18n/uzbekistanLocations";
import { getApplicantProfileCompletion } from "../../utils/applicantProfileCompletion";

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

type ApplicantGender = "male" | "female" | "prefer_not_to_say";

const TEST_SCORE_TYPES: Array<{ value: ApplicantTestScoreType; label: string }> = [
  { value: "IELTS", label: "IELTS" },
  { value: "SAT", label: "SAT" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "ACT", label: "ACT" },
  { value: "HSK", label: "HSK" },
  { value: "CSCA", label: "CSCA" },
  { value: "OTHER", label: "Other" },
];

const APPLICANT_GENDER_OPTIONS: Array<{ value: ApplicantGender; labelKey: string }> = [
  { value: "male", labelKey: "profileForm.genderOptions.male" },
  { value: "female", labelKey: "profileForm.genderOptions.female" },
  { value: "prefer_not_to_say", labelKey: "profileForm.genderOptions.prefer_not_to_say" },
];

function normalizeApplicantGender(value: unknown): ApplicantGender | "" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  switch (normalized) {
    case "male":
    case "female":
    case "prefer_not_to_say":
      return normalized;
    case "non-binary":
    case "nonbinary":
    case "other":
      return "prefer_not_to_say";
    case "prefer not to say":
    case "prefer-not-to-say":
      return "prefer_not_to_say";
    default:
      return "";
  }
}

function profileDataString(data: Record<string, unknown> | null | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}

function normalizeUzbekPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return trimmed.replace(/\s+/g, "");
}

function isValidUzbekPhone(value: string): boolean {
  const normalized = normalizeUzbekPhone(value);
  return normalized === "" || /^\+998\d{9}$/.test(normalized);
}

function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[\p{L}\p{M}'\u2018\u2019` -]+$/u.test(trimmed) && !/^[\d\s-]+$/.test(trimmed);
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
  const { t, i18n } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState<ApplicantGender | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
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

        setMiddleName(profileDataString(profileData, "middleName"));
        setGender(normalizeApplicantGender(profileData.gender));
        setDateOfBirth(profileDataString(profileData, "dateOfBirth"));
        const savedRegion = profileDataString(profileData, "regionCode");
        const savedDistrict = profileDataString(profileData, "districtCode");
        setRegionCode(getRegionByCode(savedRegion) ? savedRegion : "");
        setDistrictCode(getDistrictByCode(savedRegion, savedDistrict) ? savedDistrict : "");
        setAdditionalPhone(profileDataString(profileData, "additionalPhone"));
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
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedMiddleName = middleName.trim();
    const normalizedPhone = normalizeUzbekPhone(additionalPhone);

    if (!isValidName(trimmedLastName)) {
      setError(t("profileForm.errors.lastName"));
      setSuccess(null);
      return;
    }
    if (!isValidName(trimmedFirstName)) {
      setError(t("profileForm.errors.firstName"));
      setSuccess(null);
      return;
    }
    if (trimmedMiddleName && !/^[\p{L}\p{M}'\u2018\u2019` -]+$/u.test(trimmedMiddleName)) {
      setError(t("profileForm.errors.middleName"));
      setSuccess(null);
      return;
    }
    if (!gender) {
      setError(t("profileForm.errors.gender"));
      setSuccess(null);
      return;
    }
    if (dateOfBirth && new Date(`${dateOfBirth}T00:00:00`) > new Date()) {
      setError(t("profileForm.errors.dateOfBirth"));
      setSuccess(null);
      return;
    }
    if (!regionCode) {
      setError(t("profileForm.errors.region"));
      setSuccess(null);
      return;
    }
    if (!districtCode || !getDistrictByCode(regionCode, districtCode)) {
      setError(t("profileForm.errors.district"));
      setSuccess(null);
      return;
    }
    if (!isValidUzbekPhone(additionalPhone)) {
      setError(t("profileForm.errors.phone"));
      setSuccess(null);
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      await updateApplicantProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        data: {
          middleName: trimmedMiddleName,
          gender,
          dateOfBirth,
          regionCode,
          districtCode,
          additionalPhone: normalizedPhone,
        },
      });

      setProfile((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          data: {
            ...(current.data ?? {}),
            middleName: trimmedMiddleName,
            gender,
            dateOfBirth,
            regionCode,
            districtCode,
            additionalPhone: normalizedPhone,
          },
        };
      });
      setFirstName(trimmedFirstName);
      setLastName(trimmedLastName);
      setMiddleName(trimmedMiddleName);
      setAdditionalPhone(normalizedPhone);
      setSuccess(t("profileForm.success"));
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

    if (!matchProfile.gpa.trim()) {
      setError("GPA is required.");
      setSuccess(null);
      return;
    }
    if (matchProfile.gpa.trim() && (gpa === undefined || gpa < 0)) {
      setError("GPA must be a valid number greater than or equal to 0.");
      setSuccess(null);
      return;
    }
    if (!matchProfile.gpaScale.trim()) {
      setError("GPA scale is required.");
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
    if (!matchProfile.intendedMajor.trim()) {
      setError("Intended major is required.");
      setSuccess(null);
      return;
    }
    if (!matchProfile.budgetPerYear.trim()) {
      setError(t("applicantFlow.matchProfile.validation.budgetRequired"));
      setSuccess(null);
      return;
    }
    if (matchProfile.budgetPerYear.trim() && (budgetPerYear === undefined || budgetPerYear < 0)) {
      setError(t("applicantFlow.matchProfile.validation.budgetInvalid"));
      setSuccess(null);
      return;
    }
    if (!matchProfile.preferredLanguage.trim()) {
      setError(t("applicantFlow.matchProfile.validation.languageRequired"));
      setSuccess(null);
      return;
    }
    if (!matchProfile.preferredCity.trim()) {
      setError(t("applicantFlow.matchProfile.validation.cityRequired"));
      setSuccess(null);
      return;
    }
    if (matchProfile.documentsReady.length === 0) {
      setError("Mark at least one ready document before continuing.");
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
      window.dispatchEvent(new Event(APPLICANT_PHOTO_UPDATED_EVENT));
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
      setError(t("applicantFlow.settings.testScores.outOfInvalid"));
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
      setSuccess(item.id ? t("applicantFlow.settings.testScores.updated") : t("applicantFlow.settings.testScores.created"));
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
      setSuccess(t("applicantFlow.settings.testScores.removed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applicantFlow.settings.testScores.failedDelete"));
      setTestScores((current) =>
        current.map((row) => (row.clientId === item.clientId ? { ...row, deleting: false } : row)),
      );
    }
  };

  if (loading) return <LoadingState label={t("applicantFlow.settings.loading")} />;
  if (error && !profile) return <ErrorState message={error} />;
  if (!profile) {
    return <EmptyState title={t("applicantFlow.settings.profileUnavailableTitle")} description={t("applicantFlow.settings.profileUnavailableDescription")} />;
  }

  const regionOptions = uzbekistanLocations
    .map((region) => ({ ...region, label: getLocalizedLocationName(region, i18n.language) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedRegion = getRegionByCode(regionCode);
  const districtOptions = (selectedRegion?.districts ?? [])
    .map((district) => ({ ...district, label: getLocalizedLocationName(district, i18n.language) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const isOnboarding = searchParams.get("onboarding") === "1";
  const profileCompletion = getApplicantProfileCompletion(profile);
  const missingProfileItems = profileCompletion.missing.join(", ");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section>
        <h1 className="text-3xl font-semibold">{t("applicantFlow.settings.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("applicantFlow.settings.description")}
        </p>
      </section>
      {error ? <ErrorState message={error} /> : null}
      {success ? <SuccessState message={success} /> : null}
      {isOnboarding || !profileCompletion.complete ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-semibold">{t("applicantFlow.settings.onboardingTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("applicantFlow.settings.onboardingDescription")}
              </p>
              {!profileCompletion.complete ? (
                <p className="text-xs text-muted-foreground">
                  {t("applicantFlow.settings.missing", { items: missingProfileItems })}
                </p>
              ) : null}
            </div>
            {profileCompletion.complete ? (
              <Link to={routes.applicant.universities}>
                <Button className="w-full sm:w-auto">{t("applicantFlow.settings.chooseUniversities")}</Button>
              </Link>
            ) : (
              <Button className="w-full sm:w-auto" variant="outline" disabled>
                {t("applicantFlow.settings.profileRequired")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("applicantFlow.settings.tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="match-profile" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">{t("applicantFlow.settings.tabs.matchProfile")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">{t("applicantFlow.settings.tabs.security")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t("applicantFlow.settings.tabs.notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t("applicantFlow.settings.tabs.privacy")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileForm.title")}</CardTitle>
              <CardDescription>{t("profileForm.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Avatar className="h-28 w-28 border bg-white shadow-sm">
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
                    {uploadingPhoto ? t("actions.uploading") : t("profileForm.uploadPhoto")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("profileForm.photoHelp")}</p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="last-name">{t("profileForm.lastName")} *</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first-name">{t("profileForm.firstName")} *</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle-name">{t("profileForm.middleName")}</Label>
                  <Input
                    id="middle-name"
                    value={middleName}
                    onChange={(event) => setMiddleName(event.target.value)}
                    autoComplete="additional-name"
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <Label>{t("profileForm.gender")} *</Label>
                  <Select value={gender} onValueChange={(value) => setGender(value as ApplicantGender)}>
                    <SelectTrigger aria-label={t("profileForm.gender")}>
                      <SelectValue placeholder={t("profileForm.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICANT_GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="date-of-birth">{t("profileForm.dateOfBirth")} *</Label>
                  <Input
                    id="date-of-birth"
                    type="date"
                    max={maxBirthDate}
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="region-code">{t("profileForm.region")} *</Label>
                  <Select
                    value={regionCode}
                    onValueChange={(value) => {
                      setRegionCode(value);
                      setDistrictCode("");
                    }}
                  >
                    <SelectTrigger id="region-code">
                      <SelectValue placeholder={t("profileForm.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {regionOptions.map((region) => (
                        <SelectItem key={region.code} value={region.code}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="district-code">{t("profileForm.district")} *</Label>
                  <Select value={districtCode} disabled={!regionCode} onValueChange={setDistrictCode}>
                    <SelectTrigger id="district-code" aria-disabled={!regionCode}>
                      <SelectValue placeholder={regionCode ? t("profileForm.select") : t("profileForm.selectRegionFirst")} />
                    </SelectTrigger>
                    <SelectContent>
                      {districtOptions.map((district) => (
                        <SelectItem key={district.code} value={district.code}>
                          {district.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="email">{t("profileForm.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" value={profile.email} disabled className="pl-9" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="additional-phone">{t("profileForm.additionalPhone")}</Label>
                  <Input
                    id="additional-phone"
                    value={additionalPhone}
                    onChange={(event) => setAdditionalPhone(event.target.value)}
                    onBlur={() => setAdditionalPhone(normalizeUzbekPhone(additionalPhone))}
                    placeholder="+998 90 123-45-67"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-medium">{t("applicantFlow.settings.testScores.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("applicantFlow.settings.testScores.description")}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addNewTestScoreRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("applicantFlow.settings.testScores.addNew")}
                  </Button>
                </div>

                {testScoresLoading ? (
                  <p className="text-sm text-muted-foreground">{t("applicantFlow.settings.testScores.loading")}</p>
                ) : null}

                {!testScoresLoading && testScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("applicantFlow.settings.testScores.empty")}
                  </p>
                ) : null}

                {testScores.map((item) => (
                  <div key={item.clientId} className="space-y-3 rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("applicantFlow.settings.testScores.type")}</Label>
                        <Select
                          value={item.testType}
                          onValueChange={(value) => updateTestScoreField(item.clientId, "testType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("applicantFlow.settings.testScores.selectType")} />
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
                          <Label>{t("applicantFlow.settings.testScores.otherName")}</Label>
                          <Input
                            value={item.otherTestName}
                            onChange={(event) => updateTestScoreField(item.clientId, "otherTestName", event.target.value)}
                            placeholder={t("applicantFlow.settings.testScores.otherPlaceholder")}
                          />
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>{t("applicantFlow.settings.testScores.score")}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.score}
                          onChange={(event) => updateTestScoreField(item.clientId, "score", event.target.value)}
                          placeholder={t("applicantFlow.settings.testScores.scorePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("applicantFlow.settings.testScores.outOf")}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.outOf}
                          onChange={(event) => updateTestScoreField(item.clientId, "outOf", event.target.value)}
                          placeholder={t("applicantFlow.settings.testScores.outOfPlaceholder")}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>{t("applicantFlow.settings.testScores.takenOn")}</Label>
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
                        {item.deleting ? t("applicantFlow.settings.testScores.removing") : t("applicantFlow.settings.testScores.remove")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={item.saving || item.deleting}
                        onClick={() => void saveTestScore(item)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {item.saving ? t("applicantFlow.settings.testScores.saving") : item.id ? t("applicantFlow.settings.testScores.save") : t("applicantFlow.settings.testScores.add")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => {
                  setFirstName(profile.firstName);
                  setLastName(profile.lastName);
                  setMiddleName(profileDataString(profile.data, "middleName"));
                  setGender(normalizeApplicantGender(profile.data?.gender));
                  setDateOfBirth(profileDataString(profile.data, "dateOfBirth"));
                  const savedRegion = profileDataString(profile.data, "regionCode");
                  const savedDistrict = profileDataString(profile.data, "districtCode");
                  setRegionCode(getRegionByCode(savedRegion) ? savedRegion : "");
                  setDistrictCode(getDistrictByCode(savedRegion, savedDistrict) ? savedDistrict : "");
                  setAdditionalPhone(profileDataString(profile.data, "additionalPhone"));
                  setSuccess(null);
                  setError(null);
                }}>
                  {t("profileForm.cancel")}
                </Button>
                <Button onClick={() => void saveProfile()} disabled={savingProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? t("profileForm.saving") : t("profileForm.save")}
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
              <CardTitle>{t("applicantFlow.settings.security.title")}</CardTitle>
              <CardDescription>
                {t("applicantFlow.settings.security.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t("applicantFlow.settings.security.current")}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("applicantFlow.settings.security.new")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">{t("applicantFlow.settings.security.confirm")}</Label>
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
                  {savingPassword ? t("applicantFlow.settings.security.updating") : t("applicantFlow.settings.security.update")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("applicantFlow.settings.notifications.title")}</CardTitle>
              <CardDescription>{t("applicantFlow.settings.notifications.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("applicantFlow.settings.notifications.email")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("applicantFlow.settings.notifications.emailHelp")}
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("applicantFlow.settings.notifications.push")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("applicantFlow.settings.notifications.pushHelp")}
                  </div>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("applicantFlow.settings.notifications.note")}
              </p>
              <div className="flex justify-end">
                <Button onClick={() => void saveNotifications()} disabled={savingNotifications}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingNotifications ? t("actions.saving") : t("applicantFlow.settings.notifications.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("applicantFlow.settings.privacy.title")}</CardTitle>
              <CardDescription>
                {t("applicantFlow.settings.privacy.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-visibility">{t("applicantFlow.settings.privacy.visibility")}</Label>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger id="profile-visibility">
                    <SelectValue placeholder={t("applicantFlow.settings.privacy.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partners">{t("applicantFlow.settings.privacy.partners")}</SelectItem>
                    <SelectItem value="private">{t("applicantFlow.settings.privacy.private")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border p-3">
                <div>
                  <div className="font-medium">{t("applicantFlow.settings.privacy.controls")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("applicantFlow.settings.privacy.controlsDescription")}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void savePrivacy()} disabled={savingPrivacy}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingPrivacy ? t("actions.saving") : t("applicantFlow.settings.privacy.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
