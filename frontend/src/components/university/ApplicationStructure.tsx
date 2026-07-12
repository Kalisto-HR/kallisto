import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  AlertCircle,
  CheckCircle2,
  Upload,
  Copy,
  Settings,
  Edit2,
  ChevronRight,
  Clock,
  User,
  BookTemplate,
  Globe2,
  Calendar,
  Hash,
  Phone,
  Mail,
  List,
  CheckSquare,
  ChevronDown,
  FileUp,
  MessageSquare,
  ToggleLeft,
  Star,
  MapPin,
  Users,
  AlignLeft,
  Type,
  FileImage,
  History,
  Sparkles,
  Lock,
  EyeOff,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '../ui/utils';
import { ErrorState, LoadingState } from '../common/PageState';
import { useParams } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { fetchPartnerApplicationStructure, updatePartnerApplicationStructure } from '../../services/partner/universityService';
import { fetchPartnerApplicationStructureHistory, publishPartnerApplicationStructure } from '../../services/partner/dashboardService';
import type { ApplicationStructureVersion } from '../../types/domain';
import { isValidUUID } from '../../utils/validation';

interface ApplicationStructureProps {
  onNavigate?: (page: string) => void;
}

// Type definitions
type FieldType =
  | 'short-text'
  | 'long-text'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'country'
  | 'file-upload'
  | 'document'
  | 'essay'
  | 'recommender'
  | 'agreement'
  | 'rating'
  | 'address'
  | 'repeating-group';

interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than';
  value: string;
}

interface Field {
  id: string;
  type: FieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required: boolean;
  order: number;
  
  // Validation
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
    maxFiles?: number;
    wordLimit?: number;
  };
  
  // Options for choice fields
  options?: string[];
  
  // Conditional logic
  conditional?: {
    show: boolean;
    rules: ConditionalRule[];
  };
  
  // Data mapping
  dataKey?: string;
  exportLabel?: string;
  
  // Permissions
  visibility?: {
    applicant: boolean;
    partner: boolean;
    staff: boolean;
  };
}

interface Section {
  id: string;
  name: string;
  title: string;
  description?: string;
  order: number;
  fields: Field[];
  visible: boolean;
}

interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

type PublishStatus = 'never-published' | 'published' | 'draft-changes-not-published';

// Field type metadata
const fieldTypeInfo: Record<FieldType, { icon: LucideIcon; label: string; description: string }> = {
  'short-text': { icon: Type, label: 'Short Text', description: 'Single line text input' },
  'long-text': { icon: AlignLeft, label: 'Long Text', description: 'Multi-line text area' },
  'email': { icon: Mail, label: 'Email', description: 'Email address with validation' },
  'phone': { icon: Phone, label: 'Phone', description: 'Phone number input' },
  'date': { icon: Calendar, label: 'Date', description: 'Date picker' },
  'number': { icon: Hash, label: 'Number', description: 'Numeric input' },
  'radio': { icon: ToggleLeft, label: 'Single Choice', description: 'Radio buttons (one selection)' },
  'checkbox': { icon: CheckSquare, label: 'Multiple Choice', description: 'Checkboxes (multiple selections)' },
  'dropdown': { icon: ChevronDown, label: 'Dropdown', description: 'Select from dropdown list' },
  'country': { icon: Globe2, label: 'Country Selector', description: 'Country dropdown with flags' },
  'file-upload': { icon: FileUp, label: 'File Upload', description: 'General file upload' },
  'document': { icon: FileImage, label: 'Document Request', description: 'Specific document request' },
  'essay': { icon: MessageSquare, label: 'Essay Prompt', description: 'Long text with word limit and guidance' },
  'recommender': { icon: Users, label: 'Recommender Entry', description: 'Recommender contact information' },
  'agreement': { icon: CheckSquare, label: 'Agreement Checkbox', description: 'Terms and conditions checkbox' },
  'rating': { icon: Star, label: 'Rating Scale', description: 'Star or numeric rating' },
  'address': { icon: MapPin, label: 'Address Block', description: 'Complete address fields' },
  'repeating-group': { icon: List, label: 'Repeating Group', description: 'Add multiple entries (e.g., education history)' },
};

const defaultFieldVisibility = {
  applicant: true,
  partner: true,
  staff: true,
};

type TemplateFieldDescriptor = Omit<Partial<Field>, 'type' | 'label'> & Pick<Field, 'type' | 'label'>;

type TemplateSectionDescriptor = {
  name: string;
  title: string;
  description?: string;
  fields: TemplateFieldDescriptor[];
};

type ApplicationStructureTemplate = {
  id: string;
  name: string;
  description: string;
  sections: TemplateSectionDescriptor[];
};

const fieldTypeAliases: Record<string, FieldType> = {
  text: 'short-text',
  textarea: 'long-text',
  select: 'dropdown',
  upload: 'file-upload',
};

function createBuilderId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeFieldType(type: unknown): FieldType {
  if (typeof type !== 'string') return 'short-text';
  const normalized = type.trim();
  if (!normalized) return 'short-text';
  if (normalized in fieldTypeInfo) return normalized as FieldType;
  return fieldTypeAliases[normalized] ?? 'short-text';
}

