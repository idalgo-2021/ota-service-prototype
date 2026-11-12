-- Demo orders in every status. Run seed_users.sql, seed_listings.sql and
-- seed_products.sql first. Fixed IDs make reruns safe and preserve orders
-- that a demo client has already changed.
BEGIN;

CREATE TEMP TABLE seed_order_rows (
    order_id uuid, email text, product_name text, service_date date,
    quantity integer, status text, created_at timestamptz,
    fulfilled_at timestamptz, cancelled_at timestamptz,
    cancellation_reason text
) ON COMMIT DROP;

INSERT INTO seed_order_rows VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alfred@example.com', 'Москва: классическая обзорная экскурсия', '2026-11-10', 2, 'confirmed', '2026-10-20 10:00:00+03', NULL, NULL, NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'boris@example.com', 'Сочи: Красная Поляна и водопады', '2026-11-14', 1, 'pending', now() - interval '45 minutes', NULL, NULL, NULL),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cindy@example.com', 'Петербург: Эрмитаж с гидом', NULL, 2, 'confirmed', '2026-10-28 09:15:00+03', NULL, NULL, NULL),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'david@example.com', 'Москва: классическая обзорная экскурсия', '2026-11-26', 1, 'pending', now() - interval '50 minutes', NULL, NULL, NULL),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'alfred@example.com', 'Страховка для путешествий по России', NULL, 1, 'pending', now() - interval '30 minutes', NULL, NULL, NULL),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'alfred@example.com', 'Индивидуальный трансфер из аэропорта', '2026-09-12', 1, 'fulfilled', '2026-09-10 10:00:00+03', '2026-09-12 16:00:00+03', NULL, NULL),
    ('99999999-9999-4999-8999-999999999999', 'david@example.com', 'Набор для пикника', NULL, 1, 'cancelled', '2026-10-10 10:00:00+03', NULL, '2026-10-10 11:00:00+03', 'Изменились планы');

INSERT INTO orders (
    id, user_id, status, total, currency, created_at, updated_at,
    fulfilled_at, cancelled_at, cancelled_by, cancellation_reason
)
SELECT s.order_id, u.id, s.status, p.price * s.quantity, p.currency, s.created_at,
       COALESCE(s.fulfilled_at, s.cancelled_at, s.created_at),
       s.fulfilled_at, s.cancelled_at,
       CASE WHEN s.cancelled_at IS NOT NULL THEN u.id END,
       s.cancellation_reason
FROM seed_order_rows s
JOIN users u ON u.email = s.email
JOIN products p ON p.name_ru = s.product_name AND p.is_active
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, currency, service_date, position)
SELECT s.order_id, p.id, s.quantity, p.price, p.currency, s.service_date, 1
FROM seed_order_rows s
JOIN products p ON p.name_ru = s.product_name AND p.is_active
JOIN orders o ON o.id = s.order_id
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = s.order_id AND oi.position = 1);

COMMIT;
