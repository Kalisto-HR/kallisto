-- Forward migration for current-state contracts on existing environments.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'management_profile'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        ALTER TABLE universities RENAME COLUMN management_profile TO university_profile;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'management_profile'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        EXECUTE $merge$
            UPDATE universities
            SET university_profile = CASE
                WHEN COALESCE(university_profile, '{}'::jsonb) = '{}'::jsonb
                    THEN COALESCE(management_profile, '{}'::jsonb)
                ELSE university_profile
            END
            WHERE management_profile IS NOT NULL
        $merge$;

        ALTER TABLE universities DROP COLUMN management_profile;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'universities'
          AND column_name = 'university_profile'
    ) THEN
        ALTER TABLE universities
            ADD COLUMN university_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

UPDATE universities
SET application_schema = REPLACE(
    REPLACE(application_schema::text, '"reviewer"', '"partner"'),
    '"admin"',
    '"staff"'
)::jsonb
WHERE application_schema IS NOT NULL
  AND application_schema::text ~ '"(reviewer|admin)"';

UPDATE university_application_structure_versions
SET schema = REPLACE(
    REPLACE(schema::text, '"reviewer"', '"partner"'),
    '"admin"',
    '"staff"'
)::jsonb
WHERE schema IS NOT NULL
  AND schema::text ~ '"(reviewer|admin)"';
