import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

type UnknownRecord = Record<string, unknown>;

interface SubmittedApplicationDataViewProps {
  data: UnknownRecord | null;
  applicationSchema: UnknownRecord | null;
}

interface SchemaSectionMeta {
  id: string;
  title: string;
  sectionOrder: number;
}

interface SchemaFieldMeta {
  key: string;
  label: string;
  sectionId: string;
  sectionOrder: number;
  fieldOrder: number;
}

interface SectionFieldEntry {
  key: string;
  label: string;
  value: unknown;
  payloadOrder: number;
  fieldOrder: number;
}

interface RenderSection {
  id: string;
  title: string;
  fields: SectionFieldEntry[];
}

const TECHNICAL_KEYS = new Set([
  "id",
  "normalized",
  "profile_test_score_id",
  "imported_at",
  "created_at",
  "updated_at",
  "user_id",
  "university_id",
  "application_cycle",
]);

const TECHNICAL_SUFFIXES = ["_id"];

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function toSchemaSections(schema: UnknownRecord | null): Array<{ section: SchemaSectionMeta; fields: SchemaFieldMeta[] }> {
  const rawSections = Array.isArray(schema?.sections) ? schema.sections : [];
  const sections: Array<{ section: SchemaSectionMeta; fields: SchemaFieldMeta[] }> = [];

  rawSections.forEach((rawSection, sectionIndex) => {
    const sectionObj = toRecord(rawSection);
    if (!sectionObj) {
      return;
    }

    const sectionId = getString(sectionObj.id) || `section-${sectionIndex}`;
    const sectionTitle = getString(sectionObj.title) || getString(sectionObj.name) || `Section ${sectionIndex + 1}`;
    const rawFields = Array.isArray(sectionObj.fields) ? sectionObj.fields : [];
    const fields: SchemaFieldMeta[] = [];

    rawFields.forEach((rawField, fieldIndex) => {
      const fieldObj = toRecord(rawField);
      if (!fieldObj) {
        return;
      }

      const key = getString(fieldObj.dataKey) || getString(fieldObj.id);
      if (!key) {
        return;
      }

      fields.push({
        key,
        label: getString(fieldObj.label) || prettyLabel(key),
        sectionId,
        sectionOrder: sectionIndex,
        fieldOrder: fieldIndex,
      });
    });

    sections.push({
      section: {
        id: sectionId,
        title: sectionTitle,
        sectionOrder: sectionIndex,
      },
      fields,
    });
  });

  return sections;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function isTechnicalKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (TECHNICAL_KEYS.has(normalized)) {
    return true;
  }
  return TECHNICAL_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoDateTimeString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function formatDateLike(value: string, keyHint: string): string | null {
  const lowerHint = keyHint.toLowerCase();
  const hasDateHint =
    lowerHint.includes("date") ||
    lowerHint.includes("dob") ||
    lowerHint.includes("birth") ||
    lowerHint.includes("submitted") ||
    lowerHint.includes("created") ||
    lowerHint.includes("taken");

  if (!hasDateHint && !isDateOnlyString(value) && !isIsoDateTimeString(value)) {
    return null;
  }

  if (isDateOnlyString(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (isIsoDateTimeString(value)) {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function isScoreObject(value: unknown): value is UnknownRecord {
  const record = toRecord(value);
  if (!record) {
    return false;
  }
  const hasScore = typeof record.score === "number" || typeof record.score === "string";
  const hasOutOf = typeof record.out_of === "number" || typeof record.outOf === "number";
  const hasTestType = typeof record.test_type === "string" || typeof record.testType === "string";
  return hasScore && (hasOutOf || hasTestType);
}

function isScoreArray(value: unknown): value is UnknownRecord[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isScoreObject(item));
}

function getScoreDisplay(score: unknown, outOf: unknown): string {
  const scoreValue = typeof score === "number" || typeof score === "string" ? String(score) : "Not provided";
  const outOfValue = typeof outOf === "number" || typeof outOf === "string" ? String(outOf) : null;
  return outOfValue ? `${scoreValue} / ${outOfValue}` : scoreValue;
}

function renderPrimitive(value: string | number | boolean, keyHint: string): ReactNode {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    const formatted = formatDateLike(value, keyHint);
    return formatted ?? value;
  }

  return String(value);
}

function renderValue(value: unknown, keyHint: string, showTechnicalFields: boolean, depth = 0): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not provided</span>;
  }

  if (depth > 4) {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted/20 p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (isPrimitive(value)) {
    return renderPrimitive(value, keyHint);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">No items</span>;
    }

    const allPrimitive = value.every((item) => item === null || item === undefined || isPrimitive(item));
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge key={`${keyHint}-item-${index}`} variant="secondary">
              {item === null || item === undefined || item === "" ? "Not provided" : String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    if (isScoreArray(value)) {
      return (
        <div className="space-y-3">
          {value.map((item, index) => {
            const testType = getString(item.test_type) || getString(item.testType) || "Test";
            const otherTestName = getString(item.other_test_name) || getString(item.otherTestName);
            const takenOnRaw = getString(item.taken_on) || getString(item.takenOn);
            const takenOnDisplay = takenOnRaw ? formatDateLike(takenOnRaw, "taken_on") ?? takenOnRaw : "Not provided";
            const itemEntries = Object.entries(item).filter(([nestedKey, nestedValue]) => {
              if (showTechnicalFields) {
                return true;
              }
              if (isTechnicalKey(nestedKey)) {
                return false;
              }
              if (
                (nestedKey === "other_test_name" || nestedKey === "otherTestName") &&
                (nestedValue === null || nestedValue === undefined || nestedValue === "")
              ) {
                return false;
              }
              return true;
            });

            return (
              <div key={`${keyHint}-score-${index}`} className="rounded-lg border bg-muted/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{testType}</p>
                  <Badge variant="outline">Score {index + 1}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</p>
                    <p className="text-sm font-medium">{getScoreDisplay(item.score, item.out_of ?? item.outOf)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Taken On</p>
                    <p className="text-sm">{takenOnDisplay}</p>
                  </div>
                  {otherTestName ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Other Test Name</p>
                      <p className="text-sm">{otherTestName}</p>
                    </div>
                  ) : null}
                  {showTechnicalFields
                    ? itemEntries
                        .filter(([nestedKey]) => !["score", "out_of", "outOf", "taken_on", "takenOn", "test_type", "testType", "other_test_name", "otherTestName"].includes(nestedKey))
                        .map(([nestedKey, nestedValue]) => (
                          <div key={`${keyHint}-score-${index}-${nestedKey}`}>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{prettyLabel(nestedKey)}</p>
                            <div className="text-sm">{renderValue(nestedValue, nestedKey, showTechnicalFields, depth + 1)}</div>
                          </div>
                        ))
                    : null}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`${keyHint}-obj-${index}`} className="rounded-lg border bg-muted/5 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Item {index + 1}</p>
            <div className="text-sm">{renderValue(item, `${keyHint}_${index}`, showTechnicalFields, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  const objectValue = toRecord(value);
  if (!objectValue) {
    return String(value);
  }

  const entries = Object.entries(objectValue).filter(([nestedKey, nestedValue]) => {
    if (showTechnicalFields) {
      return true;
    }
    if (isTechnicalKey(nestedKey)) {
      return false;
    }
    if (nestedValue === null || nestedValue === undefined || nestedValue === "") {
      return false;
    }
    return true;
  });

  if (entries.length === 0) {
    return <span className="text-muted-foreground">No data</span>;
  }

  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([nestedKey, nestedValue]) => {
          const complexValue =
            (Array.isArray(nestedValue) && !nestedValue.every((item) => item === null || item === undefined || isPrimitive(item))) ||
            (!!nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue));
          return (
            <div key={`${keyHint}-${nestedKey}`} className={complexValue ? "md:col-span-2" : undefined}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{prettyLabel(nestedKey)}</p>
              <div className="mt-1 text-sm">{renderValue(nestedValue, nestedKey, showTechnicalFields, depth + 1)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildSections(
  data: UnknownRecord | null,
  applicationSchema: UnknownRecord | null,
  showTechnicalFields: boolean,
): RenderSection[] {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) {
    return [];
  }

  const schemaSections = toSchemaSections(applicationSchema);
  const fieldMetaByKey = new Map<string, SchemaFieldMeta>();
  const sectionMetaById = new Map<string, SchemaSectionMeta>();

  schemaSections.forEach(({ section, fields }) => {
    sectionMetaById.set(section.id, section);
    fields.forEach((field) => {
      fieldMetaByKey.set(field.key, field);
    });
  });

  const knownBySection = new Map<string, SectionFieldEntry[]>();
  const additionalFields: SectionFieldEntry[] = [];

  entries.forEach(([key, value], payloadOrder) => {
    const fieldMeta = fieldMetaByKey.get(key);
    if (fieldMeta) {
      const current = knownBySection.get(fieldMeta.sectionId) ?? [];
      current.push({
        key,
        label: fieldMeta.label,
        value,
        payloadOrder,
        fieldOrder: fieldMeta.fieldOrder,
      });
      knownBySection.set(fieldMeta.sectionId, current);
      return;
    }

    if (!showTechnicalFields && isTechnicalKey(key)) {
      return;
    }

    additionalFields.push({
      key,
      label: prettyLabel(key),
      value,
      payloadOrder,
      fieldOrder: Number.MAX_SAFE_INTEGER,
    });
  });

  const renderSections: RenderSection[] = [];

  const knownSections = Array.from(knownBySection.entries()).sort((a, b) => {
    const sectionA = sectionMetaById.get(a[0]);
    const sectionB = sectionMetaById.get(b[0]);
    return (sectionA?.sectionOrder ?? Number.MAX_SAFE_INTEGER) - (sectionB?.sectionOrder ?? Number.MAX_SAFE_INTEGER);
  });

  knownSections.forEach(([sectionId, fields]) => {
    const sectionMeta = sectionMetaById.get(sectionId);
    const sortedFields = [...fields].sort((a, b) => {
      if (a.fieldOrder !== b.fieldOrder) {
        return a.fieldOrder - b.fieldOrder;
      }
      return a.payloadOrder - b.payloadOrder;
    });

    renderSections.push({
      id: sectionId,
      title: sectionMeta?.title ?? "Section",
      fields: sortedFields,
    });
  });

  if (additionalFields.length > 0) {
    renderSections.push({
      id: "additional-information",
      title: "Additional Information",
      fields: additionalFields,
    });
  }

  return renderSections;
}

export function SubmittedApplicationDataView({ data, applicationSchema }: SubmittedApplicationDataViewProps) {
  const [showTechnicalFields, setShowTechnicalFields] = useState(false);

  const sections = useMemo(
    () => buildSections(data, applicationSchema, showTechnicalFields),
    [applicationSchema, data, showTechnicalFields],
  );

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">No submitted information available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Submitted Information</h3>
          <p className="text-xs text-muted-foreground">Review your provided fields grouped by section.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="technical-fields-toggle" className="text-xs text-muted-foreground">
            Show technical fields
          </Label>
          <Switch
            id="technical-fields-toggle"
            checked={showTechnicalFields}
            onCheckedChange={(checked) => setShowTechnicalFields(checked)}
            aria-label="Show technical fields"
          />
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.id} className="rounded-xl border border-border/80 bg-background p-4">
            <h4 className="mb-3 text-sm font-semibold">{section.title}</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {section.fields.map((field) => {
                const complexValue =
                  (Array.isArray(field.value) &&
                    !field.value.every((item) => item === null || item === undefined || isPrimitive(item))) ||
                  (!!field.value && typeof field.value === "object" && !Array.isArray(field.value));

                return (
                  <div
                    key={field.key}
                    className={`rounded-lg border border-border/70 bg-muted/5 p-3 ${complexValue ? "md:col-span-2" : ""}`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{field.label}</p>
                    <div className="mt-1 text-sm">{renderValue(field.value, field.key, showTechnicalFields)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
