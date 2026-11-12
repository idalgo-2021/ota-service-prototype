BEGIN;

INSERT INTO countries (id, name, name_ru, code) VALUES
(1, 'Russia', 'Россия', 'RU')
ON CONFLICT (code) DO NOTHING;

-- Reference points for distance filtering. Saint Petersburg uses Palace Square
-- (Wikidata Q1132624); the other points use the settlements' published coordinates (Q649,
-- Q39420, Q176878, Q266071, Q15757, and Q176761 respectively).
INSERT INTO locations (id, country_id, name, name_ru, center_latitude, center_longitude) VALUES
(1, 1, 'Moscow', 'Москва', 55.750556, 37.617500),
(2, 1, 'Sochi', 'Сочи', 43.585278, 39.720278),
(3, 1, 'Saint Petersburg', 'Санкт-Петербург', 59.939028, 30.315778),
(4, 1, 'Adler', 'Адлер', 43.428889, 39.923889),
(5, 1, 'Krasnaya Polyana', 'Красная Поляна', 43.678611, 40.205278),
(6, 1, 'Suzdal', 'Суздаль', 56.421111, 40.448889),
(7, 1, 'Ostashkov', 'Осташков', 57.150000, 33.100000)
ON CONFLICT (id) DO UPDATE SET
    center_latitude = COALESCE(locations.center_latitude, EXCLUDED.center_latitude),
    center_longitude = COALESCE(locations.center_longitude, EXCLUDED.center_longitude)
WHERE locations.country_id = EXCLUDED.country_id AND locations.name = EXCLUDED.name;

INSERT INTO listing_types (id, slug, name, name_ru) VALUES
(1, 'hotel', 'Hotel', 'Отель'),
(2, 'apartment', 'Apartment', 'Апартаменты'),
(3, 'hostel', 'Hostel', 'Хостел'),
(4, 'guest_house', 'Guest house', 'Гостевой дом')
ON CONFLICT (slug) DO NOTHING;