function normalizeStructureSections(rawSchema: unknown): Section[] {
  const schemaRecord = toRecord(rawSchema);
  const rawSections = Array.isArray(schemaRecord?.sections) ? schemaRecord.sections : [];

  return rawSections
    .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === 'object' && !Array.isArray(section))
    .map((section, sectionIndex) => {
      const rawFields = Array.isArray(section.fields) ? section.fields : [];
      return {
        id: typeof section.id === 'string' && section.id.trim() ? section.id : `section-${sectionIndex + 1}`,
        name: typeof section.name === 'string' && section.name.trim() ? section.name : `Section ${sectionIndex + 1}`,
        title:
          typeof section.title === 'string' && section.title.trim()
            ? section.title
            : typeof section.name === 'string' && section.name.trim()
              ? section.name
              : `Section ${sectionIndex + 1}`,
        description: typeof section.description === 'string' && section.description.trim() ? section.description : undefined,
        order: typeof section.order === 'number' ? section.order : sectionIndex + 1,
        visible: section.visible !== false,
        fields: rawFields
          .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === 'object' && !Array.isArray(field))
          .map((field, fieldIndex) => {
            const visibility = toRecord(field.visibility);
            return {
              id: typeof field.id === 'string' && field.id.trim() ? field.id : `field-${sectionIndex + 1}-${fieldIndex + 1}`,
              type: normalizeFieldType(field.type),
              label: typeof field.label === 'string' && field.label.trim() ? field.label : 'Field',
              helperText: typeof field.helperText === 'string' && field.helperText.trim() ? field.helperText : undefined,
              placeholder: typeof field.placeholder === 'string' && field.placeholder.trim() ? field.placeholder : undefined,
              required: field.required === true,
              order: typeof field.order === 'number' ? field.order : fieldIndex + 1,
              validation: toRecord(field.validation) ?? undefined,
              options: Array.isArray(field.options)
                ? field.options.filter((option): option is string => typeof option === 'string')
                : undefined,
              conditional: toRecord(field.conditional) ?? undefined,
              dataKey: typeof field.dataKey === 'string' && field.dataKey.trim() ? field.dataKey : undefined,
              exportLabel: typeof field.exportLabel === 'string' && field.exportLabel.trim() ? field.exportLabel : undefined,
              visibility: visibility
                ? {
                    applicant: visibility.applicant !== false,
                    partner: visibility.partner !== false,
                    staff: visibility.staff !== false,
                  }
                : undefined,
            } as Field;
          }),
      } as Section;
    })
    .filter((section) => section.visible !== false);
}

function buildAuditTrail(history: ApplicationStructureVersion[]): AuditEntry[] {
  return history.map((item) => ({
    timestamp: new Date(item.createdAt).toLocaleString('en-US'),
    user: item.changedBy ?? 'System',
    action: item.published ? 'Published' : 'Saved',
    details: item.changeNote ?? `Version ${item.versionNo}`,
  }));
}

