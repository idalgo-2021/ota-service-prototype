-- Demo accommodation bookings. Run seed_users.sql and seed_listings.sql first.
-- Fixed booking IDs make this seed safe to rerun.
BEGIN;

CREATE TEMP TABLE seed_booking_rows (
    booking_id uuid PRIMARY KEY,
    email text NOT NULL,
    listing_title text NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    adults_count integer NOT NULL,
    children_count integer NOT NULL,
    has_pets boolean NOT NULL,
    status text NOT NULL,
    created_at timestamp NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_booking_rows VALUES
    ('b0000000-0000-4000-8000-000000000001', 'alfred@example.com', 'Гранд Отель "Центральный"', '2026-11-03', '2026-11-04', 2, 0, false, 'confirmed', '2026-10-02 10:00:00'),
    ('b0000000-0000-4000-8000-000000000002', 'boris@example.com', 'Приморская Жемчужина', '2026-11-06', '2026-11-08', 2, 0, false, 'confirmed', '2026-10-02 11:00:00'),
    ('b0000000-0000-4000-8000-000000000003', 'cindy@example.com', 'Лофт на Красном Октябре', '2026-11-09', '2026-11-12', 2, 1, false, 'confirmed', '2026-10-02 12:00:00'),
    ('b0000000-0000-4000-8000-000000000004', 'david@example.com', 'Хостел "Друзья"', '2026-11-13', '2026-11-17', 3, 0, false, 'confirmed', '2026-10-02 13:00:00'),
    ('b0000000-0000-4000-8000-000000000005', 'alfred@example.com', 'Бутик-отель "Старый Город"', '2026-11-18', '2026-11-23', 2, 1, false, 'confirmed', '2026-10-02 14:00:00'),
    ('b0000000-0000-4000-8000-000000000006', 'boris@example.com', 'Альпийская Вилла', '2026-11-20', '2026-11-27', 4, 2, true, 'confirmed', '2026-10-02 15:00:00'),
    ('b0000000-0000-4000-8000-000000000007', 'cindy@example.com', 'Уютный дворик', '2026-11-01', '2026-11-11', 2, 1, true, 'confirmed', '2026-10-02 16:00:00'),
    ('b0000000-0000-4000-8000-000000000008', 'alfred@example.com', 'Гранд Отель "Центральный"', '2026-09-10', '2026-09-12', 2, 0, false, 'completed', '2026-08-25 10:00:00'),
    ('b0000000-0000-4000-8000-000000000009', 'boris@example.com', 'Квартира у моря', '2026-09-15', '2026-09-19', 2, 2, true, 'completed', '2026-08-27 11:00:00'),
    ('b0000000-0000-4000-8000-000000000010', 'david@example.com', 'Горный Приют', '2026-09-23', '2026-09-26', 2, 0, false, 'completed', '2026-09-01 12:00:00');

CREATE TEMP TABLE seed_booking_items (
    booking_id uuid NOT NULL,
    parent_name text,
    unit_name text NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_booking_items VALUES
    ('b0000000-0000-4000-8000-000000000001', NULL, 'Номер 101'),
    ('b0000000-0000-4000-8000-000000000002', NULL, 'Номер 201'),
    ('b0000000-0000-4000-8000-000000000003', NULL, 'Апартаменты целиком'),
    ('b0000000-0000-4000-8000-000000000004', 'Общая комната А', 'Койка 01'),
    ('b0000000-0000-4000-8000-000000000004', 'Общая комната А', 'Койка 02'),
    ('b0000000-0000-4000-8000-000000000004', 'Общая комната А', 'Койка 03'),
    ('b0000000-0000-4000-8000-000000000005', NULL, 'Номер 302'),
    ('b0000000-0000-4000-8000-000000000006', NULL, 'Вилла целиком'),
    ('b0000000-0000-4000-8000-000000000007', NULL, 'Комната 1'),
    ('b0000000-0000-4000-8000-000000000008', NULL, 'Номер 102'),
    ('b0000000-0000-4000-8000-000000000009', NULL, 'Квартира целиком'),
    ('b0000000-0000-4000-8000-000000000010', 'Общая комната А', 'Койка 01'),
    ('b0000000-0000-4000-8000-000000000010', 'Общая комната А', 'Койка 02');

WITH resolved AS (
    SELECT s.booking_id, lu.id AS unit_id, lu.price_per_night, lu.currency
    FROM seed_booking_rows s
    JOIN listings l ON l.title_ru=s.listing_title
    JOIN seed_booking_items i ON i.booking_id=s.booking_id
    JOIN listing_units lu ON lu.listing_id=l.id AND lu.name_ru=i.unit_name AND lu.is_active
    LEFT JOIN listing_units parent ON parent.id=lu.parent_unit_id
    WHERE parent.name_ru IS NOT DISTINCT FROM i.parent_name
), prices AS (
    SELECT booking_id, array_agg(unit_id) AS unit_ids,
           count(*) AS unit_count, sum(price_per_night) AS price_per_night,
           min(currency) AS currency, count(DISTINCT currency) AS currency_count
    FROM resolved GROUP BY booking_id
)
INSERT INTO bookings (
    id, listing_id, user_id, check_in_date, check_out_date,
    adults_count, children_count, has_pets, status, total, currency,
    checked_in_by, checked_in_at, completed_by, completed_at, created_at, updated_at
)
SELECT s.booking_id, l.id, client.id, s.check_in_date, s.check_out_date,
       s.adults_count, s.children_count, s.has_pets, s.status,
       p.price_per_night * (s.check_out_date-s.check_in_date), p.currency,
       CASE WHEN s.status='completed' THEN staff.id END,
       CASE WHEN s.status='completed' THEN s.check_in_date + time '14:00' END,
       CASE WHEN s.status='completed' THEN staff.id END,
       CASE WHEN s.status='completed' THEN s.check_out_date + time '11:00' END,
       s.created_at, s.created_at
FROM seed_booking_rows s
JOIN users client ON client.email=s.email
JOIN users staff ON staff.email='robert@example.com'
JOIN listings l ON l.title_ru=s.listing_title
JOIN prices p ON p.booking_id=s.booking_id
WHERE p.unit_count=(SELECT count(*) FROM seed_booking_items i WHERE i.booking_id=s.booking_id)
  AND p.currency_count=1
  AND NOT EXISTS (SELECT 1 FROM bookings existing WHERE existing.id=s.booking_id)
  AND NOT EXISTS (
      SELECT 1 FROM booking_units bu JOIN bookings existing ON existing.id=bu.booking_id
      WHERE bu.unit_id=ANY(p.unit_ids) AND existing.status<>'canceled'
        AND existing.check_in_date<s.check_out_date AND existing.check_out_date>s.check_in_date
  );

INSERT INTO booking_units (booking_id, listing_id, unit_id, price_per_night)
SELECT b.id, b.listing_id, lu.id, lu.price_per_night
FROM seed_booking_rows s
JOIN bookings b ON b.id=s.booking_id
JOIN seed_booking_items i ON i.booking_id=s.booking_id
JOIN listing_units lu ON lu.listing_id=b.listing_id AND lu.name_ru=i.unit_name
LEFT JOIN listing_units parent ON parent.id=lu.parent_unit_id
WHERE parent.name_ru IS NOT DISTINCT FROM i.parent_name
ON CONFLICT DO NOTHING;

COMMIT;