WITH seed (id, title, description, main_picture, listing_type_id, location_id, address, latitude, longitude) AS (VALUES
('cc16a0d6-29c1-4b4e-bad6-0ed842835f6d'::uuid, 'Гранд Отель "Центральный"', 'Роскошный отель в самом сердце города с видом на главную площадь.', 'https://cdn.worldota.net/t/1200x616/extranet/c5/b7/c5b726bddddc50f063af1577614fdb9ce026812e.jpeg', 1, 1, 'ул. Тверская, д. 1', 55.7558, 37.6176),
('a9d0d501-b723-48e0-9f52-93db2e16f905'::uuid, 'Приморская Жемчужина', 'Современный отель на первой береговой линии с собственным пляжем и бассейном.', 'https://cdn.worldota.net/t/1200x616/extranet/da/58/da58a1d236fea6479dd4eb4570ebb8b7f1e1ce88.jpeg', 1, 2, 'ул. Набережная, д. 15', 43.5855, 39.7231),
('9d64b305-20d0-4d08-b39f-caeb06457b14'::uuid, 'Бутик-отель "Старый Город"', 'Уютный отель в историческом здании, каждый номер с уникальным дизайном.', 'https://cdn.worldota.net/t/1200x616/extranet/e4/f4/e4f479e73bb426260123ed7ad9f472ac3f8954bb.jpeg', 1, 3, 'ул. Невский проспект, д. 45', 59.9343, 30.3351),
('8fe221b1-777a-4f73-b40a-e285d6b85b70'::uuid, 'Лофт на Красном Октябре', 'Стильные апартаменты с панорамными окнами в модном районе.', 'https://cdn.worldota.net/t/1200x616/extranet/1f/e9/1fe9eba4d88422e089f15920d90be7ed660aaba9.jpeg', 2, 1, 'Берсеневская наб., д. 6, стр. 3', 55.7408, 37.6114),
('10ff3c3c-fdb9-41bd-8ac4-3afe8c0ea5b3'::uuid, 'Квартира у моря', 'Светлая двухкомнатная квартира с балконом и видом на море.', 'https://cdn.worldota.net/t/1200x616/extranet/c6/81/c681b19c8d17548d22f3800e7266ecc361f258f1.jpeg', 2, 4, 'ул. Ленина, д. 112', 43.4299, 39.9234),
('e6ceafb3-2b7d-42ff-adf5-cf375b176374'::uuid, 'Хостел "Друзья"', 'Веселый и современный хостел с общей кухней и игровой зоной.', 'https://cdn.worldota.net/t/1200x616/extranet/2e/8c/2e8cfffa97a4f7a39db1f4e57491f60f7a804a35.JPEG', 3, 3, 'ул. Лиговский проспект, д. 50', 59.9256, 30.3587),
('9ba817b4-5d3a-4c72-8d2f-101aec212ebc'::uuid, 'Горный Приют', 'Хостел для любителей активного отдыха у подножия гор.', 'https://cdn.worldota.net/t/1200x616/extranet/63/d2/63d241586793115d87818109ac43123d002fa4d8.JPEG', 3, 5, 'пос. Красная Поляна, ул. Защитников Кавказа, д. 77', 43.6834, 40.2045),
('639614ed-77f8-4ed9-8e38-a6f348b3abc4'::uuid, 'Уютный дворик', 'Семейный гостевой дом с садом и зоной для барбекю.', 'https://cdn.worldota.net/t/1200x616/extranet/b4/5e/b45efcf3cfcb1c6ef47cae6c3427a97e18a39d5c.jpeg', 4, 6, 'ул. Виноградная, д. 25', 56.4168, 40.4499),
('d772733f-a36e-454a-a9da-5650fbe66413'::uuid, 'Дом у озера', 'Гостевой дом на берегу живописного озера с возможностью рыбалки.', 'https://cdn.worldota.net/t/1200x616/extranet/7c/16/7c16d355fc7c18098445cb227620b1ff29ac1d37.jpeg', 4, 7, 'д. Селигер, ул. Озерная, д. 1', 57.1481, 33.1039),
('6da7c21e-254d-484d-9ab4-9c0ad720beb6'::uuid, 'Альпийская Вилла', 'Шале в альпийском стиле с сауной и каминным залом.', 'https://cdn.worldota.net/t/1200x616/extranet/2c/f1/2cf13650103ed67ba82ebbbf4953ba30ceac6b70.JPEG', 4, 5, 'ул. Горная, д. 5', 43.6800, 40.2050)
), translations(title_ru, title_en, description_en, address_default) AS (VALUES
  ('Гранд Отель "Центральный"', 'Grand Hotel "Central"', 'A luxury hotel in the heart of the city overlooking the main square.', '1 Tverskaya Street'),
  ('Приморская Жемчужина', 'Seaside Pearl', 'A modern beachfront hotel with a private beach and pool.', '15 Naberezhnaya Street'),
  ('Бутик-отель "Старый Город"', 'Old Town Boutique Hotel', 'A cozy hotel in a historic building, with a unique design in every room.', '45 Nevsky Prospekt'),
  ('Лофт на Красном Октябре', 'Red October Loft', 'Stylish apartments with panoramic windows in a lively neighborhood.', '6 Bersenevskaya Embankment, Building 3'),
  ('Квартира у моря', 'Seaside Apartment', 'A bright two-bedroom apartment with a balcony and sea view.', '112 Lenina Street'),
  ('Хостел "Друзья"', 'Friends Hostel', 'A cheerful modern hostel with a shared kitchen and games area.', '50 Ligovsky Prospekt'),
  ('Горный Приют', 'Mountain Shelter', 'A hostel for outdoor enthusiasts at the foot of the mountains.', '77 Zashchitnikov Kavkaza Street, Krasnaya Polyana'),
  ('Уютный дворик', 'Cozy Courtyard', 'A family guest house with a garden and barbecue area.', '25 Vinogradnaya Street'),
  ('Дом у озера', 'Lakeside House', 'A guest house on a scenic lake with fishing nearby.', '1 Ozernaya Street, Seliger'),
  ('Альпийская Вилла', 'Alpine Villa', 'An alpine-style chalet with a sauna and fireplace lounge.', '5 Gornaya Street')
)
INSERT INTO listings (id, title, title_ru, description, description_ru, main_picture, listing_type_id, location_id, address, address_ru, latitude, longitude)
SELECT s.id, t.title_en, s.title, t.description_en, s.description, s.main_picture, s.listing_type_id, s.location_id, t.address_default, s.address, s.latitude, s.longitude
FROM seed s JOIN translations t ON t.title_ru=s.title
ON CONFLICT (id) DO NOTHING;