function getLatestPublishedVersion(history: ApplicationStructureVersion[]): ApplicationStructureVersion | null {
  const publishedVersions = [...history]
    .filter((item) => item.published)
    .sort((left, right) => {
      if (right.versionNo !== left.versionNo) {
        return right.versionNo - left.versionNo;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  return publishedVersions[0] ?? null;
}

function getPublishStatus(sections: Section[], latestPublished: ApplicationStructureVersion | null): PublishStatus {
  if (!latestPublished) {
    return 'never-published';
  }

  const liveSignature = JSON.stringify(normalizeStructureSections({ sections }));
  const publishedSignature = JSON.stringify(normalizeStructureSections(latestPublished.schema));
  return liveSignature === publishedSignature ? 'published' : 'draft-changes-not-published';
}

function getPublishStatusCopy(status: PublishStatus) {
  switch (status) {
    case 'published':
      return {
        label: 'Published',
        description: 'Applicants see the current published structure.',
      };
    case 'draft-changes-not-published':
      return {
        label: 'Draft changes not published',
        description: 'Applicants still see the last published structure until you publish these draft changes.',
      };
    case 'never-published':
    default:
      return {
        label: 'Never published',
        description: 'Applicants see the fallback baseline until you publish a structure for the first time.',
      };
  }
}

function resolveFieldVisibility(visibility?: Field['visibility']) {
  return {
    ...defaultFieldVisibility,
    ...visibility,
  };
}

function cloneTemplateSections(sectionDescriptors: TemplateSectionDescriptor[]): Section[] {
  return sectionDescriptors.map((section, sectionIndex) => ({
    id: createBuilderId(`section_${sectionIndex + 1}`),
    name: section.name,
    title: section.title,
    description: section.description,
    order: sectionIndex + 1,
    visible: true,
    fields: section.fields.map((field, fieldIndex) => ({
      id: createBuilderId(`field_${sectionIndex + 1}_${fieldIndex + 1}`),
      type: field.type,
      label: field.label,
      helperText: field.helperText,
      placeholder: field.placeholder,
      required: field.required ?? false,
      order: fieldIndex + 1,
      validation: field.validation,
      options: field.options,
      conditional: field.conditional,
      dataKey: field.dataKey ?? `field_${sectionIndex + 1}_${fieldIndex + 1}`,
      exportLabel: field.exportLabel ?? field.label,
      visibility: resolveFieldVisibility(field.visibility),
    })),
  }));
}

const APPLICATION_STRUCTURE_TEMPLATES: ApplicationStructureTemplate[] = [
  {
    id: 'common-app',
    name: 'Common App Standard',
    description: 'Personal details, academics, activities, essays, and applicant confirmation.',
    sections: [
      {
        name: 'Personal Information',
        title: 'Personal Information',
        description: 'Basic identity and contact details.',
        fields: [
          { type: 'short-text', label: 'Full Name', required: true, dataKey: 'full_name', helperText: 'Enter your legal full name.' },
          { type: 'email', label: 'Email Address', required: true, dataKey: 'email' },
          { type: 'phone', label: 'Phone Number', required: true, dataKey: 'phone' },
          { type: 'date', label: 'Date of Birth', required: true, dataKey: 'dob' },
          { type: 'country', label: 'Country of Citizenship', required: true, dataKey: 'citizenship' },
          { type: 'address', label: 'Current Mailing Address', required: true, dataKey: 'mailing_address' },
        ],
      },
      {
        name: 'Academic History',
        title: 'Academic History',
        description: 'School history and standardized testing.',
        fields: [
          { type: 'repeating-group', label: 'Education History', required: true, dataKey: 'education_history', helperText: 'Add each school you attended.' },
          { type: 'number', label: 'Cumulative GPA', required: true, dataKey: 'gpa', validation: { min: 0, max: 4 } },
          { type: 'number', label: 'SAT Score', dataKey: 'sat', validation: { min: 0, max: 1600 } },
          { type: 'number', label: 'IELTS Score', dataKey: 'ielts', validation: { min: 0, max: 9 } },
        ],
      },
      {
        name: 'Activities and Honors',
        title: 'Activities and Honors',
        description: 'Extracurricular activity and distinction summary.',
        fields: [
          { type: 'repeating-group', label: 'Activities and Honors', dataKey: 'activities_honors', helperText: 'Add important activities, awards, or honors.' },
          { type: 'long-text', label: 'Community Impact', dataKey: 'community_impact', helperText: 'Summarize your most meaningful contributions.' },
        ],
      },
      {
        name: 'Essays',
        title: 'Essay Responses',
        description: 'Written responses for admission review.',
        fields: [
          { type: 'essay', label: 'Personal Essay', required: true, dataKey: 'personal_essay', validation: { wordLimit: 650 } },
          { type: 'agreement', label: 'I confirm that all information in this application is accurate.', required: true, dataKey: 'application_agreement' },
        ],
      },
    ],
  },
  {
    id: 'graduate',
    name: 'Graduate Program',
    description: 'Graduate admissions with program selection, research background, recommenders, and documents.',
    sections: [
      {
        name: 'Applicant Details',
        title: 'Applicant Details',
        description: 'Core applicant and contact information.',
        fields: [
          { type: 'short-text', label: 'Full Name', required: true, dataKey: 'full_name' },
          { type: 'email', label: 'Email Address', required: true, dataKey: 'email' },
          { type: 'date', label: 'Date of Birth', required: true, dataKey: 'dob' },
          { type: 'country', label: 'Citizenship', required: true, dataKey: 'citizenship' },
        ],
      },
      {
        name: 'Program Selection',
        title: 'Program Selection',
        description: 'Program and intake preferences.',
        fields: [
          { type: 'dropdown', label: 'Program of Interest', required: true, dataKey: 'program', options: ['Computer Science', 'Data Science', 'Business Analytics', 'Engineering'] },
          { type: 'dropdown', label: 'Preferred Intake', required: true, dataKey: 'preferred_intake', options: ['2026-Fall', '2027-Spring', '2027-Fall'] },
          { type: 'radio', label: 'Study Mode', required: true, dataKey: 'study_mode', options: ['Full-time', 'Part-time'] },
        ],
      },
      {
        name: 'Academic Background',
        title: 'Academic Background',
        description: 'Previous higher-education records.',
        fields: [
          { type: 'repeating-group', label: 'Previous Education', required: true, dataKey: 'education_history' },
          { type: 'number', label: 'Undergraduate GPA', required: true, dataKey: 'gpa', validation: { min: 0, max: 4 } },
          { type: 'long-text', label: 'Research or Work Experience', dataKey: 'research_experience' },
        ],
      },
      {
        name: 'Assessments and References',
        title: 'Assessments and References',
        description: 'Testing and recommendation requirements.',
        fields: [
          { type: 'number', label: 'TOEFL Score', dataKey: 'toefl', validation: { min: 0, max: 120 } },
          { type: 'number', label: 'IELTS Score', dataKey: 'ielts', validation: { min: 0, max: 9 } },
          { type: 'recommender', label: 'Academic or Professional Recommenders', required: true, dataKey: 'recommenders' },
          { type: 'rating', label: 'Research Readiness Rating', dataKey: 'research_readiness', validation: { min: 1, max: 5 }, helperText: 'Rate your readiness for advanced research on a 1-5 scale.' },
        ],
      },
      {
        name: 'Supporting Documents',
        title: 'Supporting Documents',
        description: 'Upload required graduate application documents.',
        fields: [
          { type: 'document', label: 'Statement of Purpose', required: true, dataKey: 'statement_of_purpose_document', validation: { maxFiles: 1, fileTypes: ['.pdf', '.doc', '.docx'], maxFileSize: 10 } },
          { type: 'file-upload', label: 'Resume or CV', required: true, dataKey: 'resume', validation: { maxFiles: 1, fileTypes: ['.pdf', '.doc', '.docx'], maxFileSize: 10 } },
          { type: 'essay', label: 'Short Research Statement', dataKey: 'research_statement', validation: { wordLimit: 500 } },
        ],
      },
    ],
  },
  {
    id: 'scholarship',
    name: 'Scholarship Application',
    description: 'Scholarship-focused sections for merit, need, leadership, and commitments.',
    sections: [
      {
        name: 'Applicant Profile',
        title: 'Applicant Profile',
        description: 'Basic profile for scholarship review.',
        fields: [
          { type: 'short-text', label: 'Full Name', required: true, dataKey: 'full_name' },
          { type: 'email', label: 'Email Address', required: true, dataKey: 'email' },
          { type: 'country', label: 'Citizenship', required: true, dataKey: 'citizenship' },
          { type: 'number', label: 'Current GPA', required: true, dataKey: 'gpa', validation: { min: 0, max: 4 } },
        ],
      },
      {
        name: 'Financial Need',
        title: 'Financial Need',
        description: 'Describe your financial context and funding need.',
        fields: [
          { type: 'number', label: 'Requested Scholarship Amount', required: true, dataKey: 'requested_amount' },
          { type: 'long-text', label: 'Financial Need Statement', required: true, dataKey: 'financial_need_statement' },
          { type: 'file-upload', label: 'Proof of Financial Need', dataKey: 'financial_need_documents', validation: { maxFiles: 3, fileTypes: ['.pdf', '.jpg', '.jpeg', '.png'], maxFileSize: 10 } },
        ],
      },
      {
        name: 'Leadership and Service',
        title: 'Leadership and Service',
        description: 'Leadership experience and service involvement.',
        fields: [
          { type: 'repeating-group', label: 'Leadership and Service Experiences', dataKey: 'leadership_experiences' },
          { type: 'rating', label: 'Leadership Confidence', dataKey: 'leadership_confidence', validation: { min: 1, max: 5 } },
          { type: 'essay', label: 'Scholarship Essay', required: true, dataKey: 'scholarship_essay', validation: { wordLimit: 750 } },
        ],
      },
      {
        name: 'Certification',
        title: 'Certification',
        description: 'Final applicant acknowledgement.',
        fields: [
          { type: 'agreement', label: 'I certify that my scholarship application is complete and truthful.', required: true, dataKey: 'scholarship_agreement' },
        ],
      },
    ],
  },
  {
    id: 'international',
    name: 'International Student',
    description: 'Citizenship, English proficiency, funding, visa, and required documents.',
    sections: [
      {
        name: 'Identity and Contact',
        title: 'Identity and Contact',
        description: 'Identity and international contact details.',
        fields: [
          { type: 'short-text', label: 'Full Name', required: true, dataKey: 'full_name' },
          { type: 'email', label: 'Email Address', required: true, dataKey: 'email' },
          { type: 'phone', label: 'Phone Number', required: true, dataKey: 'phone' },
          { type: 'country', label: 'Country of Citizenship', required: true, dataKey: 'citizenship' },
          { type: 'document', label: 'Passport Copy', required: true, dataKey: 'passport_copy', validation: { maxFiles: 1, fileTypes: ['.pdf', '.jpg', '.jpeg', '.png'], maxFileSize: 10 } },
        ],
      },
      {
        name: 'Academic Preparation',
        title: 'Academic Preparation',
        description: 'Prior education and transcript records.',
        fields: [
          { type: 'repeating-group', label: 'Education History', required: true, dataKey: 'education_history' },
          { type: 'number', label: 'Current GPA', dataKey: 'gpa', validation: { min: 0, max: 4 } },
          { type: 'file-upload', label: 'Academic Transcript Files', required: true, dataKey: 'academic_transcripts', validation: { maxFiles: 5, fileTypes: ['.pdf', '.jpg', '.jpeg', '.png'], maxFileSize: 10 } },
        ],
      },
      {
        name: 'English Proficiency',
        title: 'English Proficiency',
        description: 'English-language requirements and waivers.',
        fields: [
          { type: 'number', label: 'IELTS Score', dataKey: 'ielts', validation: { min: 0, max: 9 } },
          { type: 'number', label: 'TOEFL Score', dataKey: 'toefl', validation: { min: 0, max: 120 } },
          { type: 'checkbox', label: 'English Waiver Basis', dataKey: 'english_waiver_basis', options: ['Native speaker', 'Prior English-medium study', 'Waiver requested'] },
        ],
      },
      {
        name: 'Finance and Visa',
        title: 'Finance and Visa',
        description: 'Financial support and immigration details.',
        fields: [
          { type: 'number', label: 'Available Annual Funding', required: true, dataKey: 'annual_funding' },
          { type: 'dropdown', label: 'Visa Sponsorship Needed', required: true, dataKey: 'visa_sponsorship_needed', options: ['Yes', 'No'] },
          { type: 'file-upload', label: 'Financial Support Documents', required: true, dataKey: 'financial_support_docs', validation: { maxFiles: 3, fileTypes: ['.pdf', '.jpg', '.jpeg', '.png'], maxFileSize: 10 } },
          { type: 'agreement', label: 'I understand that visa issuance is subject to university and embassy approval.', required: true, dataKey: 'visa_acknowledgement' },
        ],
      },
    ],
  },
];

export function ApplicationStructure({ onNavigate }: ApplicationStructureProps) {
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = universityId && isValidUUID(universityId) ? universityId : null;
  const linkedUniversityId = user?.universityLinked && isValidUUID(user.universityLinked) ? user.universityLinked : null;
  const resolvedUniversityId = routeUniversityId ?? linkedUniversityId;
  // State management
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showTemplatesDrawer, setShowTemplatesDrawer] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showFieldSettingsDrawer, setShowFieldSettingsDrawer] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ApplicationStructureVersion[]>([]);

  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      if (!resolvedUniversityId) {
        setLoadError('Missing valid university context. Please re-open from the partner dashboard.');
        setLoading(false);
        return;
      }
      try {
        const [schema, history] = await Promise.all([
          fetchPartnerApplicationStructure(),
          fetchPartnerApplicationStructureHistory(resolvedUniversityId, 20),
        ]);
        if (!mounted) return;

        const schemaSections = normalizeStructureSections(schema);
        setSections(schemaSections);
        setHistoryEntries(history);
        setAuditTrail(buildAuditTrail(history));
      } catch (err) {
        if (!mounted) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load application structure');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [reloadNonce, resolvedUniversityId]);

  useEffect(() => {
    if (sections.length === 0) {
      setSelectedSectionId(null);
      setSelectedFieldId(null);
      return;
    }
    if (!selectedSectionId || !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(sections[0].id);
      setSelectedFieldId(null);
    }
  }, [sections, selectedSectionId]);

  // Helper functions
  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const selectedField = selectedSection?.fields.find(f => f.id === selectedFieldId);

  const handleAddSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      name: 'New Section',
      title: 'New Section',
      description: '',
      order: sections.length + 1,
      visible: true,
      fields: [],
    };
    setSections([...sections, newSection]);
    setSelectedSectionId(newSection.id);
    setUnsavedChanges(true);
  };

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const duplicated: Section = {
      ...section,
      id: Date.now().toString(),
      name: `${section.name} (Copy)`,
      title: `${section.title} (Copy)`,
      order: sections.length + 1,
      fields: section.fields.map(f => ({ ...f, id: `${Date.now()}-${f.id}` })),
    };
    setSections([...sections, duplicated]);
    setUnsavedChanges(true);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setSelectedFieldId(null);
    }
    setUnsavedChanges(true);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
    setUnsavedChanges(true);
  };

  const handleAddField = (type: FieldType) => {
    if (!selectedSectionId) return;

    const section = sections.find(s => s.id === selectedSectionId);
    if (!section) return;

    const newField: Field = {
      id: Date.now().toString(),
      type,
      label: `New ${fieldTypeInfo[type].label}`,
      required: false,
      order: section.fields.length + 1,
      dataKey: `field_${Date.now()}`,
      exportLabel: `New ${fieldTypeInfo[type].label}`,
      visibility: { applicant: true, partner: true, staff: true },
    };

    // Add default options for choice fields
    if (['radio', 'checkbox', 'dropdown'].includes(type)) {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    setSections(sections.map(s =>
      s.id === selectedSectionId
        ? { ...s, fields: [...s.fields, newField] }
        : s
    ));

    setSelectedFieldId(newField.id);
    setShowAddQuestionModal(false);
    setUnsavedChanges(true);
  };

  const handleDuplicateField = (fieldId: string) => {
    if (!selectedSectionId) return;

    const section = sections.find(s => s.id === selectedSectionId);
    const field = section?.fields.find(f => f.id === fieldId);
    if (!field) return;

    const duplicated: Field = {
      ...field,
      id: Date.now().toString(),
      label: `${field.label} (Copy)`,
      order: section!.fields.length + 1,
    };

    setSections(sections.map(s =>
      s.id === selectedSectionId
        ? { ...s, fields: [...s.fields, duplicated] }
        : s
    ));
    setUnsavedChanges(true);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!selectedSectionId) return;

    setSections(sections.map(s =>
      s.id === selectedSectionId
        ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
        : s
    ));

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setUnsavedChanges(true);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<Field>) => {
    if (!selectedSectionId) return;

    setSections(sections.map(s =>
      s.id === selectedSectionId
        ? {
            ...s,
            fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
          }
        : s
    ));
    setUnsavedChanges(true);
  };

  const handleSaveDraft = async () => {
    if (!resolvedUniversityId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updatePartnerApplicationStructure({ sections });
      const history = await fetchPartnerApplicationStructureHistory(resolvedUniversityId, 20);
      setHistoryEntries(history);
      setAuditTrail(buildAuditTrail(history));
      setUnsavedChanges(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!resolvedUniversityId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updatePartnerApplicationStructure({ sections });
      await publishPartnerApplicationStructure(resolvedUniversityId, 'Published from manager application structure page');
      const history = await fetchPartnerApplicationStructureHistory(resolvedUniversityId, 20);
      setHistoryEntries(history);
      setAuditTrail(buildAuditTrail(history));
      setUnsavedChanges(false);
      setShowPublishWarning(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish application structure');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    setPendingTemplateId(templateId);
  };

  const handleConfirmTemplateReplace = () => {
    const template = APPLICATION_STRUCTURE_TEMPLATES.find((item) => item.id === pendingTemplateId);
    if (!template) {
      setPendingTemplateId(null);
      return;
    }

    const nextSections = cloneTemplateSections(template.sections);
    setSections(nextSections);
    setSelectedSectionId(nextSections[0]?.id ?? null);
    setSelectedFieldId(null);
    setShowTemplatesDrawer(false);
    setPendingTemplateId(null);
    setUnsavedChanges(true);
    setSaveError(null);
  };

  const latestPublishedVersion = useMemo(
    () => getLatestPublishedVersion(historyEntries),
    [historyEntries],
  );
  const publishStatus = useMemo(
    () => getPublishStatus(sections, latestPublishedVersion),
    [latestPublishedVersion, sections],
  );
  const publishStatusCopy = useMemo(
    () => getPublishStatusCopy(publishStatus),
    [publishStatus],
  );

  // Render functions
  const renderLeftPanel = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Sections</h2>
          <Button size="sm" onClick={handleAddSection} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 p-2">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No sections yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Create your first section to get started
            </p>
            <Button size="sm" onClick={handleAddSection} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Create Section
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={cn(
                  'group rounded-lg border-2 p-3 cursor-pointer transition-all',
                  selectedSectionId === section.id
                    ? 'border-primary bg-primary/6'
                    : 'border-transparent hover:border-border hover:bg-secondary/50'
                )}
                onClick={() => {
                  setSelectedSectionId(section.id);
                  setSelectedFieldId(null);
                }}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-medium truncate">{section.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {section.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                      </Badge>
                      {!section.visible && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSection(section.id);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sections.length > 0 && (
        <div className="p-3 border-t bg-secondary/30">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowTemplatesDrawer(true)}
          >
            <BookTemplate className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      )}
    </div>
  );

  const renderMiddlePanel = () => {
    if (!selectedSectionId) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4 mx-auto">
              <ChevronRight className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No section selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a section from the left panel to view and edit its fields, or create a new section to get started.
            </p>
          </div>
        </div>
      );
    }

    const section = sections.find(s => s.id === selectedSectionId);
    if (!section) return null;

    return (
      <div className="h-full flex flex-col">
        {/* Section header */}
        <div className="p-6 border-b bg-card">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name (Internal)</Label>
              <Input
                id="section-name"
                value={section.name}
                onChange={(e) => handleUpdateSection(section.id, { name: e.target.value })}
                placeholder="e.g., Personal Information"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title (Shown to Applicants)</Label>
              <Input
                id="section-title"
                value={section.title}
                onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                placeholder="e.g., Tell us about yourself"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                value={section.description}
                onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                placeholder="Brief description of this section"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="section-visible"
                  checked={section.visible}
                  onCheckedChange={(checked) => handleUpdateSection(section.id, { visible: checked })}
                />
                <Label htmlFor="section-visible" className="cursor-pointer">
                  Section visible to applicants
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Fields list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Form Fields</h3>
              <p className="text-sm text-muted-foreground">
                {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowTemplatesDrawer(true)}
              >
                <BookTemplate className="h-3.5 w-3.5" />
                From Template
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddQuestionModal(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </Button>
            </div>
          </div>

          {section.fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-lg">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-3">
                <Plus className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-1">No questions yet</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Add your first question to this section
              </p>
              <Button onClick={() => setShowAddQuestionModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {section.fields.map((field, index) => {
                const FieldIcon = fieldTypeInfo[field.type].icon;
                const isSelected = selectedFieldId === field.id;

                return (
                  <Card
                    key={field.id}
                    className={cn(
                      'cursor-pointer transition-all border-2',
                      isSelected
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/30 hover:shadow-sm'
                    )}
                    onClick={() => {
                      setSelectedFieldId(field.id);
                      // On narrow viewports, open the drawer when field is selected
                      if (window.innerWidth < 1280) {
                        setShowFieldSettingsDrawer(true);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0 cursor-move" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                              <FieldIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {index + 1}
                                </span>
                                <h4 className="text-sm font-medium truncate">{field.label}</h4>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              {field.helperText && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {field.helperText}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {fieldTypeInfo[field.type].label}
                            </Badge>
                            {field.validation?.wordLimit && (
                              <Badge variant="secondary" className="text-xs">
                                Max {field.validation.wordLimit} words
                              </Badge>
                            )}
                            {field.validation?.fileTypes && (
                              <Badge variant="secondary" className="text-xs">
                                {field.validation.fileTypes.join(', ')}
                              </Badge>
                            )}
                            {field.conditional && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Zap className="h-3 w-3" />
                                Conditional
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateField(field.id);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRightPanel = () => {
    if (!selectedFieldId || !selectedField) {
      return (
        <div className="h-full flex items-center justify-center p-8 bg-secondary/20">
          <div className="text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 mb-4 mx-auto">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No field selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a field from the form builder to edit its settings and configuration.
            </p>
          </div>
        </div>
      );
    }

    const FieldIcon = fieldTypeInfo[selectedField.type].icon;

    return (
      <div className="h-full">
        <div className="p-6 space-y-6 bg-secondary/20">
          {/* Field type indicator */}
          <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
            <div className="brand-icon-tile flex h-10 w-10 items-center justify-center rounded-xl">
              <FieldIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Field Type</p>
              <p className="font-medium">{fieldTypeInfo[selectedField.type].label}</p>
            </div>
          </div>

          {/* Basic settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-label">Label</Label>
                <Input
                  id="field-label"
                  value={selectedField.label}
                  onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                  placeholder="Question or field label"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-helper">Helper Text</Label>
                <Textarea
                  id="field-helper"
                  value={selectedField.helperText || ''}
                  onChange={(e) => handleUpdateField(selectedField.id, { helperText: e.target.value })}
                  placeholder="Additional guidance for applicants"
                  rows={2}
                />
              </div>

              {['short-text', 'long-text', 'email', 'phone', 'number', 'country', 'essay'].includes(selectedField.type) && (
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                    placeholder="e.g., Enter your answer here..."
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="field-required">Required field</Label>
                <Switch
                  id="field-required"
                  checked={selectedField.required}
                  onCheckedChange={(checked) => handleUpdateField(selectedField.id, { required: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Options for choice fields */}
          {['radio', 'checkbox', 'dropdown'].includes(selectedField.type) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedField.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(selectedField.options || [])];
                        newOptions[index] = e.target.value;
                        handleUpdateField(selectedField.id, { options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const newOptions = (selectedField.options || []).filter((_, i) => i !== index);
                        handleUpdateField(selectedField.id, { options: newOptions });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                    handleUpdateField(selectedField.id, { options: newOptions });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Validation rules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['short-text', 'long-text'].includes(selectedField.type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="min-length">Min Length</Label>
                    <Input
                      id="min-length"
                      type="number"
                      value={selectedField.validation?.minLength || ''}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          validation: { ...selectedField.validation, minLength: parseInt(e.target.value) || undefined },
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-length">Max Length</Label>
                    <Input
                      id="max-length"
                      type="number"
                      value={selectedField.validation?.maxLength || ''}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          validation: { ...selectedField.validation, maxLength: parseInt(e.target.value) || undefined },
                        })
                      }
                      placeholder="8"
                    />
                  </div>
                </div>
              )}

              {['number', 'rating'].includes(selectedField.type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="min-value">Minimum</Label>
                    <Input
                      id="min-value"
                      type="number"
                      value={selectedField.validation?.min || ''}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          validation: { ...selectedField.validation, min: parseFloat(e.target.value) || undefined },
                        })
                      }
                      placeholder="No min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-value">Maximum</Label>
                    <Input
                      id="max-value"
                      type="number"
                      value={selectedField.validation?.max || ''}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          validation: { ...selectedField.validation, max: parseFloat(e.target.value) || undefined },
                        })
                      }
                      placeholder="No max"
                    />
                  </div>
                </div>
              )}

              {selectedField.type === 'essay' && (
                <div className="space-y-2">
                  <Label htmlFor="word-limit">Word Limit</Label>
                  <Input
                    id="word-limit"
                    type="number"
                    value={selectedField.validation?.wordLimit || ''}
                    onChange={(e) =>
                      handleUpdateField(selectedField.id, {
                        validation: { ...selectedField.validation, wordLimit: parseInt(e.target.value) || undefined },
                      })
                    }
                    placeholder="e.g., 500"
                  />
                </div>
              )}

              {['file-upload', 'document'].includes(selectedField.type) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="file-types">Allowed File Types</Label>
                    <Input
                      id="file-types"
                      value={(selectedField.validation?.fileTypes || []).join(', ')}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          validation: {
                            ...selectedField.validation,
                            fileTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                          },
                        })
                      }
                      placeholder="PDF, DOC, DOCX"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="max-size">Max Size (MB)</Label>
                      <Input
                        id="max-size"
                        type="number"
                        value={selectedField.validation?.maxFileSize || ''}
                        onChange={(e) =>
                          handleUpdateField(selectedField.id, {
                            validation: { ...selectedField.validation, maxFileSize: parseInt(e.target.value) || undefined },
                          })
                        }
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-files">Max Files</Label>
                      <Input
                        id="max-files"
                        type="number"
                        value={selectedField.validation?.maxFiles || ''}
                        onChange={(e) =>
                          handleUpdateField(selectedField.id, {
                            validation: { ...selectedField.validation, maxFiles: parseInt(e.target.value) || undefined },
                          })
                        }
                        placeholder="1"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Conditional Logic */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conditional Logic</CardTitle>
                <Switch
                  checked={!!selectedField.conditional}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      conditional: checked ? { show: true, rules: [] } : undefined,
                    })
                  }
                />
              </div>
              <CardDescription className="text-xs">
                Show this field only when certain conditions are met
              </CardDescription>
            </CardHeader>
            {selectedField.conditional && (
              <CardContent className="space-y-3">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This field will only show when conditions are met
                  </AlertDescription>
                </Alert>
                <Button size="sm" variant="outline" className="w-full gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add Rule
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Data Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Mapping</CardTitle>
              <CardDescription className="text-xs">
                Configure how this field's data is stored and exported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data-key">Internal Key</Label>
                <Input
                  id="data-key"
                  value={selectedField.dataKey || ''}
                  onChange={(e) => handleUpdateField(selectedField.id, { dataKey: e.target.value })}
                  placeholder="field_name"
                />
                <p className="text-xs text-muted-foreground">Used in database and API</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-label">Export Label</Label>
                <Input
                  id="export-label"
                  value={selectedField.exportLabel || ''}
                  onChange={(e) => handleUpdateField(selectedField.id, { exportLabel: e.target.value })}
                  placeholder="Column name in exports"
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility & Permissions</CardTitle>
              <CardDescription className="text-xs">
                Control who can see and edit this field
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vis-applicant">Applicant</Label>
                </div>
                <Switch
                  id="vis-applicant"
                  checked={selectedField.visibility?.applicant !== false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      visibility: { ...resolveFieldVisibility(selectedField.visibility), applicant: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vis-partner">Partner</Label>
                </div>
                <Switch
                  id="vis-partner"
                  checked={selectedField.visibility?.partner !== false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      visibility: { ...resolveFieldVisibility(selectedField.visibility), partner: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vis-staff">Staff</Label>
                </div>
                <Switch
                  id="vis-staff"
                  checked={selectedField.visibility?.staff !== false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      visibility: { ...resolveFieldVisibility(selectedField.visibility), staff: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Delete field */}
          <Card className="border-destructive/50">
            <CardContent className="p-4">
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground gap-2"
                onClick={() => handleDeleteField(selectedField.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Field
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    return (
      <div className="h-full overflow-y-auto bg-background p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Application Form Preview</h1>
            <p className="text-sm text-muted-foreground">
              This preview reflects the current draft. Applicants see the last published structure until you publish these changes.
            </p>
          </div>

          {sections.filter(s => s.visible).map((section, sectionIndex) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
                    {sectionIndex + 1}
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                </div>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {section.fields.filter(f => f.visibility?.applicant !== false).map((field) => {
                  const FieldIcon = fieldTypeInfo[field.type].icon;
                  const ratingMax = Math.max(1, Number(field.validation?.max || 5));
                  
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FieldIcon className="h-4 w-4 text-muted-foreground" />
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>
                      {field.helperText && (
                        <p className="text-sm text-muted-foreground">{field.helperText}</p>
                      )}
                      
                      {/* Render preview based on field type */}
                      {['short-text', 'email', 'phone'].includes(field.type) && (
                        <Input placeholder={field.placeholder || 'Your answer'} disabled />
                      )}
                      {['long-text', 'essay'].includes(field.type) && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder={field.placeholder || 'Your answer'}
                            rows={4}
                            disabled
                          />
                          {field.validation?.wordLimit && (
                            <p className="text-xs text-muted-foreground">
                              Maximum {field.validation.wordLimit} words
                            </p>
                          )}
                        </div>
                      )}
                      {field.type === 'date' && (
                        <Input type="date" disabled />
                      )}
                      {field.type === 'number' && (
                        <Input type="number" placeholder={field.placeholder || '0'} disabled />
                      )}
                      {field.type === 'radio' && (
                        <div className="space-y-2">
                          {(field.options || []).map((option, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" disabled />
                              <span className="text-sm">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {field.type === 'checkbox' && (
                        <div className="space-y-2">
                          {(field.options || []).map((option, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" disabled />
                              <span className="text-sm">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {field.type === 'dropdown' && (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </Select>
                      )}
                      {field.type === 'country' && (
                        <Input placeholder={field.placeholder || 'Type country name...'} disabled />
                      )}
                      {['file-upload', 'document'].includes(field.type) && (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">
                            Click to upload or drag and drop
                          </p>
                          {field.validation?.fileTypes && (
                            <p className="text-xs text-muted-foreground">
                              {field.validation.fileTypes.join(', ')} (Max {field.validation.maxFileSize}MB)
                            </p>
                          )}
                        </div>
                      )}
                      {field.type === 'agreement' && (
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <input type="checkbox" className="mt-1" disabled />
                          <span className="text-sm">{field.label}</span>
                        </div>
                      )}
                      {field.type === 'rating' && (
                        <div className="rounded-lg border p-4">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: ratingMax }).map((_, index) => (
                              <Star key={index} className="h-5 w-5 text-muted-foreground" />
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Scale from {field.validation?.min ?? 1} to {ratingMax}
                          </p>
                        </div>
                      )}
                      {field.type === 'address' && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input placeholder="Street address" disabled className="md:col-span-2" />
                          <Input placeholder="City" disabled />
                          <Input placeholder="State / Province" disabled />
                          <Input placeholder="Postal code" disabled />
                          <Input placeholder="Country" disabled />
                        </div>
                      )}
                      {field.type === 'recommender' && (
                        <div className="space-y-3 rounded-lg border p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input placeholder="Recommender name" disabled />
                            <Input placeholder="Recommender email" disabled />
                          </div>
                          <Input placeholder="Relationship to applicant" disabled />
                        </div>
                      )}
                      {field.type === 'repeating-group' && (
                        <div className="space-y-3">
                          {[1, 2].map((entry) => (
                            <div key={entry} className="rounded-lg border p-4">
                              <div className="mb-3 text-sm font-medium">Entry {entry}</div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <Input placeholder="Institution or item name" disabled />
                                <Input placeholder="Country / category" disabled />
                                <Input placeholder="Degree / role" disabled />
                                <Input placeholder="Year / duration" disabled />
                              </div>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="gap-2" disabled>
                            <Plus className="h-3.5 w-3.5" />
                            Add another entry
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const pendingTemplate = APPLICATION_STRUCTURE_TEMPLATES.find((item) => item.id === pendingTemplateId) ?? null;

  if (loading) {
    return <LoadingState label="Loading application structure..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => setReloadNonce((current) => current + 1)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="brand-icon-tile flex h-10 w-10 items-center justify-center rounded-xl">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Application Structure</h1>
                <p className="text-xs text-muted-foreground">
                  Design your application form
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Badge
                variant={publishStatus === 'published' ? 'default' : 'secondary'}
                className="gap-1.5"
              >
                {publishStatus === 'published' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {publishStatusCopy.label}
                  </>
                ) : publishStatus === 'draft-changes-not-published' ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    {publishStatusCopy.label}
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    {publishStatusCopy.label}
                  </>
                )}
              </Badge>
              <p className="max-w-[42rem] text-xs text-muted-foreground">
                {publishStatusCopy.description}
              </p>
            </div>

            {unsavedChanges && (
              <Badge variant="outline" className="gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Unsaved
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onNavigate ? (
              <Button variant="outline" size="sm" onClick={() => onNavigate('partner-dashboard')}>
                Back
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAuditTrail(true)}
            >
              <History className="h-4 w-4" />
              History
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Tabs value={previewMode ? 'preview' : 'edit'} onValueChange={(v) => setPreviewMode(v === 'preview')}>
              <TabsList className="h-9">
                <TabsTrigger value="edit" className="gap-1.5 text-xs">
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!unsavedChanges || saving || loading}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              size="sm"
              onClick={() => setShowPublishWarning(true)}
              disabled={saving || loading}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Publish Changes
            </Button>
          </div>
        </div>
        {saveError && <div className="px-6 pb-3 text-sm text-red-600">{saveError}</div>}
        {loading && <div className="px-6 pb-3 text-sm text-muted-foreground">Loading application structure...</div>}
      </div>

      {/* Main Content Area - Responsive 3-Column Grid */}
      <div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
        {previewMode ? (
          renderPreview()
        ) : (
          <>
            {/* Left Panel - Sections List (Fixed Width 240-280px) */}
            <div className="w-full flex-shrink-0 overflow-y-auto border-b bg-card xl:w-64 xl:border-b-0 xl:border-r">
              {renderLeftPanel()}
            </div>

            {/* Middle Panel - Form Builder (Flexible, fills remaining space) */}
            <div className="flex-1 min-w-0 overflow-y-auto bg-background">
              {renderMiddlePanel()}
            </div>

            {/* Right Panel - Field Settings (Fixed Width 340-420px) */}
            {/* Desktop: Always visible as sidebar */}
            {/* Mobile/Narrow: Shown as drawer overlay */}
            <div className="hidden xl:block w-[380px] flex-shrink-0 border-l bg-card overflow-y-auto">
              {renderRightPanel()}
            </div>

            {/* Mobile Field Settings Drawer */}
            <Sheet open={showFieldSettingsDrawer && selectedFieldId !== null} onOpenChange={setShowFieldSettingsDrawer}>
              <SheetContent side="right" className="w-full max-w-[540px] p-0 overflow-y-auto sm:w-[540px]">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle>Field Settings</SheetTitle>
                  <SheetDescription>
                    Configure field properties and validation
                  </SheetDescription>
                </SheetHeader>
                <div className="p-6">
                  {renderRightPanel()}
                </div>
              </SheetContent>
            </Sheet>

            {/* Field Settings Button for narrow viewports */}
            {selectedFieldId && (
              <button
                onClick={() => setShowFieldSettingsDrawer(true)}
                className="fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-white shadow-[0_24px_44px_-24px_rgba(20,90,67,0.6)] transition-opacity hover:bg-brand-primary-hover xl:hidden"
              >
                <Settings className="h-4 w-4" />
                Field Settings
              </button>
            )}
          </>
        )}
      </div>

      {/* Add Question Type Modal */}
      <Dialog open={showAddQuestionModal} onOpenChange={setShowAddQuestionModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Question Type</DialogTitle>
            <DialogDescription>
              Select the type of question or field you want to add
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
            {Object.entries(fieldTypeInfo).map(([type, info]) => {
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleAddField(type as FieldType)}
                  className="flex items-start gap-3 rounded-lg border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-primary/6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-0.5">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Drawer */}
      <Sheet open={showTemplatesDrawer} onOpenChange={setShowTemplatesDrawer}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Application Templates</SheetTitle>
            <SheetDescription>
              Choose from working templates that replace the current draft structure
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {APPLICATION_STRUCTURE_TEMPLATES.map((template) => (
              <Card key={template.id} className="cursor-pointer transition-colors hover:border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-medium mb-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <BookTemplate className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>{template.sections.length} sections</span>
                    <span>•</span>
                    <span>{template.sections.reduce((count, section) => count + section.fields.length, 0)} fields</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleLoadTemplate(template.id)}
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={pendingTemplate !== null} onOpenChange={(open) => { if (!open) setPendingTemplateId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current draft with template?</DialogTitle>
            <DialogDescription>
              {pendingTemplate
                ? `${pendingTemplate.name} will replace the current draft structure. Applicants will still see the last published version until you save and publish this draft.`
                : 'This template will replace the current draft structure. Applicants will still see the last published version until you publish the new draft.'}
            </DialogDescription>
          </DialogHeader>

          {pendingTemplate ? (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="font-medium">{pendingTemplate.name}</div>
              <div className="mt-1 text-muted-foreground">{pendingTemplate.description}</div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{pendingTemplate.sections.length} sections</span>
                <span>•</span>
                <span>{pendingTemplate.sections.reduce((count, section) => count + section.fields.length, 0)} fields</span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingTemplateId(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTemplateReplace}>
              Replace draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Warning Dialog */}
      <Dialog open={showPublishWarning} onOpenChange={setShowPublishWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Publish Application Structure
            </DialogTitle>
            <DialogDescription>
              Publishing will make this draft the structure applicants see next.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Applicants see the last published version, not the current draft. Existing applications will continue to use the previous version.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Changes to be published:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{sections.length} sections configured</li>
              <li>{sections.reduce((acc, s) => acc + s.fields.length, 0)} total fields</li>
              <li>Last saved: Just now</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishWarning(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={showAuditTrail} onOpenChange={setShowAuditTrail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Change History
            </DialogTitle>
            <DialogDescription>
              View all changes made to this application structure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {auditTrail.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No draft saves or publishes have been recorded yet.
              </div>
            ) : auditTrail.map((entry, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{entry.user}</p>
                    <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{entry.details}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {entry.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

