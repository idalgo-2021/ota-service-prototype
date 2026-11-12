-- Demo travel articles for Saint Petersburg and Moscow.
-- Requires migrations through 000009_articles_location and at least one manager/admin in users.
-- Re-running this script resets these ten demo articles and their tags by slug.

BEGIN;

CREATE TEMP TABLE seed_article_author ON COMMIT DROP AS
SELECT id
FROM users
WHERE role IN ('admin', 'manager')
ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, email
LIMIT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM seed_article_author) THEN
        RAISE EXCEPTION 'seed_articles.sql requires at least one admin or manager user';
    END IF;
END $$;

CREATE TEMP TABLE seed_articles (
    slug text PRIMARY KEY,
    title text NOT NULL,
    content_html text NOT NULL,
    cover_image_url text NOT NULL,
    tags text[] NOT NULL,
    published_at timestamptz NOT NULL,
    location_name text NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_articles (slug, title, content_html, cover_image_url, tags, published_at, location_name) VALUES
(
    'petersburg-first-walk',
    'Первое утро в Петербурге',
    '<p>Начните знакомство с городом у Дворцовой площади: ранним утром здесь особенно тихо, а фасады постепенно ловят солнце.</p><img src="https://images.unsplash.com/photo-1556610961-2fecc5927173?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Архитектура Петербурга"><p>Затем сверните к набережной и просто идите вдоль воды — так легко почувствовать ритм города.</p>',
    'https://images.unsplash.com/photo-1556610961-2fecc5927173?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Санкт-Петербург', 'прогулки', 'первое путешествие'], now() - interval '1 day', 'Санкт-Петербург'
),
(
    'white-nights-by-the-water',
    'Белые ночи у воды',
    '<p>В сезон белых ночей не планируйте слишком много: возьмите кофе и отправляйтесь к Неве ближе к полуночи.</p><img src="https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Вечерняя прогулка у воды"><p>Даже обычная прогулка по набережной превращается в главное впечатление поездки.</p>',
    'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Санкт-Петербург', 'белые ночи', 'набережные'], now() - interval '2 days', 'Санкт-Петербург'
),
(
    'hermitage-without-rush',
    'Эрмитаж без спешки',
    '<p>На Эрмитаж лучше выделить несколько часов и заранее выбрать несколько залов. Так останется время рассмотреть детали, а не только пройти маршрут.</p><img src="https://images.unsplash.com/photo-1520106212299-d99c443e4568?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Историческая архитектура"><p>После музея приятно пройтись по Дворцовой площади и отдохнуть у воды.</p>',
    'https://images.unsplash.com/photo-1520106212299-d99c443e4568?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Санкт-Петербург', 'музеи', 'искусство'], now() - interval '3 days', 'Санкт-Петербург'
),
(
    'petersburg-courtyards',
    'Дворы и тихие улицы Петербурга',
    '<p>За парадными фасадами скрываются маленькие дворы, старые лестницы и уютные кофейни. Идите без строгого плана и оставляйте время на случайные повороты.</p><img src="https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Городская улица"><p>Только помните о жителях домов и не заходите туда, где вход закрыт.</p>',
    'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Санкт-Петербург', 'архитектура', 'городские прогулки'], now() - interval '4 days', 'Санкт-Петербург'
),
(
    'petersburg-islands-day',
    'День на островах Петербурга',
    '<p>Петроградская сторона и Васильевский остров подходят для неспешного дня: красивая застройка, просторные набережные и много мест, где можно остановиться.</p><img src="https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Петербургская набережная"><p>Удобная обувь здесь важнее плотного расписания.</p>',
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Санкт-Петербург', 'острова', 'набережные'], now() - interval '5 days', 'Санкт-Петербург'
),
(
    'moscow-red-square-morning',
    'Москва до начала дня',
    '<p>Красная площадь ранним утром выглядит совсем иначе: меньше людей, мягкий свет и возможность спокойно рассмотреть пространство вокруг.</p><img src="https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Утренний центр города"><p>После прогулки загляните в Александровский сад — он совсем рядом.</p>',
    'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Москва', 'центр', 'утро'], now() - interval '6 days', 'Москва'
),
(
    'moscow-metro-as-museum',
    'Московское метро как музей',
    '<p>Некоторые станции метро сами по себе похожи на небольшие залы музея: мозаики, светильники и мраморные детали встречаются прямо по пути.</p><img src="https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Детали городской архитектуры"><p>Выберите пару станций и осмотрите их в спокойном темпе, не мешая пассажирам.</p>',
    'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Москва', 'метро', 'архитектура'], now() - interval '7 days', 'Москва'
),
(
    'moscow-parks-slow-day',
    'Спокойный день в московском парке',
    '<p>После насыщенного центра устройте паузу в парке. Прогулка по аллеям, скамейка у воды и перекус на свежем воздухе помогают увидеть более спокойную Москву.</p><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Зелёная аллея в парке"><p>Проверьте заранее, как удобнее добраться до выбранного парка.</p>',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Москва', 'парки', 'отдых'], now() - interval '8 days', 'Москва'
),
(
    'moscow-river-evening',
    'Вечерняя прогулка вдоль Москвы-реки',
    '<p>На закате пройдитесь по набережной и посмотрите на город с другого берега. Вечерний маршрут хорошо подходит для последнего дня поездки.</p><img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Вечерний городской пейзаж"><p>Возьмите лёгкую куртку: у воды может быть прохладнее.</p>',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Москва', 'набережные', 'вечер'], now() - interval '9 days', 'Москва'
),
(
    'two-capitals-one-trip',
    'Две столицы за одну поездку',
    '<p>Москва и Петербург хорошо дополняют друг друга: одна впечатляет масштабом, другая — близостью воды и исторических улиц.</p><img src="https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Путешествие по городу"><p>Оставьте между переездами свободное время и не пытайтесь уместить все достопримечательности в один маршрут.</p>',
    'https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=1200&q=80',
    ARRAY['Москва', 'Санкт-Петербург', 'маршруты'], now() - interval '10 days', 'Москва'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM seed_articles s
        WHERE NOT EXISTS (
            SELECT 1 FROM locations loc
            WHERE loc.name_ru = s.location_name
        )
    ) THEN
        RAISE EXCEPTION 'seed_articles.sql requires Saint Petersburg and Moscow locations; run seed_listings.sql first';
    END IF;
END $$;

INSERT INTO articles (slug, title, content_html, cover_image_url, location_id, author_id, is_published, published_at)
SELECT s.slug, s.title, s.content_html, s.cover_image_url, location.id, author.id, true, s.published_at
FROM seed_articles s
CROSS JOIN seed_article_author author
CROSS JOIN LATERAL (
    SELECT loc.id FROM locations loc
    WHERE loc.name_ru = s.location_name
    ORDER BY loc.id
    LIMIT 1
) location
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    cover_image_url = EXCLUDED.cover_image_url,
    location_id = EXCLUDED.location_id,
    author_id = EXCLUDED.author_id,
    is_published = true,
    published_at = EXCLUDED.published_at,
    updated_at = now();

DELETE FROM article_tags t
USING articles a, seed_articles s
WHERE t.article_id = a.id AND a.slug = s.slug;

INSERT INTO article_tags (article_id, tag)
SELECT a.id, tags.tag
FROM articles a
JOIN seed_articles s ON s.slug = a.slug
CROSS JOIN LATERAL unnest(s.tags) AS tags(tag);

COMMIT;
