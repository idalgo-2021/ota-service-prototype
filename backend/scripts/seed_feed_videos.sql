BEGIN;

INSERT INTO feed_videos (id, demo_id, listing_id, location_id, title, subtitle, author, sort_order) VALUES
('00000000-0000-4000-8000-000000000004', '04', NULL, NULL, 'Навстречу впечатлениям', 'Путешествие начинается здесь', '@travel.story', 0),
('00000000-0000-4000-8000-000000000002', '02', 'a9d0d501-b723-48e0-9f52-93db2e16f905', 2, 'Ближе к природе', 'Откройте новое направление', '@explore', 1),
('00000000-0000-4000-8000-000000000003', '03', '9d64b305-20d0-4d08-b39f-caeb06457b14', 3, 'Время для себя', 'Вдохновение для следующей поездки', '@visuals', 2),
('00000000-0000-4000-8000-000000000001', '01', 'd772733f-a36e-454a-a9da-5650fbe66413', 7, 'Утро среди деревьев', 'Место, где можно замедлиться', '@nature', 3)
ON CONFLICT (id) DO UPDATE SET
    demo_id = EXCLUDED.demo_id,
    listing_id = EXCLUDED.listing_id,
    location_id = EXCLUDED.location_id,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    author = EXCLUDED.author,
    sort_order = EXCLUDED.sort_order;

COMMIT;
