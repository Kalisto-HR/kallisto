// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Building2, Save, Plus, X, Mail, Globe, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useParams } from 'react-router-dom';
import { fetchAdminUniversity, updateAdminUniversity } from '../../services/admin/universitiesService';

interface UniversityProfileProps {
  onNavigate?: (page: string) => void;
}

export function UniversityProfile({ onNavigate }: UniversityProfileProps) {
  const { universityId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    universityName: 'University of Excellence',
    description: 'A leading institution dedicated to academic excellence and innovation. We offer world-class programs across multiple disciplines with a focus on research and practical learning.',
    location: 'Boston, MA, USA',
    website: 'https://www.universityofexcellence.edu',
    contactEmail: 'admissions@universityofexcellence.edu',
    foundedYear: '1890',
    studentCount: '15000',
    facultyCount: '850',
    acceptanceRate: '15.5',
    ranking: '42',
    accreditations: ['AACSB', 'ABET', 'Regional Accreditation'],
  });

  const [programs, setPrograms] = useState([
    { id: '1', name: 'Computer Science', level: 'Undergraduate', duration: '4 years' },
    { id: '2', name: 'Business Administration', level: 'Undergraduate', duration: '4 years' },
    { id: '3', name: 'Data Science', level: 'Graduate', duration: '2 years' },
  ]);

  const [intakeTerms, setIntakeTerms] = useState([
    { id: '1', term: 'Fall 2025', deadline: '2025-05-01' },
    { id: '2', term: 'Spring 2026', deadline: '2025-11-01' },
  ]);

  const [testRequirements, setTestRequirements] = useState({
    satMin: '1200',
    ieltsMin: '6.5',
    toeflMin: '80',
    actMin: '24',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!universityId) {
        setLoading(false);
        return;
      }
      try {
        const university = await fetchAdminUniversity(universityId);
        if (!mounted) return;
        const managementProfile = (university.managementProfile ?? {}) as Record<string, unknown>;
        const loadedPrograms = Array.isArray(managementProfile.programs) ? managementProfile.programs : null;
        const loadedIntakeTerms = Array.isArray(managementProfile.intakeTerms) ? managementProfile.intakeTerms : null;
        const loadedTests = (managementProfile.testRequirements ?? {}) as Record<string, unknown>;
        setProfileDraft({
          universityName: university.name || 'University of Excellence',
          description: university.description ?? profileDraft.description,
          location: [university.city, university.country].filter(Boolean).join(', ') || profileDraft.location,
          website: String(managementProfile.website ?? profileDraft.website),
          contactEmail: String(managementProfile.contactEmail ?? profileDraft.contactEmail),
          foundedYear: String(managementProfile.foundedYear ?? profileDraft.foundedYear),
          studentCount: String(managementProfile.studentCount ?? profileDraft.studentCount),
          facultyCount: String(managementProfile.facultyCount ?? profileDraft.facultyCount),
          acceptanceRate: String(university.acceptanceRate ?? managementProfile.acceptanceRate ?? profileDraft.acceptanceRate),
          ranking: String(university.ranking ?? profileDraft.ranking),
          accreditations: Array.isArray(managementProfile.accreditations)
            ? managementProfile.accreditations.filter((item): item is string => typeof item === 'string')
            : profileDraft.accreditations,
        });
        if (loadedPrograms) {
          setPrograms(loadedPrograms as any);
        }
        if (loadedIntakeTerms) {
          setIntakeTerms(loadedIntakeTerms as any);
        }
        setTestRequirements({
          satMin: String(loadedTests.satMin ?? testRequirements.satMin),
          ieltsMin: String(university.ieltsMin ?? loadedTests.ieltsMin ?? testRequirements.ieltsMin),
          toeflMin: String(university.toeflMin ?? loadedTests.toeflMin ?? testRequirements.toeflMin),
          actMin: String(loadedTests.actMin ?? testRequirements.actMin),
        });
      } catch (err) {
        if (!mounted) return;
        setSaveError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [universityId]);

  const handleSave = async () => {
    if (!universityId) return;
    setSaving(true);
    setSaveError(null);
    const [cityPart, countryPart] = profileDraft.location.split(',').map((value) => value.trim());
    try {
      await updateAdminUniversity(universityId, {
        name: profileDraft.universityName,
        description: profileDraft.description,
        city: cityPart || null,
        country: countryPart || null,
        acceptanceRate: Number(profileDraft.acceptanceRate) || null,
        ranking: Number(profileDraft.ranking) || null,
        ieltsMin: Number(testRequirements.ieltsMin) || null,
        toeflMin: Number(testRequirements.toeflMin) || null,
        managementProfile: {
          website: profileDraft.website,
          contactEmail: profileDraft.contactEmail,
          foundedYear: profileDraft.foundedYear,
          studentCount: profileDraft.studentCount,
          facultyCount: profileDraft.facultyCount,
          programs,
          intakeTerms,
          testRequirements,
          accreditations: profileDraft.accreditations,
        },
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addProgram = () => {
    setPrograms([...programs, { id: Date.now().toString(), name: '', level: 'Undergraduate', duration: '4 years' }]);
  };

  const updateProgram = (id: string, patch: Partial<{ name: string; level: string; duration: string }>) => {
    setPrograms((current) => current.map((program) => (program.id === id ? { ...program, ...patch } : program)));
  };

  const removeProgram = (id: string) => {
    setPrograms(programs.filter((p) => p.id !== id));
  };

  const addIntakeTerm = () => {
    setIntakeTerms([...intakeTerms, { id: Date.now().toString(), term: '', deadline: '' }]);
  };

  const updateIntakeTerm = (id: string, patch: Partial<{ term: string; deadline: string }>) => {
    setIntakeTerms((current) => current.map((term) => (term.id === id ? { ...term, ...patch } : term)));
  };

  const removeIntakeTerm = (id: string) => {
    setIntakeTerms(intakeTerms.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">University Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your institution's information and programs</p>
          </div>
          <Button className="w-full md:w-auto" onClick={() => void handleSave()} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your university's public profile details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="university-name">University Name</Label>
                <Input
                  id="university-name"
                  value={profileDraft.universityName}
                  onChange={(e) => setProfileDraft({ ...profileDraft, universityName: e.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={profileDraft.description}
                  onChange={(e) => setProfileDraft({ ...profileDraft, description: e.target.value })}
                  placeholder="Describe your university..."
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible to prospective students
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={profileDraft.location}
                    onChange={(e) => setProfileDraft({ ...profileDraft, location: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    value={profileDraft.website}
                    onChange={(e) => setProfileDraft({ ...profileDraft, website: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    value={profileDraft.contactEmail}
                    onChange={(e) => setProfileDraft({ ...profileDraft, contactEmail: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="founded-year">Founded Year</Label>
                <Input
                  id="founded-year"
                  type="number"
                  value={profileDraft.foundedYear}
                  onChange={(e) => setProfileDraft({ ...profileDraft, foundedYear: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Offered */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Programs Offered</CardTitle>
                <CardDescription>Manage your academic programs</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={addProgram}>
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {programs.map((program, index) => (
              <div key={program.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`program-name-${index}`}>Program Name</Label>
                    <Input
                      id={`program-name-${index}`}
                      value={program.name}
                      onChange={(event) => updateProgram(program.id, { name: event.target.value })}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`program-level-${index}`}>Level</Label>
                    <Select value={program.level} onValueChange={(value) => updateProgram(program.id, { level: value })}>
                      <SelectTrigger id={`program-level-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="Doctorate">Doctorate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`program-duration-${index}`}>Duration</Label>
                    <Input
                      id={`program-duration-${index}`}
                      value={program.duration}
                      onChange={(event) => updateProgram(program.id, { duration: event.target.value })}
                      placeholder="e.g., 4 years"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-end sm:mt-7 sm:self-start"
                  onClick={() => removeProgram(program.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Intake Terms */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Intake Terms & Deadlines</CardTitle>
                <CardDescription>Set application periods and deadlines</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={addIntakeTerm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Term
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {intakeTerms.map((term, index) => (
              <div key={term.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`term-name-${index}`}>Term Name</Label>
                    <Input
                      id={`term-name-${index}`}
                      value={term.term}
                      onChange={(event) => updateIntakeTerm(term.id, { term: event.target.value })}
                      placeholder="e.g., Fall 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`term-deadline-${index}`}>Application Deadline</Label>
                    <Input
                      id={`term-deadline-${index}`}
                      type="date"
                      value={term.deadline}
                      onChange={(event) => updateIntakeTerm(term.id, { deadline: event.target.value })}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-end sm:mt-7 sm:self-start"
                  onClick={() => removeIntakeTerm(term.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Test Score Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Minimum Test Score Requirements</CardTitle>
            <CardDescription>Optional: Set recommended minimum scores for applicants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sat-min">SAT (Minimum)</Label>
                <Input
                  id="sat-min"
                  type="number"
                  value={testRequirements.satMin}
                  onChange={(e) => setTestRequirements({ ...testRequirements, satMin: e.target.value })}
                  placeholder="e.g., 1200"
                />
                <p className="text-xs text-muted-foreground">Out of 1600</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="act-min">ACT (Minimum)</Label>
                <Input
                  id="act-min"
                  type="number"
                  value={testRequirements.actMin}
                  onChange={(e) => setTestRequirements({ ...testRequirements, actMin: e.target.value })}
                  placeholder="e.g., 24"
                />
                <p className="text-xs text-muted-foreground">Out of 36</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ielts-min">IELTS (Minimum)</Label>
                <Input
                  id="ielts-min"
                  type="number"
                  step="0.5"
                  value={testRequirements.ieltsMin}
                  onChange={(e) => setTestRequirements({ ...testRequirements, ieltsMin: e.target.value })}
                  placeholder="e.g., 6.5"
                />
                <p className="text-xs text-muted-foreground">Out of 9.0</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toefl-min">TOEFL (Minimum)</Label>
                <Input
                  id="toefl-min"
                  type="number"
                  value={testRequirements.toeflMin}
                  onChange={(e) => setTestRequirements({ ...testRequirements, toeflMin: e.target.value })}
                  placeholder="e.g., 80"
                />
                <p className="text-xs text-muted-foreground">Out of 120</p>
              </div>
            </div>

            <div className="rounded-lg bg-accent p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> These are recommended minimum scores. Applicants with lower scores may
                still apply, but these thresholds help set expectations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Optional details about your institution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-count">Total Students</Label>
                <Input
                  id="student-count"
                  type="number"
                  value={profileDraft.studentCount}
                  onChange={(e) => setProfileDraft({ ...profileDraft, studentCount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty-count">Faculty Members</Label>
                <Input
                  id="faculty-count"
                  type="number"
                  value={profileDraft.facultyCount}
                  onChange={(e) => setProfileDraft({ ...profileDraft, facultyCount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acceptance-rate">Acceptance Rate (%)</Label>
                <Input
                  id="acceptance-rate"
                  type="number"
                  step="0.1"
                  value={profileDraft.acceptanceRate}
                  onChange={(e) => setProfileDraft({ ...profileDraft, acceptanceRate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ranking">QS World Ranking</Label>
                <Input
                  id="ranking"
                  type="number"
                  value={profileDraft.ranking}
                  onChange={(e) => setProfileDraft({ ...profileDraft, ranking: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="accreditations">Accreditations</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profileDraft.accreditations.map((item) => (
                  <Badge key={item} variant="secondary">{item}</Badge>
                ))}
              </div>
              <Input id="accreditations" placeholder="Add accreditation..." />
            </div>
          </CardContent>
        </Card>

        {/* Save Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onNavigate?.('university-dashboard')}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

