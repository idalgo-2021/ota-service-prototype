-- Demo data for the product catalog.
-- Run seed_listings.sql first: it creates the countries and locations used below.
-- Re-running is safe: products are matched by their Russian name and location.

BEGIN;

INSERT INTO counterparties (id, name, location_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Турагентство «Астра»', 1),
('22222222-2222-2222-2222-222222222222', 'Сочи Гид', 2),
('33333333-3333-3333-3333-333333333333', 'Петербургские маршруты', 3),
('44444444-4444-4444-4444-444444444444', 'Сервис «Путешествие без забот»', 1),
('55555555-5555-5555-5555-555555555555', 'Горные маршруты Красной Поляны', 5),
('66666666-6666-6666-6666-666666666666', 'Экскурсионное бюро «Адлер»', 4),
('77777777-7777-7777-7777-777777777777', 'Суздальские приключения', 6),
('88888888-8888-8888-8888-888888888888', 'Селигерские маршруты', 7),
('a1111111-1111-4111-8111-111111111111', 'Сервис «Путешествие без забот» — Сочи', 2),
('a2222222-2222-4222-8222-222222222222', 'Сервис «Путешествие без забот» — Санкт-Петербург', 3),
('a3333333-3333-4333-8333-333333333333', 'Сервис «Путешествие без забот» — Адлер', 4),
('a4444444-4444-4444-8444-444444444444', 'Сервис «Путешествие без забот» — Красная Поляна', 5),
('a5555555-5555-4555-8555-555555555555', 'Сервис «Путешествие без забот» — Суздаль', 6),
('a6666666-6666-4666-8666-666666666666', 'Сервис «Путешествие без забот» — Осташков', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location_id = EXCLUDED.location_id, updated_at = NOW();

WITH seed_products (
    name, name_ru, description, description_ru, product_type, location_id, counterparty_id,
    price, currency, is_active, thumbnail, images, attributes, schedule
) AS (VALUES
(
    'Moscow: Classic City Tour', 'Москва: классическая обзорная экскурсия',
    'A walking tour of Red Square, Alexander Garden, and Moscow''s historic center.', 'Пешеходная экскурсия по Красной площади, Александровскому саду и историческому центру Москвы.',
    'tour', 1, '11111111-1111-1111-1111-111111111111', 2500.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1513326738677-b964603b136d","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1513326738677-b964603b136d","width":800,"height":600}]',
    '{"duration_minutes":"180","language":"ru","format":"group","meeting_point":"Красная площадь"}',
    '[{"weekday":2,"time":"10:00"},{"weekday":4,"time":"10:00"}]'
),
(
    'Sochi: Krasnaya Polyana and Waterfalls', 'Сочи: Красная Поляна и водопады',
    'A day trip from Sochi to the mountains, with stops at waterfalls and viewpoints.', 'Однодневная поездка из Сочи в горный кластер с остановками у водопадов и смотровых площадок.',
    'tour', 2, '22222222-2222-2222-2222-222222222222', 6800.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1548013146-72479768bada","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1548013146-72479768bada","width":800,"height":600}]',
    '{"duration_minutes":"600","language":"ru","format":"small_group","included":"трансфер, гид"}',
    '[{"weekday":6,"time":"09:00"}]'
),
(
    'Saint Petersburg: Guided Hermitage Tour', 'Петербург: Эрмитаж с гидом',
    'A guided tour of the Hermitage''s main halls with an admission ticket.', 'Экскурсия по главным залам Эрмитажа с лицензированным гидом и входным билетом.',
    'tour', 3, '33333333-3333-3333-3333-333333333333', 4200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1556610961-2fecc5927173","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1556610961-2fecc5927173","width":800,"height":600}]',
    '{"duration_minutes":"150","language":"ru","format":"group","included":"входной билет"}',
    NULL
),
(
    'Private Airport Transfer', 'Индивидуальный трансфер из аэропорта',
    'A business-class car transfer between the airport or railway station and Moscow.', 'Трансфер на автомобиле бизнес-класса из аэропорта или на вокзал в пределах Москвы.',
    'service', 1, '44444444-4444-4444-4444-444444444444', 3200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1549317661-bd32c8ce0db2","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1549317661-bd32c8ce0db2","width":800,"height":600}]',
    '{"service_type":"transfer","vehicle_class":"business","passengers_max":"3","booking_notice_hours":"3"}',
    NULL
),
(
    'Travel Insurance for Russia', 'Страховка для путешествий по России',
    'Travel insurance for trips in Russia with emergency medical coverage.', 'Полис для поездок по России с покрытием экстренной медицинской помощи.',
    'service', 1, '44444444-4444-4444-4444-444444444444', 450.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"insurance","coverage_days":"1-30","coverage_amount":"3000000","age_limit":"70"}',
    NULL
),
(
    'Picnic Set', 'Набор для пикника',
    'A blanket, foldable tableware, and a thermos for independent outings.', 'Плед, складная посуда и термос для самостоятельных прогулок и поездок.',
    'goods', 2, NULL, 1900.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba","width":800,"height":600}]',
    '{"category":"outdoor","weight_kg":"2.4","items_count":"6"}',
    NULL
),
(
    'Saint Petersburg Souvenir Set', 'Сувенирный набор «Санкт-Петербург»',
    'Postcards, a magnet, and a small guide to Saint Petersburg''s historic center.', 'Открытки, магнит и небольшой путеводитель по историческому центру Санкт-Петербурга.',
    'goods', 3, NULL, 1200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4","width":800,"height":600}]',
    '{"category":"souvenir","items_count":"8","language":"ru"}',
    NULL
),
(
    'Archived Moscow Tour', 'Архивный тур по Москве',
    'An inactive demonstration product for checking the manager interface.', 'Демонстрационный неактивный продукт для проверки интерфейса менеджера.',
    'tour', 1, '11111111-1111-1111-1111-111111111111', 1800.00, 'RUB', false,
    '{"url":"https://images.unsplash.com/photo-1513326738677-b964603b136d","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1513326738677-b964603b136d","width":800,"height":600}]',
    '{"duration_minutes":"120","language":"ru","format":"group","archived_reason":"снят с продажи"}',
    NULL
),
(
    'Moscow: Kremlin and Zaryadye', 'Москва: Кремль и парк «Зарядье»',
    'A guided walk through the historic center, the Kremlin surroundings, and Zaryadye Park.', 'Прогулка с гидом по историческому центру, окрестностям Кремля и парку «Зарядье».',
    'tour', 1, '11111111-1111-1111-1111-111111111111', 1900.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1520106212299-d99c443e4568","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1520106212299-d99c443e4568","width":800,"height":600}]',
    '{"duration_minutes":"120","language":"ru","format":"group","meeting_point":"Манежная площадь"}',
    '[{"weekday":1,"time":"11:00"},{"weekday":5,"time":"17:00"}]'
),
(
    'Moscow: Kolomenskoye Nature Trail', 'Москва: прогулка по тропам Коломенского',
    'A scenic hike through the ravines, gardens, and historic grounds of Kolomenskoye.', 'Живописный поход по оврагам, садам и исторической территории Коломенского.',
    'tour', 1, '11111111-1111-1111-1111-111111111111', 2400.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1501785888041-af3ef285b470","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1501785888041-af3ef285b470","width":800,"height":600}]',
    '{"duration_minutes":"210","language":"ru","format":"small_group","difficulty":"easy","distance_km":"7"}',
    '[{"weekday":6,"time":"10:00"},{"weekday":7,"time":"10:00"}]'
),
(
    'Sochi: Evening Olympic Park', 'Сочи: вечерний Олимпийский парк',
    'An evening tour of the Olympic venues and the musical fountain show.', 'Вечерняя экскурсия по олимпийским объектам с посещением шоу поющих фонтанов.',
    'tour', 2, '22222222-2222-2222-2222-222222222222', 2800.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1594736797933-d0501ba2fe65","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1594736797933-d0501ba2fe65","width":800,"height":600}]',
    '{"duration_minutes":"240","language":"ru","format":"group","included":"трансфер, гид"}',
    '[{"weekday":3,"time":"17:00"},{"weekday":6,"time":"17:00"}]'
),
(
    'Sochi: Agura Waterfalls Hike', 'Сочи: поход к Агурским водопадам',
    'A guided forest hike to the Agura waterfalls and Eagle Rocks viewpoints.', 'Поход с гидом через лес к Агурским водопадам и смотровым площадкам Орлиных скал.',
    'tour', 2, '22222222-2222-2222-2222-222222222222', 3600.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9","width":800,"height":600}]',
    '{"duration_minutes":"300","language":"ru","format":"small_group","difficulty":"medium","distance_km":"9"}',
    '[{"weekday":2,"time":"08:30"},{"weekday":5,"time":"08:30"}]'
),
(
    'Saint Petersburg: Rivers and Canals', 'Петербург: реки и каналы',
    'A boat excursion along the Neva, Fontanka, and the city canals.', 'Водная экскурсия по Неве, Фонтанке и каналам исторического центра.',
    'tour', 3, '33333333-3333-3333-3333-333333333333', 2600.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1556610961-2fecc5927173","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1556610961-2fecc5927173","width":800,"height":600}]',
    '{"duration_minutes":"90","language":"ru","format":"group","included":"билет на теплоход"}',
    '[{"weekday":4,"time":"13:00"},{"weekday":7,"time":"15:00"}]'
),
(
    'Saint Petersburg: Peterhof Grand Tour', 'Петербург: большой тур в Петергоф',
    'A guided trip to Peterhof with a transfer and admission to the Lower Park.', 'Экскурсия в Петергоф с трансфером и входным билетом в Нижний парк.',
    'tour', 3, '33333333-3333-3333-3333-333333333333', 5400.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1548834925-e48f8a27ae24","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1548834925-e48f8a27ae24","width":800,"height":600}]',
    '{"duration_minutes":"420","language":"ru","format":"group","included":"трансфер, гид, входной билет"}',
    '[{"weekday":2,"time":"09:00"},{"weekday":6,"time":"09:00"}]'
),
(
    'Adler: Akhshtyr Gorge Hike', 'Адлер: поход по Ахштырскому ущелью',
    'A hiking route through the gorge with a visit to the cave and panoramic viewpoints.', 'Пешеходный маршрут по ущелью с посещением пещеры и панорамных площадок.',
    'tour', 4, '66666666-6666-6666-6666-666666666666', 3900.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b","width":800,"height":600}]',
    '{"duration_minutes":"330","language":"ru","format":"small_group","difficulty":"medium","distance_km":"8"}',
    '[{"weekday":3,"time":"08:00"},{"weekday":7,"time":"08:00"}]'
),
(
    'Adler: Coast and Southern Cultures Park', 'Адлер: побережье и парк «Южные культуры»',
    'A relaxed guided walk along the coast and through the subtropical park.', 'Неспешная экскурсия по набережной и субтропическому парку «Южные культуры».',
    'tour', 4, '66666666-6666-6666-6666-666666666666', 2200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429","width":800,"height":600}]',
    '{"duration_minutes":"180","language":"ru","format":"group","difficulty":"easy","included":"входной билет"}',
    '[{"weekday":1,"time":"10:30"},{"weekday":5,"time":"15:00"}]'
),
(
    'Krasnaya Polyana: Bzerpi Cornice Trek', 'Красная Поляна: поход на Бзерпинский карниз',
    'A full-day mountain trek to Bzerpi Cornice with a certified guide.', 'Горный поход на весь день к Бзерпинскому карнизу с сертифицированным гидом.',
    'tour', 5, '55555555-5555-5555-5555-555555555555', 7900.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1464278533981-50106e6176b1","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1464278533981-50106e6176b1","width":800,"height":600}]',
    '{"duration_minutes":"600","language":"ru","format":"small_group","difficulty":"hard","distance_km":"14","included":"гид, треккинговые палки"}',
    '[{"weekday":4,"time":"07:00"},{"weekday":7,"time":"07:00"}]'
),
(
    'Krasnaya Polyana: Aibga Panorama', 'Красная Поляна: панорамы хребта Аибга',
    'A moderate mountain hike along panoramic trails of the Aibga ridge.', 'Поход средней сложности по панорамным тропам хребта Аибга.',
    'tour', 5, '55555555-5555-5555-5555-555555555555', 6200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1486911278844-a81c5267e227","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1486911278844-a81c5267e227","width":800,"height":600}]',
    '{"duration_minutes":"420","language":"ru","format":"small_group","difficulty":"medium","distance_km":"10"}',
    '[{"weekday":2,"time":"08:00"},{"weekday":6,"time":"08:00"}]'
),
(
    'Suzdal: Monasteries and Kremlin', 'Суздаль: монастыри и кремль',
    'A walking tour through the Suzdal Kremlin and the city monasteries.', 'Пешеходная экскурсия по Суздальскому кремлю и главным монастырям города.',
    'tour', 6, '77777777-7777-7777-7777-777777777777', 1700.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1523731407965-2430cd12f5e4","width":800,"height":600}]',
    '{"duration_minutes":"150","language":"ru","format":"group","meeting_point":"Торговая площадь"}',
    '[{"weekday":3,"time":"11:00"},{"weekday":6,"time":"11:00"}]'
),
(
    'Suzdal: Cycling Along the Kamenka', 'Суздаль: велопрогулка вдоль Каменки',
    'A guided bicycle ride along the Kamenka River and quiet country lanes.', 'Велопрогулка с гидом вдоль реки Каменки и по тихим загородным дорогам.',
    'tour', 6, '77777777-7777-7777-7777-777777777777', 3200.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1541625602330-2277a4c46182","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1541625602330-2277a4c46182","width":800,"height":600}]',
    '{"duration_minutes":"240","language":"ru","format":"small_group","difficulty":"easy","distance_km":"16","included":"велосипед, шлем"}',
    '[{"weekday":5,"time":"10:00"},{"weekday":7,"time":"10:00"}]'
),
(
    'Ostashkov: Seliger Islands Boat Tour', 'Осташков: водная экскурсия по островам Селигера',
    'A boat trip around the Seliger islands with shore stops and a guide.', 'Прогулка на катере по островам Селигера с высадками на берег и сопровождением гида.',
    'tour', 7, '88888888-8888-8888-8888-888888888888', 4500.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429","width":800,"height":600}]',
    '{"duration_minutes":"300","language":"ru","format":"small_group","included":"катер, спасательный жилет, гид"}',
    '[{"weekday":3,"time":"10:00"},{"weekday":6,"time":"10:00"}]'
),
(
    'Ostashkov: Forest Trail to Nilov Monastery', 'Осташков: лесной маршрут к Ниловой пустыни',
    'A forest hike with lake views ending near the Nilov Monastery.', 'Лесной поход с видами на озеро и завершением маршрута у Ниловой пустыни.',
    'tour', 7, '88888888-8888-8888-8888-888888888888', 2800.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1441974231531-c6227db76b6e","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1441974231531-c6227db76b6e","width":800,"height":600}]',
    '{"duration_minutes":"270","language":"ru","format":"small_group","difficulty":"easy","distance_km":"11"}',
    '[{"weekday":2,"time":"09:00"},{"weekday":7,"time":"09:00"}]'
),
(
    'Moscow Accident Insurance', 'Москва: страхование от несчастного случая',
    'One-day accident insurance for excursions and active leisure in Moscow.', 'Страхование от несчастного случая на один день для экскурсий и активного отдыха в Москве.',
    'service', 1, '44444444-4444-4444-4444-444444444444', 350.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"500000","age_limit":"75","territory":"Москва"}',
    NULL
),
(
    'Sochi Accident Insurance', 'Сочи: страхование от несчастного случая',
    'One-day accident insurance for excursions and active leisure in Sochi.', 'Страхование от несчастного случая на один день для экскурсий и активного отдыха в Сочи.',
    'service', 2, 'a1111111-1111-4111-8111-111111111111', 420.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"500000","age_limit":"75","territory":"Сочи"}',
    NULL
),
(
    'Saint Petersburg Accident Insurance', 'Санкт-Петербург: страхование от несчастного случая',
    'One-day accident insurance for excursions and active leisure in Saint Petersburg.', 'Страхование от несчастного случая на один день для экскурсий и активного отдыха в Санкт-Петербурге.',
    'service', 3, 'a2222222-2222-4222-8222-222222222222', 390.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"500000","age_limit":"75","territory":"Санкт-Петербург"}',
    NULL
),
(
    'Adler Accident Insurance', 'Адлер: страхование от несчастного случая',
    'One-day accident insurance for excursions and active leisure in Adler.', 'Страхование от несчастного случая на один день для экскурсий и активного отдыха в Адлере.',
    'service', 4, 'a3333333-3333-4333-8333-333333333333', 370.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"500000","age_limit":"75","territory":"Адлер"}',
    NULL
),
(
    'Krasnaya Polyana Accident Insurance', 'Красная Поляна: страхование от несчастного случая',
    'One-day accident insurance for mountain hikes and active leisure in Krasnaya Polyana.', 'Страхование от несчастного случая на один день для горных походов и активного отдыха в Красной Поляне.',
    'service', 5, 'a4444444-4444-4444-8444-444444444444', 650.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"1000000","age_limit":"70","territory":"Красная Поляна","sport":"trekking"}',
    NULL
),
(
    'Suzdal Accident Insurance', 'Суздаль: страхование от несчастного случая',
    'One-day accident insurance for excursions and cycling in Suzdal.', 'Страхование от несчастного случая на один день для экскурсий и велопрогулок в Суздале.',
    'service', 6, 'a5555555-5555-4555-8555-555555555555', 330.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"500000","age_limit":"75","territory":"Суздаль"}',
    NULL
),
(
    'Ostashkov Accident Insurance', 'Осташков: страхование от несчастного случая',
    'One-day accident insurance for water trips and hikes around Seliger.', 'Страхование от несчастного случая на один день для водных прогулок и походов по Селигеру.',
    'service', 7, 'a6666666-6666-4666-8666-666666666666', 480.00, 'RUB', true,
    '{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}',
    '[{"url":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85","width":800,"height":600}]',
    '{"service_type":"accident_insurance","coverage_days":"1","coverage_amount":"750000","age_limit":"75","territory":"Осташков и Селигер","water_activity":"included"}',
    NULL
)
)
INSERT INTO products (
    name, name_ru, description, description_ru, product_type, location_id, counterparty_id,
    price, currency, is_active, thumbnail, images, attributes, schedule
)
SELECT
    s.name, s.name_ru, s.description, s.description_ru, s.product_type, s.location_id, s.counterparty_id::uuid,
    s.price, s.currency, s.is_active, s.thumbnail::jsonb, s.images::jsonb, s.attributes::jsonb, s.schedule::jsonb
FROM seed_products s
WHERE NOT EXISTS (
    SELECT 1
    FROM products p
    WHERE p.name_ru = s.name_ru AND p.location_id = s.location_id
);

COMMIT;
