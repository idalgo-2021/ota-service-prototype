-- Synthetic reviews for objects from seed_listings.sql and seed_products.sql.
-- Run after migration 000034 and the user, listing, booking, product, and order seeds.
-- Re-running is safe and leaves existing client reviews unchanged.
BEGIN;

CREATE TEMP TABLE seed_review_rows ON COMMIT DROP AS
WITH seed_objects AS (
    SELECT 'listing'::text AS kind, l.id, l.title_ru AS name
    FROM listings l
    WHERE l.title_ru IN (
        'Гранд Отель "Центральный"', 'Приморская Жемчужина',
        'Бутик-отель "Старый Город"', 'Лофт на Красном Октябре',
        'Квартира у моря', 'Хостел "Друзья"', 'Горный Приют',
        'Уютный дворик', 'Дом у озера', 'Альпийская Вилла'
    )
    UNION ALL
    SELECT 'product', p.id, p.name_ru
    FROM products p
    WHERE p.counterparty_id::text IN (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555',
        '66666666-6666-6666-6666-666666666666',
        '77777777-7777-7777-7777-777777777777',
        '88888888-8888-8888-8888-888888888888',
        'a1111111-1111-4111-8111-111111111111',
        'a2222222-2222-4222-8222-222222222222',
        'a3333333-3333-4333-8333-333333333333',
        'a4444444-4444-4444-8444-444444444444',
        'a5555555-5555-4555-8555-555555555555',
        'a6666666-6666-4666-8666-666666666666'
    ) OR p.name_ru IN ('Набор для пикника', 'Сувенирный набор «Санкт-Петербург»')
), review_texts AS (
    SELECT ARRAY[
        'Всё прошло удобно, описание соответствует впечатлениям.',
        'Хороший опыт, особенно понравилась организация.',
        'Остались приятные впечатления, могу рекомендовать.',
        'В целом понравилось, всё было понятно и удобно.',
        'Объект оставил хорошее впечатление.',
        'Удобный вариант для поездки, ожидания оправдались.',
        'Сервис оказался внимательным и понятным.',
        'Впечатления положительные, всё прошло спокойно.',
        'Понравилось качество и внимание к деталям.',
        'Достойный вариант, пользовались с удовольствием.',
        'Ожидали немного большего, но в целом всё хорошо.',
        'Хороший выбор, при случае воспользуюсь снова.'
    ]::text[] AS texts,
    ARRAY['Анна', 'Михаил', 'Елена', 'Алексей', 'Мария', 'Ирина',
          'Дмитрий', 'Ольга', 'Сергей', 'Наталья', 'Павел', 'Татьяна']::text[] AS names
)
SELECT s.kind, s.id AS target_id, n.i AS review_index,
       'demo_seed'::text AS external_source,
       s.kind || ':' || s.id::text || ':' || n.i AS external_review_id,
       md5(s.kind || ':' || s.id::text || ':author:' || n.i)::uuid::text AS external_author_id,
       t.names[n.i] AS author_display_name,
       CASE WHEN n.i IN (5, 11) THEN 3 WHEN n.i IN (4, 8) THEN 4 ELSE 5 END AS rating,
       t.texts[n.i] || ' (' || s.name || ')' AS review_text,
       now() - (n.i * interval '5 days') AS original_at
FROM seed_objects s CROSS JOIN generate_series(1, 12) AS n(i) CROSS JOIN review_texts t;

INSERT INTO product_reviews (
    is_imported, external_source, external_review_id, external_author_id,
    author_display_name, product_id, rating, review_text,
    status, is_hidden, rejection_reason, created_at, original_at, updated_at
)
SELECT true, external_source, external_review_id, external_author_id,
       author_display_name, target_id, rating, review_text,
       CASE WHEN review_index <= 6 THEN 'approved'
            WHEN review_index <= 9 THEN 'pending_moderation'
            ELSE 'rejected' END,
       review_index > 6,
       CASE WHEN review_index > 9
            THEN 'Демонстрационное отклонение' END,
       original_at, original_at, now()
FROM seed_review_rows WHERE kind = 'product'
ON CONFLICT (external_source, external_review_id) WHERE is_imported DO UPDATE SET
    status=EXCLUDED.status,
    is_hidden=EXCLUDED.is_hidden,
    rejection_reason=EXCLUDED.rejection_reason,
    updated_at=now();

