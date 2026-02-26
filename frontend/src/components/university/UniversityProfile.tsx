// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Building2, Save, Plus, X, Mail, Globe, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface UniversityProfileProps {
  onNavigate?: (page: string) => void;
}

export function UniversityProfile({ onNavigate }: UniversityProfileProps) {
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

  const addProgram = () => {
    setPrograms([...programs, { id: Date.now().toString(), name: '', level: 'Undergraduate', duration: '4 years' }]);
  };

  const removeProgram = (id: string) => {
    setPrograms(programs.filter((p) => p.id !== id));
  };

  const addIntakeTerm = () => {
    setIntakeTerms([...intakeTerms, { id: Date.now().toString(), term: '', deadline: '' }]);
  };

  const removeIntakeTerm = (id: string) => {
    setIntakeTerms(intakeTerms.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">University Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your institution's information and programs</p>
          </div>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

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
                <Input id="university-name" defaultValue="University of Excellence" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  defaultValue="A leading institution dedicated to academic excellence and innovation. We offer world-class programs across multiple disciplines with a focus on research and practical learning."
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
                  <Input id="location" defaultValue="Boston, MA, USA" className="pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    defaultValue="https://www.universityofexcellence.edu"
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
                    defaultValue="admissions@universityofexcellence.edu"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="founded-year">Founded Year</Label>
                <Input id="founded-year" type="number" defaultValue="1890" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Offered */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Programs Offered</CardTitle>
                <CardDescription>Manage your academic programs</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addProgram}>
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {programs.map((program, index) => (
              <div key={program.id} className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex-1 grid sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`program-name-${index}`}>Program Name</Label>
                    <Input
                      id={`program-name-${index}`}
                      defaultValue={program.name}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`program-level-${index}`}>Level</Label>
                    <Select defaultValue={program.level}>
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
                      defaultValue={program.duration}
                      placeholder="e.g., 4 years"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-7 shrink-0"
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Intake Terms & Deadlines</CardTitle>
                <CardDescription>Set application periods and deadlines</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addIntakeTerm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Term
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {intakeTerms.map((term, index) => (
              <div key={term.id} className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`term-name-${index}`}>Term Name</Label>
                    <Input
                      id={`term-name-${index}`}
                      defaultValue={term.term}
                      placeholder="e.g., Fall 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`term-deadline-${index}`}>Application Deadline</Label>
                    <Input id={`term-deadline-${index}`} type="date" defaultValue={term.deadline} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-7 shrink-0"
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
                <Input id="student-count" type="number" defaultValue="15000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty-count">Faculty Members</Label>
                <Input id="faculty-count" type="number" defaultValue="850" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acceptance-rate">Acceptance Rate (%)</Label>
                <Input id="acceptance-rate" type="number" step="0.1" defaultValue="15.5" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ranking">QS World Ranking</Label>
                <Input id="ranking" type="number" defaultValue="42" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="accreditations">Accreditations</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="secondary">AACSB</Badge>
                <Badge variant="secondary">ABET</Badge>
                <Badge variant="secondary">Regional Accreditation</Badge>
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
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