-- Demonstration inventory. Names are stable so rerunning the seed does not duplicate units.
WITH inventory (listing_title, type, name, capacity_adults, capacity_children, pets_allowed) AS (VALUES
  ('Гранд Отель "Центральный"', 'room', 'Номер 101', 2, 0, false),
  ('Гранд Отель "Центральный"', 'room', 'Номер 102', 2, 1, false),
  ('Гранд Отель "Центральный"', 'room', 'Номер 103', 3, 1, true),
  ('Приморская Жемчужина', 'room', 'Номер 201', 2, 1, false),
  ('Приморская Жемчужина', 'room', 'Номер 202', 2, 0, false),
  ('Приморская Жемчужина', 'room', 'Номер 203', 4, 2, true),
  ('Бутик-отель "Старый Город"', 'room', 'Номер 301', 2, 0, false),
  ('Бутик-отель "Старый Город"', 'room', 'Номер 302', 2, 1, false),
  ('Бутик-отель "Старый Город"', 'room', 'Номер 303', 2, 0, true),
  ('Лофт на Красном Октябре', 'property', 'Апартаменты целиком', 2, 1, true),
  ('Квартира у моря', 'property', 'Квартира целиком', 2, 2, true),
  ('Хостел "Друзья"', 'room', 'Общая комната А', 20, 0, false),
  ('Хостел "Друзья"', 'room', 'Общая комната Б', 8, 0, false),
  ('Горный Приют', 'room', 'Общая комната А', 12, 0, false),
  ('Горный Приют', 'room', 'Общая комната Б', 8, 0, false),
  ('Уютный дворик', 'room', 'Комната 1', 2, 1, true),
  ('Уютный дворик', 'room', 'Комната 2', 2, 0, false),
  ('Дом у озера', 'room', 'Комната 1', 2, 1, true),
  ('Дом у озера', 'room', 'Комната 2', 2, 1, true),
  ('Альпийская Вилла', 'property', 'Вилла целиком', 6, 2, true)
)
INSERT INTO listing_units (listing_id, type, name, name_ru, capacity_adults, capacity_children, pets_allowed)
SELECT l.id, i.type,
  CASE WHEN i.name ~ '^Номер [0-9]+$' THEN regexp_replace(i.name, '^Номер ', 'Room ')
       WHEN i.name ~ '^Комната [0-9]+$' THEN regexp_replace(i.name, '^Комната ', 'Room ')
       WHEN i.name = 'Общая комната А' THEN 'Dormitory A'
       WHEN i.name = 'Общая комната Б' THEN 'Dormitory B'
       WHEN i.name = 'Апартаменты целиком' THEN 'Entire apartment'
       WHEN i.name = 'Квартира целиком' THEN 'Entire flat'
       WHEN i.name = 'Вилла целиком' THEN 'Entire villa'
       ELSE i.name END,
  i.name, i.capacity_adults, i.capacity_children, i.pets_allowed
FROM inventory i JOIN listings l ON l.title_ru=i.listing_title
ON CONFLICT DO NOTHING;

-- Each bed is a separate bookable unit. One sample dormitory has 20 beds.
WITH beds (listing_title, room_name, bed_count) AS (VALUES
  ('Хостел "Друзья"', 'Общая комната А', 20),
  ('Хостел "Друзья"', 'Общая комната Б', 8),
  ('Горный Приют', 'Общая комната А', 12),
  ('Горный Приют', 'Общая комната Б', 8)
)
INSERT INTO listing_units (listing_id, parent_unit_id, type, name, name_ru, capacity_adults, capacity_children, pets_allowed)
SELECT room.listing_id, room.id, 'bed', 'Bed ' || lpad(n::text, 2, '0'), 'Койка ' || lpad(n::text, 2, '0'), 1, 0, false
FROM beds b JOIN listings l ON l.title_ru=b.listing_title
JOIN listing_units room ON room.listing_id=l.id AND room.name_ru=b.room_name AND room.type='room'
CROSS JOIN LATERAL generate_series(1,b.bed_count) AS n
ON CONFLICT DO NOTHING;

-- Nightly rates in RUB. Re-running the seed also prices inventory created by older seeds.
WITH rates (listing_title, unit_name, price_per_night) AS (VALUES
  ('Гранд Отель "Центральный"', 'Номер 101', 5500),
  ('Гранд Отель "Центральный"', 'Номер 102', 6500),
  ('Гранд Отель "Центральный"', 'Номер 103', 8500),
  ('Приморская Жемчужина', 'Номер 201', 7200),
  ('Приморская Жемчужина', 'Номер 202', 6800),
  ('Приморская Жемчужина', 'Номер 203', 11000),
  ('Бутик-отель "Старый Город"', 'Номер 301', 4800),
  ('Бутик-отель "Старый Город"', 'Номер 302', 5300),
  ('Бутик-отель "Старый Город"', 'Номер 303', 5900),
  ('Лофт на Красном Октябре', 'Апартаменты целиком', 7600),
  ('Квартира у моря', 'Квартира целиком', 6800),
  ('Уютный дворик', 'Комната 1', 3600),
  ('Уютный дворик', 'Комната 2', 3200),
  ('Дом у озера', 'Комната 1', 4200),
  ('Дом у озера', 'Комната 2', 4200),
  ('Альпийская Вилла', 'Вилла целиком', 19000)
)
UPDATE listing_units u SET price_per_night=r.price_per_night, currency='RUB'
FROM listings l, rates r
WHERE u.listing_id=l.id AND l.title_ru=r.listing_title AND u.name_ru=r.unit_name AND u.parent_unit_id IS NULL;

