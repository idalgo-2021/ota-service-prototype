INSERT INTO users (email, password_hash, role) VALUES
    ('alfred@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'user'),
    ('boris@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'user'),
    ('cindy@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'user'),
    ('david@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'user'),
    ('robert@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'manager'),
    ('stella@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'manager'),
    ('viktor@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'admin'),
    ('walter@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'admin'),
    ('hotelier.one@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'hotelier'),
    ('hotelier.two@example.com', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'hotelier'),
    ('ai-robot@example.invalid', '$2a$10$fUXpHWTa5OSy8aMDWBs2A.uxoZfVKUkNXD2bFk2KJ.i9OR2QHbDuu', 'ai_robot')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

INSERT INTO user_profiles (user_id, country_id)
SELECT u.id, c.id FROM users u CROSS JOIN countries c WHERE c.code = 'RU'
ON CONFLICT (user_id) DO NOTHING;

-- Fill only untouched demo profiles, including profiles created by earlier seed runs.
-- David keeps both optional attributes empty as a sample of an incomplete profile.
UPDATE user_profiles AS p
SET gender = sample.gender,
    nationality = sample.nationality,
    updated_at = now()
FROM users AS u
JOIN (VALUES
    ('alfred@example.com', 'male', 'Русский'),
    ('boris@example.com', 'male', 'Кыргыз'),
    ('cindy@example.com', 'female', 'Казашка')
) AS sample(email, gender, nationality) ON sample.email = u.email
WHERE p.user_id = u.id
  AND p.gender IS NULL
  AND p.nationality IS NULL
  AND p.created_at = p.updated_at;

-- Set names on new profiles and fill empty names from earlier seed runs.
-- Preserve names that a demo user has already entered in the profile.
INSERT INTO user_profiles (user_id, country_id, first_name, last_name)
SELECT u.id, c.id, sample.first_name, sample.last_name
FROM (VALUES
    ('alfred@example.com', 'Альфред', 'Морозов'),
    ('boris@example.com', 'Борис', 'Крылов'),
    ('cindy@example.com', 'Синди', 'Орлова'),
    ('david@example.com', 'Давид', 'Соколов'),
    ('robert@example.com', 'Роберт', 'Белов'),
    ('stella@example.com', 'Стелла', 'Волкова'),
    ('viktor@example.com', 'Виктор', 'Лебедев'),
    ('walter@example.com', 'Уолтер', 'Зайцев'),
    ('hotelier.one@example.com', 'Михаил', 'Соколов'),
    ('hotelier.two@example.com', 'Екатерина', 'Орлова')
) AS sample(email, first_name, last_name)
JOIN users u ON u.email = sample.email
CROSS JOIN countries c
WHERE c.code = 'RU'
ON CONFLICT (user_id) DO UPDATE SET
    first_name = CASE WHEN user_profiles.first_name IN ('', 'Отельер') THEN EXCLUDED.first_name ELSE user_profiles.first_name END,
    last_name = CASE WHEN user_profiles.last_name IN ('', 'Один', 'Два') THEN EXCLUDED.last_name ELSE user_profiles.last_name END,
    updated_at = now()
WHERE user_profiles.first_name IN ('', 'Отельер') OR user_profiles.last_name IN ('', 'Один', 'Два');
