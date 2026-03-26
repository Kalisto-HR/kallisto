-- Legacy static seed file for universities table.
-- Preferred path: scripts/seeds/import_universities.ps1 (JSON-driven idempotent seed).
-- Keep this file only for backward compatibility.

INSERT INTO universities (id, name, description, province, ranking, application_fee, metadata, application_schema, created_at) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'National University of Uzbekistan',
    'The oldest and largest university in Uzbekistan, offering programs in sciences, humanities, and engineering.',
    'Tashkent',
    1,
    50.00,
    '{"requirements": {"recommendation_letters": 2, "essay_required": true, "standardized_tests": ["SAT"]}, "contact": {"email": "admissions@nuu.uz", "phone": "+998 71 246 0240"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "essay", "dataKey": "essay", "type": "essay", "label": "Essay", "required": true, "order": 2}]}]}',
    NOW()
),
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Tashkent State Technical University',
    'Leading technical university specializing in engineering and technology programs.',
    'Tashkent',
    2,
    45.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": false, "standardized_tests": ["Math Test"]}, "contact": {"email": "info@tdtu.uz"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "math_score", "dataKey": "math_score", "type": "number", "label": "Math Score", "required": true, "order": 2}]}]}',
    NOW()
),
(
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'University of World Economy and Diplomacy',
    'Premier institution for international relations, economics, and diplomatic studies.',
    'Tashkent',
    3,
    60.00,
    '{"requirements": {"recommendation_letters": 2, "essay_required": true, "standardized_tests": ["IELTS"]}, "contact": {"email": "admission@uwed.uz"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "language_score", "dataKey": "language_score", "type": "number", "label": "Language Score", "required": true, "order": 2}]}]}',
    NOW()
),
(
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Samarkand State University',
    'Historic university in the ancient city of Samarkand, known for humanities and natural sciences programs.',
    'Samarkand',
    4,
    40.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": true, "standardized_tests": []}, "contact": {"email": "info@samdu.uz", "phone": "+998 66 239 1636"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "essay", "dataKey": "essay", "type": "essay", "label": "Essay", "required": true, "order": 2}]}]}',
    NOW()
),
(
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'Bukhara State University',
    'Regional university offering diverse programs in education, agriculture, and applied sciences.',
    'Bukhara',
    5,
    35.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": false, "standardized_tests": []}, "contact": {"email": "admission@buxdu.uz"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}]}]}',
    NOW()
),
(
    'f6a7b8c9-d0e1-2345-f012-456789012345',
    'Tashkent University of Information Technologies',
    'Modern university focused on computer science, IT, and telecommunications.',
    'Tashkent',
    6,
    55.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": false, "standardized_tests": ["Programming Test"]}, "contact": {"email": "info@tuit.uz", "phone": "+998 71 238 6464"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "programming_score", "dataKey": "programming_score", "type": "number", "label": "Programming Score", "required": false, "order": 2}]}]}',
    NOW()
),
(
    'a7b8c9d0-e1f2-3456-0123-567890123456',
    'Fergana State University',
    'Leading university in the Fergana Valley, offering programs in sciences, arts, and teacher education.',
    'Fergana',
    7,
    38.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": true, "standardized_tests": []}, "contact": {"email": "rector@fdu.uz"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "motivation_letter", "dataKey": "motivation_letter", "type": "essay", "label": "Motivation Letter", "required": true, "order": 2}]}]}',
    NOW()
),
(
    'b8c9d0e1-f2a3-4567-1234-678901234567',
    'Westminster International University in Tashkent',
    'International university offering UK-accredited degrees in business, economics, and law.',
    'Tashkent',
    8,
    150.00,
    '{"requirements": {"recommendation_letters": 2, "essay_required": true, "standardized_tests": ["IELTS", "SAT"]}, "contact": {"email": "admissions@wiut.uz", "phone": "+998 71 238 7400"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "ielts_score", "dataKey": "ielts_score", "type": "number", "label": "IELTS Score", "required": true, "order": 2}, {"id": "personal_statement", "dataKey": "personal_statement", "type": "essay", "label": "Personal Statement", "required": true, "order": 3}]}]}',
    NOW()
),
(
    'c9d0e1f2-a3b4-5678-2345-789012345678',
    'Nukus State Pedagogical Institute',
    'Teacher training institution serving the Karakalpakstan region with education and humanities programs.',
    'Karakalpakstan',
    9,
    30.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": false, "standardized_tests": []}, "contact": {"email": "info@ndpi.uz"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}]}]}',
    NOW()
),
(
    'd0e1f2a3-b4c5-6789-3456-890123456789',
    'Tashkent State University of Economics',
    'Specialized university for economics, finance, banking, and business administration.',
    'Tashkent',
    10,
    48.00,
    '{"requirements": {"recommendation_letters": 1, "essay_required": true, "standardized_tests": ["Math Test"]}, "contact": {"email": "info@tsue.uz", "phone": "+998 71 232 7050"}}',
    '{"sections": [{"id": "application-form", "title": "Application Form", "order": 1, "visible": true, "fields": [{"id": "gpa", "dataKey": "gpa", "type": "number", "label": "GPA", "required": true, "order": 1}, {"id": "math_score", "dataKey": "math_score", "type": "number", "label": "Math Score", "required": true, "order": 2}, {"id": "motivation_essay", "dataKey": "motivation_essay", "type": "essay", "label": "Motivation Essay", "required": true, "order": 3}]}]}',
    NOW()
);