WITH rates (listing_title, room_name, price_per_night) AS (VALUES
  ('Хостел "Друзья"', 'Общая комната А', 1200),
  ('Хостел "Друзья"', 'Общая комната Б', 1500),
  ('Горный Приют', 'Общая комната А', 1700),
  ('Горный Приют', 'Общая комната Б', 1900)
)
UPDATE listing_units u SET price_per_night=r.price_per_night, currency='RUB'
FROM listing_units room, listings l, rates r
WHERE u.parent_unit_id=room.id AND room.listing_id=l.id
  AND l.title_ru=r.listing_title AND room.name_ru=r.room_name AND u.type='bed';

-- Demo photographs from Unsplash; replace with real inventory photographs before publication.
-- Source pages and authors are listed in backend/README.md.
WITH image_urls (unit_id, sort_order, url) AS (
  SELECT u.id, v.sort_order,
    CASE
      WHEN u.type='bed' OR EXISTS (SELECT 1 FROM listing_units child WHERE child.parent_unit_id=u.id)
        THEN CASE v.sort_order
          WHEN 0 THEN 'https://images.unsplash.com/photo-1722247520369-7f1495e79245?w=1200&q=80'
          ELSE 'https://images.unsplash.com/photo-1768289269971-6171457bed13?w=1200&q=80' END
      WHEN u.type='property'
        THEN CASE v.sort_order
          WHEN 0 THEN 'https://images.unsplash.com/photo-1759139445627-5ce9d5fac8f9?w=1200&q=80'
          ELSE 'https://images.unsplash.com/photo-1773581965471-98ee237dde0a?w=1200&q=80' END
      ELSE CASE v.sort_order
          WHEN 0 THEN 'https://images.unsplash.com/photo-1652161854125-1f5289c13eac?w=1200&q=80'
          ELSE 'https://images.unsplash.com/photo-1646082144991-dc168f7bae03?w=1200&q=80' END
    END
  FROM listing_units u JOIN listings l ON l.id=u.listing_id
  JOIN (VALUES (0),(1)) AS v(sort_order) ON true
  WHERE l.title_ru IN (
    'Гранд Отель "Центральный"', 'Приморская Жемчужина', 'Бутик-отель "Старый Город"',
    'Лофт на Красном Октябре', 'Квартира у моря', 'Хостел "Друзья"', 'Горный Приют',
    'Уютный дворик', 'Дом у озера', 'Альпийская Вилла'
  )
)
INSERT INTO listing_unit_images (unit_id, sort_order, url)
SELECT unit_id, sort_order, url FROM image_urls
ON CONFLICT DO NOTHING;

INSERT INTO listing_images (id, listing_id, url, sort_order, created_at)
SELECT gen_random_uuid(), sub.listing_id, sub.url, sub.sort_order, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (lu.listing_id, lui.url)
    lu.listing_id,
    lui.url,
    row_number() OVER (PARTITION BY lu.listing_id ORDER BY lui.sort_order, lui.created_at) as sort_order
  FROM listing_units lu
  JOIN listing_unit_images lui ON lui.unit_id = lu.id
  WHERE lui.url NOT IN (SELECT url FROM listing_images li WHERE li.listing_id = lu.listing_id)
    AND lui.url != COALESCE((SELECT main_picture FROM listings WHERE id = lu.listing_id), '')
) sub
ON CONFLICT DO NOTHING;

SELECT setval('countries_id_seq', GREATEST((SELECT last_value FROM countries_id_seq), COALESCE((SELECT max(id) FROM countries), 1)), true);
SELECT setval('locations_id_seq', GREATEST((SELECT last_value FROM locations_id_seq), COALESCE((SELECT max(id) FROM locations), 1)), true);
SELECT setval('listing_types_id_seq', GREATEST((SELECT last_value FROM listing_types_id_seq), COALESCE((SELECT max(id) FROM listing_types), 1)), true);

COMMIT;
