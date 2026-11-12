-- Demo exchange rates for the default base currency RUB.
-- Run after migrations and before creating demo orders/bookings.
-- Rates are fixed demonstration values, not a market data feed.

INSERT INTO currencies (code, name, name_ru, is_active)
VALUES
    ('RUB', 'Russian ruble', 'Российский рубль', true),
    ('USD', 'US dollar', 'Доллар США', true),
    ('EUR', 'Euro', 'Евро', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    name_ru = EXCLUDED.name_ru,
    is_active = EXCLUDED.is_active;

INSERT INTO exchange_rates (quote_currency, rate, effective_from)
VALUES
    ('USD', 0.0115, '2026-01-01T00:00:00Z'),
    ('EUR', 0.0108, '2026-01-01T00:00:00Z'),
    ('USD', 0.0108, '2026-07-01T00:00:00Z'),
    ('EUR', 0.0099, '2026-07-01T00:00:00Z')
ON CONFLICT (quote_currency, effective_from) DO NOTHING;
