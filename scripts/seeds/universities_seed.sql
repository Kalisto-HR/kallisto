-- Seed file for universities table
-- Run this after the schema migration to populate sample data

INSERT INTO universities (id, name, description, province, ranking, application_fee, metadata, application_schema, created_at) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'National University of Uzbekistan',
    'The oldest and largest university in Uzbekistan, offering programs in sciences, humanities, and engineering.',
    'Tashkent',
    1,
    50.00,
    '{"requirements": {"recommendation_letters": 2, "essay_required": true, "standardized_tests": ["SAT"]}, "contact": {"email": "admissions@nuu.uz", "phone": "+998 71 246 0240"}}',
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "essay", "type": "text", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "math_score", "type": "number", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "language_score", "type": "number", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "essay", "type": "text", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "programming_score", "type": "number", "required": false}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "motivation_letter", "type": "text", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "ielts_score", "type": "number", "required": true}, {"name": "personal_statement", "type": "text", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}]}',
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
    '{"fields": [{"name": "gpa", "type": "number", "required": true}, {"name": "math_score", "type": "number", "required": true}, {"name": "motivation_essay", "type": "text", "required": true}]}',
    NOW()
);
