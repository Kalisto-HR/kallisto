export type SchemaFieldType =
  | "short-text"
  | "long-text"
  | "email"
  | "phone"
  | "date"
  | "number"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "country"
  | "essay"
  | "agreement"
  | "file-upload"
  | "document"
  | "rating"
  | "address"
  | "repeating-group"
  | "recommender";

export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  dataKey?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    wordLimit?: number;
    fileTypes?: string[];
    maxFileSize?: number;
    maxFiles?: number;
  };
  visibility?: {
    applicant?: boolean;
    reviewer?: boolean;
    admin?: boolean;
  };
}

export interface SchemaSection {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  order?: number;
  visible?: boolean;
  fields: SchemaField[];
}

export const fallbackApplicantSchemaSection: SchemaSection = {
  id: "personal-info",
  title: "Personal Information",
  description: "Basic applicant details",
  fields: [
    { id: "full_name", type: "short-text", label: "Full Name", required: true, dataKey: "full_name" },
    { id: "email", type: "email", label: "Email", required: true, dataKey: "email" },
    { id: "dob", type: "date", label: "Date of Birth", required: true, dataKey: "dob" },
    { id: "citizenship", type: "country", label: "Country of Citizenship", required: true, dataKey: "citizenship" },
  ],
};

export function getApplicantSchemaSections(rawSchema: Record<string, unknown> | null): SchemaSection[] {
  const sectionsRaw = Array.isArray(rawSchema?.sections) ? rawSchema.sections : [];
  const sections = sectionsRaw
    .filter((section): section is SchemaSection => {
      if (!section || typeof section !== "object") {
        return false;
      }
      const maybeSection = section as Record<string, unknown>;
      return Array.isArray(maybeSection.fields);
    })
    .map((section) => {
      const current = section as SchemaSection;
      const fields = current.fields
        .filter((field): field is SchemaField => !!field && typeof field === "object")
        .filter((field) => field.visibility?.applicant !== false)
        .sort((left, right) => {
          const leftOrder =
            typeof (left as SchemaField & { order?: number }).order === "number"
              ? (left as SchemaField & { order?: number }).order ?? 0
              : 0;
          const rightOrder =
            typeof (right as SchemaField & { order?: number }).order === "number"
              ? (right as SchemaField & { order?: number }).order ?? 0
              : 0;
          return leftOrder - rightOrder;
        });

      return {
        ...current,
        fields,
      };
    })
    .filter((section) => section.visible !== false)
    .filter((section) => section.fields.length > 0);

  sections.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  return sections;
}
