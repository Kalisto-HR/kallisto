# Application Builder Design

## Product Model

The new partner-facing feature is named `Application Builder`.

It separates requirements into:

- Kallisto profile information: reusable student profile fields selected as Required, Optional, or Not requested.
- Application-specific information: programs, documents, additional questions, rules, payment, and publishing settings.

## User Flow

1. Applications
2. Create application
3. Choose template
4. Overview
5. Programs
6. Applicant Information
7. Education
8. Documents
9. Additional Questions
10. Rules and Payment
11. Review and Publish

The MVP replacement renders the Applications management surface and the guided builder in one route, using internal view state.

## Templates

Initial editable templates:

- Private University Undergraduate Application
- Undergraduate Application
- Master's Application
- Foundation Program Application
- Transfer Student Application
- International Student Application
- Blank Application

Templates create starter configuration only. Every generated requirement remains editable.

## Builder Steps

- Overview: application name, code, academic year, intake, applicant level, open/deadline dates, descriptions, instructions, support contact, languages.
- Programs: selected program references and program-choice rules.
- Applicant Information: reusable profile requirements grouped by personal details, contact details, and address.
- Education: reusable education and test-score requirements.
- Documents: editable document requirement library.
- Additional Questions: university-specific questions only.
- Rules and Payment: application behavior and fee/credit settings.
- Review and Publish: validation checklist, section summaries, preview, and publish action.

## Versioning

The existing `university_application_structure_versions` table is used when publishing. The current draft remains in `universities.application_schema`; publishing creates a new immutable version row and marks it published.

Submitted student applications are preserved by not modifying the student application tables. A future backend migration should explicitly link each submitted application to the published application version used at submission time.

## Legacy Migration Strategy

Legacy schemas are classified as:

- profile requirements when labels map to standard identity/contact/address fields;
- education requirements when labels map to school, GPA, diploma, transcript, or test scores;
- document requirements when field types are upload/document or labels identify a document;
- custom questions for remaining applicant-facing fields;
- manual review items when a safe mapping is not possible.

The first implementation preserves unknown fields and reports them in the builder review state instead of deleting them.

## Permissions

The existing partner route and backend middleware continue to scope university users to their linked university. Frontend hiding is not treated as security; backend endpoint permissions remain the authority.

## Validation

Critical publish blockers:

- missing application name;
- missing academic year or intake;
- invalid dates;
- no connected programs unless intentionally allowed;
- missing required applicant profile fields;
- document requirements without accepted formats;
- choice questions without options;
- invalid payment configuration.

Warnings may be shown for incomplete optional setup.
