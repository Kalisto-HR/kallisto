// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  FileCheck,
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
import { useParams } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { fetchAdminApplicationStructure, updateAdminApplicationStructure } from '../../services/admin/universitiesService';
import { fetchApplicationStructureHistory, publishApplicationStructure } from '../../services/admin/managerService';
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
    reviewer: boolean;
    admin: boolean;
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

type PublishStatus = 'draft' | 'published';

// Field type metadata
const fieldTypeInfo: Record<FieldType, { icon: any; label: string; description: string }> = {
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

export function ApplicationStructure({ onNavigate }: ApplicationStructureProps) {
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = universityId && isValidUUID(universityId) ? universityId : null;
  const linkedUniversityId = user?.universityLinked && isValidUUID(user.universityLinked) ? user.universityLinked : null;
  const resolvedUniversityId = routeUniversityId ?? linkedUniversityId;
  // State management
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('draft');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showTemplatesDrawer, setShowTemplatesDrawer] = useState(false);
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showFieldSettingsDrawer, setShowFieldSettingsDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sample data
  const [sections, setSections] = useState<Section[]>([
    {
      id: '1',
      name: 'Personal Information',
      title: 'Personal Information',
      description: 'Basic details about the applicant',
      order: 1,
      visible: true,
      fields: [
        {
          id: 'f1',
          type: 'short-text',
          label: 'Full Name',
          helperText: 'Enter your full legal name as it appears on official documents',
          required: true,
          order: 1,
          dataKey: 'full_name',
          exportLabel: 'Applicant Full Name',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
        {
          id: 'f2',
          type: 'email',
          label: 'Email Address',
          helperText: 'We will use this email for all communications',
          required: true,
          order: 2,
          dataKey: 'email',
          exportLabel: 'Email',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
        {
          id: 'f3',
          type: 'date',
          label: 'Date of Birth',
          required: true,
          order: 3,
          dataKey: 'dob',
          exportLabel: 'Date of Birth',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
        {
          id: 'f4',
          type: 'country',
          label: 'Country of Citizenship',
          required: true,
          order: 4,
          dataKey: 'citizenship',
          exportLabel: 'Citizenship',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
      ],
    },
    {
      id: '2',
      name: 'Education Background',
      title: 'Educational Background',
      description: 'Your previous education history',
      order: 2,
      visible: true,
      fields: [
        {
          id: 'f5',
          type: 'repeating-group',
          label: 'Previous Education',
          helperText: 'Add all your previous educational institutions',
          required: true,
          order: 1,
          dataKey: 'education_history',
          exportLabel: 'Education History',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
        {
          id: 'f6',
          type: 'number',
          label: 'GPA (4.0 scale)',
          helperText: 'Enter your cumulative GPA',
          required: true,
          order: 2,
          validation: { min: 0, max: 4.0 },
          dataKey: 'gpa',
          exportLabel: 'GPA',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
      ],
    },
    {
      id: '3',
      name: 'Essays',
      title: 'Essay Responses',
      description: 'Please respond to the following prompts',
      order: 3,
      visible: true,
      fields: [
        {
          id: 'f7',
          type: 'essay',
          label: 'Statement of Purpose',
          helperText: 'Describe your academic interests, career goals, and reasons for applying to this program',
          required: true,
          order: 1,
          validation: { wordLimit: 500 },
          dataKey: 'statement_of_purpose',
          exportLabel: 'Statement of Purpose',
          visibility: { applicant: true, reviewer: true, admin: true },
        },
      ],
    },
  ]);

  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([
    {
      timestamp: '2025-01-20 14:32',
      user: 'Sarah Chen',
      action: 'Created',
      details: 'Created new application structure',
    },
    {
      timestamp: '2025-01-20 15:45',
      user: 'Sarah Chen',
      action: 'Modified',
      details: 'Added Essay section with Statement of Purpose',
    },
    {
      timestamp: '2025-01-19 11:20',
      user: 'David Park',
      action: 'Published',
      details: 'Published version 1.2 of application structure',
    },
  ]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!resolvedUniversityId) {
        setSaveError('Missing valid university context. Please re-open from the management dashboard.');
        setLoading(false);
        return;
      }
      try {
        const [schema, history] = await Promise.all([
          fetchAdminApplicationStructure(resolvedUniversityId),
          fetchApplicationStructureHistory(resolvedUniversityId, 20),
        ]);
        if (!mounted) return;

        const schemaSections = Array.isArray((schema as any)?.sections)
          ? ((schema as any).sections as Section[])
          : null;
        if (schemaSections && schemaSections.length > 0) {
          setSections(schemaSections);
        }

        setAuditTrail(history.map((item) => ({
          timestamp: new Date(item.createdAt).toLocaleString('en-US'),
          user: item.changedBy ?? 'System',
          action: item.published ? 'Published' : 'Saved',
          details: item.changeNote ?? `Version ${item.versionNo}`,
        })));

        const hasPublished = history.some((item) => item.published);
        setPublishStatus(hasPublished ? 'published' : 'draft');
      } catch (err) {
        if (!mounted) return;
        setSaveError(err instanceof Error ? err.message : 'Failed to load application structure');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [resolvedUniversityId]);

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
      visibility: { applicant: true, reviewer: true, admin: true },
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
      await updateAdminApplicationStructure(resolvedUniversityId, { sections });
      const history = await fetchApplicationStructureHistory(resolvedUniversityId, 20);
      setAuditTrail(history.map((item) => ({
        timestamp: new Date(item.createdAt).toLocaleString('en-US'),
        user: item.changedBy ?? 'System',
        action: item.published ? 'Published' : 'Saved',
        details: item.changeNote ?? `Version ${item.versionNo}`,
      })));
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
      await updateAdminApplicationStructure(resolvedUniversityId, { sections });
      await publishApplicationStructure(resolvedUniversityId, 'Published from manager application structure page');
      const history = await fetchApplicationStructureHistory(resolvedUniversityId, 20);
      setAuditTrail(history.map((item) => ({
        timestamp: new Date(item.createdAt).toLocaleString('en-US'),
        user: item.changedBy ?? 'System',
        action: item.published ? 'Published' : 'Saved',
        details: item.changeNote ?? `Version ${item.versionNo}`,
      })));
      setPublishStatus('published');
      setUnsavedChanges(false);
      setShowPublishWarning(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish application structure');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    // Load template logic here
    setShowTemplatesDrawer(false);
    setUnsavedChanges(true);
  };

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
                    ? 'border-[#4F46E5] bg-[#4F46E5]/5'
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
                        ? 'border-[#4F46E5] shadow-md'
                        : 'border-border hover:border-[#4F46E5]/50 hover:shadow-sm'
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
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

              {['short-text', 'long-text', 'email', 'number'].includes(selectedField.type) && (
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
                      placeholder="∞"
                    />
                  </div>
                </div>
              )}

              {selectedField.type === 'number' && (
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
                      visibility: { ...selectedField.visibility, applicant: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vis-reviewer">Reviewer</Label>
                </div>
                <Switch
                  id="vis-reviewer"
                  checked={selectedField.visibility?.reviewer !== false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      visibility: { ...selectedField.visibility, reviewer: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vis-admin">Admin</Label>
                </div>
                <Switch
                  id="vis-admin"
                  checked={selectedField.visibility?.admin !== false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      visibility: { ...selectedField.visibility, admin: checked },
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
              This is how applicants will see your application form
            </p>
          </div>

          {sections.filter(s => s.visible).map((section, sectionIndex) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F46E5] text-white text-sm font-medium">
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
                          <span className="text-sm">{field.helperText || 'I agree to the terms and conditions'}</span>
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Application Structure</h1>
                <p className="text-xs text-muted-foreground">
                  Design your application form
                </p>
              </div>
            </div>
            
            <Badge
              variant={publishStatus === 'published' ? 'default' : 'secondary'}
              className="gap-1.5"
            >
              {publishStatus === 'published' ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Published
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  Draft
                </>
              )}
            </Badge>

            {unsavedChanges && (
              <Badge variant="outline" className="gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Unsaved
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                className="fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-3 text-white shadow-lg transition-opacity hover:opacity-90 xl:hidden"
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
                  className="flex items-start gap-3 p-4 rounded-lg border-2 border-border hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 transition-all text-left"
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
              Choose from pre-built templates or industry standards
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {[
              {
                id: 'common-app',
                name: 'Common App Standard',
                description: 'Based on the Common Application format used by 900+ universities',
                sections: 6,
                fields: 42,
              },
              {
                id: 'graduate',
                name: 'Graduate Program',
                description: 'Standard application for Master\'s and PhD programs',
                sections: 8,
                fields: 35,
              },
              {
                id: 'scholarship',
                name: 'Scholarship Application',
                description: 'Additional sections for scholarship applications',
                sections: 4,
                fields: 18,
              },
              {
                id: 'international',
                name: 'International Student',
                description: 'Includes visa, financial proof, and language proficiency',
                sections: 7,
                fields: 38,
              },
            ].map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-[#4F46E5] transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-medium mb-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <BookTemplate className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>{template.sections} sections</span>
                    <span>•</span>
                    <span>{template.fields} fields</span>
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

      {/* Publish Warning Dialog */}
      <Dialog open={showPublishWarning} onOpenChange={setShowPublishWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Publish Application Structure
            </DialogTitle>
            <DialogDescription>
              Publishing will make these changes live for new applicants
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Publishing will affect all future applicants. Existing applications will continue to use the previous version.
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
            {auditTrail.map((entry, index) => (
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