INSERT INTO listing_reviews (
    is_imported, external_source, external_review_id, external_reviewer_id,
    reviewer_display_name, listing_id, overall_rating,
    positive_review, negative_review,
    cleanliness_rating, staff_rating, comfort_rating, location_rating,
    sleep_rating, bathroom_rating, wifi_rating,
    trip_purpose, party_type, accommodation_type, nights,
    reviewer_age, reviewer_gender, reviewer_country,
    status, is_hidden, rejection_reason, created_at, original_at, updated_at
)
WITH listing_context (title, accommodation_type, highlight, caveat) AS (VALUES
    ('Гранд Отель "Центральный"', 'hotel_room',
     'Расположение рядом с центром сэкономило время на прогулках.', 'В час пик у входа бывает оживлённо.'),
    ('Приморская Жемчужина', 'hotel_room',
     'До пляжа можно дойти за несколько минут.', 'Вечером у набережной слышна музыка.'),
    ('Бутик-отель "Старый Город"', 'hotel_room',
     'Атмосфера старого города и интерьер запомнились.', 'Лестница в историческом здании узкая.'),
    ('Лофт на Красном Октябре', 'apartment',
     'Панорамные окна и просторная гостиная понравились.', 'По выходным рядом шумят кафе.'),
    ('Квартира у моря', 'apartment',
     'Балкон с видом на море стал любимым местом.', 'До ближайшего магазина идти чуть дальше, чем ожидали.'),
    ('Хостел "Друзья"', 'hostel_bed',
     'Общая кухня и зона отдыха помогли познакомиться с соседями.', 'В общей комнате иногда слышны разговоры поздно вечером.'),
    ('Горный Приют', 'hostel_bed',
     'Удобно выходить на маршруты прямо с утра.', 'После походов место для сушки вещей ограничено.'),
    ('Уютный дворик', 'guest_house_room',
     'Во дворе приятно завтракать и отдыхать.', 'Вечером освещение дорожки во дворе слабовато.'),
    ('Дом у озера', 'guest_house_room',
     'Тихий берег озера подошёл для спокойного отдыха.', 'Мобильная связь у воды иногда пропадала.'),
    ('Альпийская Вилла', 'property',
     'Каминный зал и сауна сделали поездку уютной.', 'На подъезде к дому дорога местами неровная.')
), review_profiles (
    i, age, gender, country, trip_purpose, party_type, nights,
    cleanliness, staff, comfort, location, sleep, bathroom, wifi,
    positive_intro, negative_intro
) AS (VALUES
    (1, 29, 'female', 'Russia', 'tourism', 'couple', 3,
     5.0, 5.0, 5.0, 5.0, 4.5, 5.0, 4.5,
     'Заселение прошло быстро и без лишних ожиданий.', NULL),
    (2, 42, 'male', 'Kazakhstan', 'business', 'alone', 2,
     4.5, 5.0, 4.5, 5.0, 4.5, 4.5, 4.0,
     'Для короткой поездки условия оказались удобными.', 'Пара бытовых мелочей всё же есть.'),
    (3, 35, 'female', 'Belarus', 'tourism', 'family', 5,
     5.0, 4.5, 5.0, 4.5, 5.0, 4.5, 5.0,
     'Проживание прошло комфортно для всей компании.', NULL),
    (4, 31, 'male', 'Kyrgyzstan', 'business', 'colleagues', 2,
     4.0, 4.5, 4.0, 4.5, 3.5, 4.0, 3.5,
     'Работать и отдыхать после насыщенного дня было удобно.', 'Есть нюанс, который стоит учитывать.'),
    (5, 27, 'female', 'Germany', 'tourism', 'friends', 4,
     3.0, 3.5, 3.0, 4.0, 2.5, 3.0, 2.5,
     'Больше всего запомнилось само место.', 'Комфорт был ниже ожиданий.'),
    (6, 54, 'female', 'Armenia', 'tourism', 'couple', 7,
     5.0, 5.0, 4.5, 5.0, 5.0, 4.5, 4.0,
     'Провели здесь спокойную неделю.', NULL),
    (7, 24, 'male', 'Uzbekistan', 'other', 'alone', 1,
     4.5, 5.0, 4.5, 4.0, 4.5, 4.5, NULL,
     'На одну ночь это оказался практичный вариант.', NULL),
    (8, 38, 'female', 'Georgia', 'tourism', 'family', 6,
     4.0, 4.0, 3.5, 4.5, 3.5, 3.5, 4.0,
     'Места и удобств хватило для нашей группы.', 'Не всё было идеально.'),
    (9, 46, 'male', 'Turkey', 'business', 'alone', 3,
     5.0, 4.5, 4.5, 5.0, 4.5, 4.5, 4.0,
     'По рабочим делам останавливался ненадолго, всё было понятно.', 'Хотелось бы немного больше удобства.'),
    (10, 33, 'female', 'Italy', 'tourism', 'couple', 4,
     4.5, 5.0, 4.5, 5.0, 4.5, 5.0, 4.5,
     'Понравилось, как организовано пространство.', NULL),
    (11, 21, 'male', 'Serbia', 'tourism', 'friends', 2,
     3.0, 3.0, 2.5, 4.0, 2.5, 3.0, 2.5,
     'Цена соответствовала базовым условиям проживания.', 'С этим моментом возникли неудобства.'),
    (12, 61, 'female', 'Azerbaijan', 'other', 'family', 5,
     4.5, 4.5, 4.5, 5.0, 5.0, NULL, 4.5,
     'Поездка оставила тёплые впечатления.', NULL)
)
SELECT true, r.external_source, r.external_review_id, r.external_author_id,
       r.author_display_name, r.target_id, r.rating * 2,
       p.positive_intro || ' ' || c.highlight,
       CASE WHEN p.negative_intro IS NULL THEN NULL ELSE p.negative_intro || ' ' || c.caveat END,
       p.cleanliness * 2, p.staff * 2, p.comfort * 2, p.location * 2,
       p.sleep * 2, p.bathroom * 2, p.wifi * 2,
       p.trip_purpose,
       CASE WHEN c.accommodation_type='hostel_bed' AND p.party_type='family'
            THEN 'friends' ELSE p.party_type END,
       c.accommodation_type, p.nights, p.age::text, p.gender, p.country,
       CASE WHEN p.i <= 6 THEN 'approved'
            WHEN p.i <= 9 THEN 'pending_moderation'
            ELSE 'rejected' END,
       p.i > 6,
       CASE WHEN p.i > 9 THEN 'Демонстрационное отклонение' END,
       r.original_at, r.original_at, now()
