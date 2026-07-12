export const REQUIRED_MATCH_DOCUMENTS = [
  "Passport",
  "Academic transcript",
  "Diploma or enrollment certificate",
  "Language certificate",
  "Personal statement",
  "Recommendation letter",
  "CV or resume",
];

export function calculateDocumentReadiness(documentsReady: string[]): number {
  if (REQUIRED_MATCH_DOCUMENTS.length === 0) {
    return 0;
  }
  const ready = REQUIRED_MATCH_DOCUMENTS.filter((documentName) => documentsReady.includes(documentName)).length;
  return Math.round((ready / REQUIRED_MATCH_DOCUMENTS.length) * 100);
}
