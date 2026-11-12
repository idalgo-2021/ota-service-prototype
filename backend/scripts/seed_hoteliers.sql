-- Run after seed_users.sql, seed_listings.sql, and seed_listing_review_summaries.sql.
-- Assigns 15-20 summarized listings to each demo hotelier. Safe to rerun.
BEGIN;

DO $$
DECLARE
    demo_hoteliers integer;
    available_listings integer;
BEGIN
    SELECT count(*) INTO demo_hoteliers
    FROM users
    WHERE role = 'hotelier'
      AND email IN ('hotelier.one@example.com', 'hotelier.two@example.com');

    SELECT count(*) INTO available_listings
    FROM listings;

    IF demo_hoteliers > 0 AND available_listings = 0 THEN
        RAISE EXCEPTION 'No listings available for demo hoteliers';
    END IF;
END
$$;

CREATE TEMP TABLE seed_hotelier_listing_assignments ON COMMIT DROP AS
WITH hoteliers AS (
    SELECT id, row_number() OVER (ORDER BY email) AS hotelier_number,
           count(*) OVER () AS hotelier_count
    FROM users
    WHERE role = 'hotelier'
      AND email IN ('hotelier.one@example.com', 'hotelier.two@example.com')
), ranked_listings AS (
    SELECT l.id AS listing_id,
           row_number() OVER (ORDER BY l.id) AS listing_number
    FROM listings l
), selected AS (
    SELECT h.id AS hotelier_id,
           l.listing_id,
           l.listing_number
    FROM hoteliers h
    CROSS JOIN ranked_listings l
    WHERE l.listing_number <= LEAST(
        (SELECT count(*) FROM ranked_listings),
        h.hotelier_count * 20
    )
      AND ((l.listing_number - 1) % h.hotelier_count) + 1 = h.hotelier_number
)
SELECT hotelier_id,
       listing_id,
       row_number() OVER (PARTITION BY hotelier_id ORDER BY listing_number) AS listing_number
FROM selected;

-- Replace only the demo hoteliers' assignments so reruns follow the current summary seed.
DELETE FROM hotelier_listings hl
USING users u
WHERE hl.hotelier_id = u.id
  AND u.role = 'hotelier'
  AND u.email IN ('hotelier.one@example.com', 'hotelier.two@example.com');

INSERT INTO hotelier_listings(hotelier_id, listing_id)
SELECT hotelier_id, listing_id
FROM seed_hotelier_listing_assignments;

COMMIT;
