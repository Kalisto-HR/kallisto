-- Backfill/repair partner university links from staff profiles.
-- Apply after admin_db_v4_manager_portal.sql.

WITH preferred_university AS (
    SELECT DISTINCT ON (usp.user_id)
        usp.user_id,
        usp.university_id
    FROM university_staff_profiles usp
    ORDER BY
        usp.user_id,
        CASE
            WHEN usp.status = 'active' THEN 0
            WHEN usp.status = 'pending' THEN 1
            WHEN usp.status = 'suspended' THEN 2
            ELSE 3
        END,
        usp.updated_at DESC
)
UPDATE users u
SET university_linked = pu.university_id
FROM preferred_university pu
WHERE u.id = pu.user_id
  AND u.role = 'partner'
  AND (
      u.university_linked IS NULL
      OR NOT EXISTS (
          SELECT 1
          FROM universities linked
          WHERE linked.id = u.university_linked
      )
      OR u.university_linked <> pu.university_id
  );