FROM seed_review_rows r
JOIN listings l ON l.id=r.target_id
JOIN listing_context c ON c.title=l.title_ru
JOIN review_profiles p ON r.external_review_id='listing:' || r.target_id::text || ':' || p.i
WHERE r.kind='listing'
ON CONFLICT (external_source, external_review_id) WHERE is_imported DO UPDATE SET
    overall_rating=EXCLUDED.overall_rating,
    positive_review=EXCLUDED.positive_review,
    negative_review=EXCLUDED.negative_review,
    cleanliness_rating=EXCLUDED.cleanliness_rating,
    staff_rating=EXCLUDED.staff_rating,
    comfort_rating=EXCLUDED.comfort_rating,
    location_rating=EXCLUDED.location_rating,
    sleep_rating=EXCLUDED.sleep_rating,
    bathroom_rating=EXCLUDED.bathroom_rating,
    wifi_rating=EXCLUDED.wifi_rating,
    trip_purpose=EXCLUDED.trip_purpose,
    party_type=EXCLUDED.party_type,
    accommodation_type=EXCLUDED.accommodation_type,
    nights=EXCLUDED.nights,
    reviewer_age=EXCLUDED.reviewer_age,
    reviewer_gender=EXCLUDED.reviewer_gender,
    reviewer_country=EXCLUDED.reviewer_country,
    status=EXCLUDED.status,
    is_hidden=EXCLUDED.is_hidden,
    rejection_reason=EXCLUDED.rejection_reason,
    updated_at=now();

-- Two editable reviews for demo clients. Preserve a draft if a client has
-- already filled it in, and preserve a submitted or moderated review too.
INSERT INTO listing_reviews (
    is_imported, reviewer_user_id, listing_id, booking_id, status,
    nights, accommodation_type, reviewer_gender, reviewer_age, reviewer_country
)
SELECT false, b.user_id, b.listing_id, b.id, 'draft',
       b.check_out_date - b.check_in_date,
       (SELECT CASE
            WHEN count(DISTINCT unit.type) > 1 THEN 'mixed'
            WHEN min(unit.type) = 'bed' AND lt.slug = 'hostel' THEN 'hostel_bed'
            WHEN min(unit.type) = 'room' AND lt.slug = 'hotel' THEN 'hotel_room'
            WHEN min(unit.type) = 'room' AND lt.slug = 'guest_house' THEN 'guest_house_room'
            WHEN min(unit.type) = 'property' AND lt.slug = 'apartment' THEN 'apartment'
            ELSE min(unit.type)
        END
        FROM booking_units bu
        JOIN listing_units unit ON unit.id = bu.unit_id
        JOIN listings l ON l.id = b.listing_id
        JOIN listing_types lt ON lt.id = l.listing_type_id
        WHERE bu.booking_id = b.id
        GROUP BY lt.slug),
       profile.gender,
       CASE WHEN EXTRACT(YEAR FROM b.check_out_date)::integer - profile.birth_year BETWEEN 1 AND 120
            THEN (EXTRACT(YEAR FROM b.check_out_date)::integer - profile.birth_year)::text END,
       country.name
FROM (VALUES
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'alfred@example.com'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'boris@example.com')
) AS demo(booking_id, email)
JOIN bookings b ON b.id = demo.booking_id AND b.status = 'completed' AND b.completed_at IS NOT NULL
JOIN users client ON client.id = b.user_id AND client.email = demo.email
LEFT JOIN user_profiles profile ON profile.user_id = client.id
LEFT JOIN countries country ON country.id = profile.country_id
ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO NOTHING;

-- Alfred has a second editable review, for the transfer in his fulfilled order.
-- Never reset a draft that he has filled in or a review that he has submitted.
INSERT INTO product_reviews (is_imported, author_id, product_id, order_id, status)
SELECT false, o.user_id, oi.product_id, o.id, 'draft'
FROM orders o
JOIN users client ON client.id = o.user_id AND client.email = 'alfred@example.com'
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
  AND o.status = 'fulfilled' AND o.fulfilled_at IS NOT NULL
  AND p.name_ru = 'Индивидуальный трансфер из аэропорта'
ON CONFLICT (order_id, product_id) WHERE order_id IS NOT NULL DO NOTHING;

COMMIT;
