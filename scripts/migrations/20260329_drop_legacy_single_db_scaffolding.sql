-- Forward cleanup for legacy tables and compatibility artifacts.

DROP TABLE IF EXISTS submitted_application_files;
DROP TABLE IF EXISTS submitted_applications;

DROP TABLE IF EXISTS university_staff_status_events;
DROP TABLE IF EXISTS university_staff_invitations;
DROP TABLE IF EXISTS university_staff_profiles;
