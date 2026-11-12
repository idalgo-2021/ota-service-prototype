-- Baseline schema for this repository.
CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- Helper Functions & Triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_listing_unit_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.type = 'bed' AND NOT EXISTS (
        SELECT 1 FROM listing_units p WHERE p.id = NEW.parent_unit_id AND p.listing_id = NEW.listing_id AND p.type = 'room'
    ) THEN
        RAISE EXCEPTION 'bed parent must be a room in the same listing';
    END IF;
    IF NEW.type = 'bed' AND EXISTS (
        SELECT 1 FROM booking_units bu WHERE bu.unit_id = NEW.parent_unit_id
    ) THEN
        RAISE EXCEPTION 'cannot add beds to a room with booking history';
    END IF;
    IF NEW.type <> 'room' AND EXISTS (SELECT 1 FROM listing_units c WHERE c.parent_unit_id = NEW.id) THEN
        RAISE EXCEPTION 'unit with beds must remain a room';
    END IF;
    RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- Dictionaries & Common Entities
-- -----------------------------------------------------------------------------

CREATE TABLE countries (
    id      SERIAL PRIMARY KEY,
    name    TEXT NOT NULL,
    code    VARCHAR(2) NOT NULL UNIQUE,
    name_ru TEXT CHECK (name_ru IS NULL OR btrim(name_ru) <> '')
);

CREATE TABLE currencies (
    code       VARCHAR(3) PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
    name       VARCHAR(100) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name_ru    TEXT CHECK (name_ru IS NULL OR btrim(name_ru) <> '')
);

CREATE TABLE listing_types (
    id      SERIAL PRIMARY KEY,
    slug    TEXT NOT NULL UNIQUE,
    name    TEXT NOT NULL,
    name_ru TEXT CHECK (name_ru IS NULL OR btrim(name_ru) <> '')
);

CREATE TABLE listing_feature_tags (
    id         BIGSERIAL PRIMARY KEY,
    slug       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    name_ru    TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
    id               SERIAL PRIMARY KEY,
    country_id       INT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    name_ru          TEXT CHECK (name_ru IS NULL OR btrim(name_ru) <> ''),
    center_latitude  DOUBLE PRECISION,
    center_longitude DOUBLE PRECISION,
    CONSTRAINT locations_center_coordinates_check CHECK (
        (center_latitude IS NULL AND center_longitude IS NULL) OR
        (center_latitude IS NOT NULL AND center_longitude IS NOT NULL AND
         center_latitude >= -90 AND center_latitude <= 90 AND
         center_longitude >= -180 AND center_longitude <= 180)
    )
);

CREATE TABLE counterparties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    location_id INT NOT NULL REFERENCES locations(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Users & Profiles
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    role          VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin', 'hotelier', 'ai_robot'))
);

CREATE TABLE user_profiles (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name         VARCHAR(100) NOT NULL DEFAULT '',
    last_name          VARCHAR(100) NOT NULL DEFAULT '',
    birth_year         INT CHECK (birth_year >= 1900 AND birth_year <= 2100),
    about              TEXT NOT NULL DEFAULT '',
    language           VARCHAR(8) NOT NULL DEFAULT 'RU',
    currency           VARCHAR(3) NOT NULL DEFAULT 'RUB' REFERENCES currencies(code),
    country_id         INT NOT NULL REFERENCES countries(id),
    location_id        INT REFERENCES locations(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_preferences JSONB CHECK (search_preferences IS NULL OR jsonb_typeof(search_preferences) = 'object'),
    gender             VARCHAR(16) CHECK (gender IN ('male', 'female', 'other')),
    nationality        VARCHAR(100) CHECK (nationality IS NULL OR btrim(nationality) <> '')
);

CREATE TABLE exchange_rates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate           NUMERIC(24,12) NOT NULL CHECK (rate > 0),
    effective_from TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT exchange_rates_quote_currency_effective_from_key UNIQUE (quote_currency, effective_from)
);

-- -----------------------------------------------------------------------------
-- Listings & Units
-- -----------------------------------------------------------------------------

CREATE TABLE listings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    description             TEXT,
    main_picture            TEXT,
    listing_type_id         INT NOT NULL REFERENCES listing_types(id),
    address                 TEXT,
    location_id             INT NOT NULL REFERENCES locations(id),
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    deactivated_at          TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_in_time           TIME NOT NULL DEFAULT '14:00:00',
    geo                     geography(Point,4326) GENERATED ALWAYS AS (
        CASE
            WHEN latitude >= -90 AND latitude <= 90 AND longitude >= -180 AND longitude <= 180
            THEN st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
            ELSE NULL
        END
    ) STORED,
    title_ru                TEXT CHECK (title_ru IS NULL OR btrim(title_ru) <> ''),
    description_ru          TEXT CHECK (description_ru IS NULL OR btrim(description_ru) <> ''),
    external_source         TEXT CHECK (external_source IS NULL OR external_source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
    external_id             TEXT CHECK (external_id IS NULL OR (octet_length(external_id) >= 1 AND octet_length(external_id) <= 255 AND external_id = btrim(external_id))),
    address_ru              TEXT CHECK (address_ru IS NULL OR btrim(address_ru) <> ''),
    source_metadata         JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(source_metadata) = 'object'),
    distance_from_center_km NUMERIC(9,3) CHECK (distance_from_center_km >= 0),
    average_overall_rating  NUMERIC(4,2) CHECK (average_overall_rating IS NULL OR (average_overall_rating >= 1 AND average_overall_rating <= 10)),
    average_rating_details  JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(average_rating_details) = 'object'),
    overall_rating_count    INT NOT NULL DEFAULT 0 CHECK (overall_rating_count >= 0 AND (overall_rating_count = 0) = (average_overall_rating IS NULL)),
    CONSTRAINT listings_external_identity_pair_check CHECK ((external_source IS NULL) = (external_id IS NULL))
);

CREATE TABLE listing_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listing_feature_tag_assignments (
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    tag_id     BIGINT NOT NULL REFERENCES listing_feature_tags(id) ON DELETE RESTRICT,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (listing_id, tag_id)
);

CREATE TABLE listing_review_summaries (
    listing_id          UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    summary             TEXT NOT NULL CHECK (btrim(summary) <> ''),
    source_review_count INT NOT NULL CHECK (source_review_count >= 0),
    model_id            TEXT NOT NULL,
    prompt_version      TEXT NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listing_disappointment_analyses (
    listing_id     UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    source_hash    TEXT NOT NULL,
    result         JSONB NOT NULL,
    model_id       TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    generated_at   TIMESTAMPTZ NOT NULL,
    synced_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotelier_listings (
    hotelier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (hotelier_id, listing_id)
);

CREATE TABLE hotelier_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotelier_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id          UUID REFERENCES listings(id) ON DELETE CASCADE,
    message_type        TEXT NOT NULL CHECK (message_type IN ('client_question', 'ota_notification', 'ota_recommendation')),
    sender_type         TEXT NOT NULL CHECK (sender_type IN ('ota', 'known_client', 'unknown_client', 'staff', 'system')),
    sender_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name         TEXT,
    sender_email        TEXT,
    source              TEXT,
    external_message_id TEXT,
    message_text        TEXT NOT NULL CHECK (length(btrim(message_text)) > 0),
    hotelier_reply      TEXT,
    status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    replied_at          TIMESTAMPTZ,
    processed_at        TIMESTAMPTZ,
    CONSTRAINT hotelier_messages_check CHECK ((source IS NULL) = (external_message_id IS NULL)),
    CONSTRAINT hotelier_messages_global_disappointment_digest_check CHECK (
        (listing_id IS NOT NULL) OR
        (message_type = 'ota_recommendation' AND sender_type = 'system' AND source = 'disappointment_detector' AND external_message_id IS NOT NULL)
    )
);

CREATE TABLE listing_units (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id        UUID NOT NULL REFERENCES listings(id),
    parent_unit_id    UUID,
    type              VARCHAR(20) NOT NULL CHECK (type IN ('property', 'room', 'bed')),
    name              TEXT NOT NULL CHECK (length(trim(name)) > 0),
    capacity_adults   INT NOT NULL CHECK (capacity_adults >= 0),
    capacity_children INT NOT NULL DEFAULT 0 CHECK (capacity_children >= 0),
    pets_allowed      BOOLEAN NOT NULL DEFAULT false,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price_per_night   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price_per_night >= 0),
    currency          VARCHAR(3) NOT NULL DEFAULT 'RUB' CHECK (currency ~ '^[A-Z]{3}$'),
    name_ru           TEXT CHECK (name_ru IS NULL OR btrim(name_ru) <> ''),
    CONSTRAINT listing_units_id_listing_id_key UNIQUE (id, listing_id),
    CONSTRAINT listing_units_parent_unit_id_listing_id_fkey FOREIGN KEY (parent_unit_id, listing_id) REFERENCES listing_units(id, listing_id),
    CONSTRAINT listing_units_check CHECK ((type = 'bed') = (parent_unit_id IS NOT NULL)),
    CONSTRAINT listing_units_check1 CHECK ((capacity_adults + capacity_children) > 0)
);

CREATE TRIGGER listing_unit_parent_check
    BEFORE INSERT OR UPDATE ON listing_units
    FOR EACH ROW EXECUTE FUNCTION validate_listing_unit_parent();

CREATE TABLE listing_unit_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id    UUID NOT NULL REFERENCES listing_units(id) ON DELETE CASCADE,
    url        TEXT NOT NULL CHECK (length(trim(url)) > 0),
    sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listing_unit_images_unit_id_sort_order_key UNIQUE (unit_id, sort_order),
    CONSTRAINT listing_unit_images_unit_id_url_key UNIQUE (unit_id, url)
);

-- -----------------------------------------------------------------------------
-- Bookings
-- -----------------------------------------------------------------------------

CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          UUID NOT NULL REFERENCES listings(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    check_in_date       DATE NOT NULL,
    check_out_date      DATE NOT NULL,
    adults_count        INT NOT NULL CHECK (adults_count >= 0),
    children_count      INT NOT NULL DEFAULT 0 CHECK (children_count >= 0),
    has_pets            BOOLEAN NOT NULL DEFAULT false,
    status              VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'completed', 'canceled')),
    cancellation_reason TEXT,
    canceled_by         UUID REFERENCES users(id),
    canceled_at         TIMESTAMP,
    checked_in_by       UUID REFERENCES users(id),
    checked_in_at       TIMESTAMP,
    completed_by        UUID REFERENCES users(id),
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total               NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'RUB' CHECK (currency ~ '^[A-Z]{3}$'),
    rate_id             UUID REFERENCES exchange_rates(id),
    quoted_at           TIMESTAMPTZ,
    base_total          NUMERIC(18,2),
    CONSTRAINT bookings_id_listing_id_key UNIQUE (id, listing_id),
    CONSTRAINT bookings_check CHECK (check_out_date > check_in_date),
    CONSTRAINT bookings_check1 CHECK ((adults_count + children_count) > 0),
    CONSTRAINT bookings_check2 CHECK (
        status <> 'canceled' OR
        (cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) > 0 AND canceled_by IS NOT NULL AND canceled_at IS NOT NULL)
    )
);

CREATE TABLE booking_units (
    booking_id      UUID NOT NULL,
    listing_id      UUID NOT NULL,
    unit_id         UUID NOT NULL,
    price_per_night NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price_per_night >= 0),
    PRIMARY KEY (booking_id, unit_id),
    CONSTRAINT booking_units_booking_id_listing_id_fkey FOREIGN KEY (booking_id, listing_id) REFERENCES bookings(id, listing_id),
    CONSTRAINT booking_units_unit_id_listing_id_fkey FOREIGN KEY (unit_id, listing_id) REFERENCES listing_units(id, listing_id)
);

-- -----------------------------------------------------------------------------
-- Orders & Products
-- -----------------------------------------------------------------------------

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
    total               NUMERIC(10,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    cancelled_at        TIMESTAMPTZ,
    cancelled_by        UUID REFERENCES users(id),
    cancellation_reason TEXT,
    fulfilled_at        TIMESTAMPTZ,
    moderated_at        TIMESTAMPTZ,
    moderated_by        UUID REFERENCES users(id),
    rate_id             UUID REFERENCES exchange_rates(id),
    quoted_at           TIMESTAMPTZ,
    base_total          NUMERIC(18,2),
    booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    thumbnail       JSONB,
    images          JSONB DEFAULT '[]',
    attributes      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    product_type    TEXT NOT NULL DEFAULT 'goods' CHECK (product_type IN ('tour', 'goods', 'service')),
    location_id     INT REFERENCES locations(id),
    counterparty_id UUID REFERENCES counterparties(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    deactivated_at  TIMESTAMPTZ,
    schedule        JSONB,
    name_ru         VARCHAR(255) CHECK (name_ru IS NULL OR btrim(name_ru) <> ''),
    description_ru  TEXT CHECK (description_ru IS NULL OR btrim(description_ru) <> ''),
    CONSTRAINT products_tour_schedule_check CHECK (
        schedule IS NULL OR (jsonb_typeof(schedule) = 'array' AND product_type = 'tour' AND jsonb_array_length(schedule) > 0)
    )
);

CREATE TABLE order_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id),
    quantity     INT NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    currency     VARCHAR(3) NOT NULL,
    service_date DATE,
    "position"   INT NOT NULL,
    CONSTRAINT order_items_order_id_position_key UNIQUE (order_id, "position")
);

-- -----------------------------------------------------------------------------
-- Reviews
-- -----------------------------------------------------------------------------

CREATE TABLE listing_reviews (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_user_id      UUID REFERENCES users(id),
    external_source       TEXT,
    external_review_id    TEXT,
    external_reviewer_id  TEXT,
    reviewer_display_name TEXT,
    listing_id            UUID NOT NULL REFERENCES listings(id),
    booking_id            UUID REFERENCES bookings(id),
    overall_rating        NUMERIC(4,2) CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 10 AND (overall_rating * 10) = trunc(overall_rating * 10))),
    status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_moderation', 'approved', 'rejected')),
    is_hidden             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at          TIMESTAMPTZ,
    original_at           TIMESTAMPTZ,
    moderated_at          TIMESTAMPTZ,
    moderated_by          UUID REFERENCES users(id),
    rejection_reason      TEXT,
    hidden_at             TIMESTAMPTZ,
    hidden_by             UUID REFERENCES users(id),
    hidden_reason         TEXT,
    positive_review       TEXT,
    negative_review       TEXT,
    cleanliness_rating    NUMERIC CHECK (cleanliness_rating IS NULL OR (cleanliness_rating >= 1 AND cleanliness_rating <= 10 AND (cleanliness_rating * 2) = trunc(cleanliness_rating * 2))),
    staff_rating          NUMERIC CHECK (staff_rating IS NULL OR (staff_rating >= 1 AND staff_rating <= 10 AND (staff_rating * 2) = trunc(staff_rating * 2))),
    comfort_rating        NUMERIC CHECK (comfort_rating IS NULL OR (comfort_rating >= 1 AND comfort_rating <= 10 AND (comfort_rating * 2) = trunc(comfort_rating * 2))),
    location_rating       NUMERIC CHECK (location_rating IS NULL OR (location_rating >= 1 AND location_rating <= 10 AND (location_rating * 2) = trunc(location_rating * 2))),
    sleep_rating          NUMERIC CHECK (sleep_rating IS NULL OR (sleep_rating >= 1 AND sleep_rating <= 10 AND (sleep_rating * 2) = trunc(sleep_rating * 2))),
    bathroom_rating       NUMERIC CHECK (bathroom_rating IS NULL OR (bathroom_rating >= 1 AND bathroom_rating <= 10 AND (bathroom_rating * 2) = trunc(bathroom_rating * 2))),
    wifi_rating           NUMERIC CHECK (wifi_rating IS NULL OR (wifi_rating >= 1 AND wifi_rating <= 10 AND (wifi_rating * 2) = trunc(wifi_rating * 2))),
    trip_purpose          TEXT CHECK (trip_purpose IN ('tourism', 'business', 'other')),
    party_type            TEXT CHECK (party_type IN ('alone', 'couple', 'family', 'friends', 'colleagues', 'other')),
    accommodation_type    TEXT CHECK (accommodation_type IN ('hotel_room', 'hostel_bed', 'guest_house_room', 'apartment', 'bed', 'room', 'property', 'mixed')),
    nights                INT CHECK (nights >= 1 AND nights <= 365),
    reviewer_age          TEXT CHECK (reviewer_age ~ '^([1-9][0-9]?|1[01][0-9]|120)$'),
    reviewer_gender       TEXT CHECK (reviewer_gender IN ('male', 'female', 'other')),
    reviewer_country      TEXT CHECK (reviewer_country IS NULL OR length(btrim(reviewer_country)) > 0),
    is_imported           BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT listing_reviews_content_check CHECK (
        (NOT is_imported AND status IN ('draft', 'rejected')) OR
        NULLIF(btrim(positive_review), '') IS NOT NULL OR
        NULLIF(btrim(negative_review), '') IS NOT NULL OR
        (is_imported AND overall_rating IS NOT NULL)
    ),
    CONSTRAINT listing_reviews_external_status_check CHECK (NOT is_imported OR status <> 'draft'),
    CONSTRAINT listing_reviews_source_check CHECK (
        (NOT is_imported AND reviewer_user_id IS NOT NULL AND booking_id IS NOT NULL AND external_source IS NULL AND external_review_id IS NULL AND external_reviewer_id IS NULL) OR
        (is_imported AND reviewer_user_id IS NULL AND booking_id IS NULL AND NULLIF(btrim(external_source), '') IS NOT NULL AND NULLIF(btrim(external_review_id), '') IS NOT NULL)
    )
);

CREATE TABLE product_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id           UUID REFERENCES users(id),
    external_source     TEXT,
    external_review_id  TEXT,
    external_author_id  TEXT,
    author_display_name TEXT,
    product_id          UUID NOT NULL REFERENCES products(id),
    order_id            UUID REFERENCES orders(id),
    rating              SMALLINT CHECK (rating >= 1 AND rating <= 5),
    review_text         TEXT,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_moderation', 'approved', 'rejected')),
    is_hidden           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at        TIMESTAMPTZ,
    original_at         TIMESTAMPTZ,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID REFERENCES users(id),
    rejection_reason    TEXT,
    hidden_at           TIMESTAMPTZ,
    hidden_by           UUID REFERENCES users(id),
    hidden_reason       TEXT,
    is_imported         BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT product_reviews_content_check CHECK (
        (NOT is_imported AND status IN ('draft', 'rejected')) OR
        (rating IS NOT NULL AND NULLIF(btrim(review_text), '') IS NOT NULL)
    ),
    CONSTRAINT product_reviews_external_status_check CHECK (NOT is_imported OR status <> 'draft'),
    CONSTRAINT product_reviews_source_check CHECK (
        (NOT is_imported AND author_id IS NOT NULL AND order_id IS NOT NULL AND external_source IS NULL AND external_review_id IS NULL AND external_author_id IS NULL) OR
        (is_imported AND author_id IS NULL AND order_id IS NULL AND NULLIF(btrim(external_source), '') IS NOT NULL AND NULLIF(btrim(external_review_id), '') IS NOT NULL)
    )
);

CREATE TABLE product_review_summaries (
    product_id          UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    summary             TEXT NOT NULL CHECK (btrim(summary) <> ''),
    source_review_count INT NOT NULL CHECK (source_review_count >= 0),
    model_id            TEXT NOT NULL,
    prompt_version      TEXT NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Articles
-- -----------------------------------------------------------------------------

CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL CHECK (btrim(title) <> ''),
    content_html    TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT NOT NULL DEFAULT '',
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_published    BOOLEAN NOT NULL DEFAULT false,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    location_id     INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    CONSTRAINT articles_published_at_check CHECK (NOT is_published OR published_at IS NOT NULL)
);

CREATE TABLE article_tags (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag        TEXT NOT NULL CHECK (btrim(tag) <> ''),
    PRIMARY KEY (article_id, tag)
);

-- -----------------------------------------------------------------------------
-- Feed Videos
-- -----------------------------------------------------------------------------

CREATE TABLE feed_videos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
    location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    hotelier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    demo_id     VARCHAR(32) UNIQUE,
    title       TEXT NOT NULL,
    subtitle    TEXT NOT NULL DEFAULT '',
    author      TEXT NOT NULL DEFAULT '',
    sort_order  INT NOT NULL DEFAULT 100,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feed_videos_source_check CHECK (
        (listing_id IS NOT NULL) OR 
        (listing_id IS NULL AND location_id IS NOT NULL) OR 
        (listing_id IS NULL AND location_id IS NULL)
    )
);

-- -----------------------------------------------------------------------------
-- Secondary & Partial Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX article_tags_tag_idx ON article_tags (lower(tag));
CREATE INDEX articles_location_id_idx ON articles (location_id);
CREATE INDEX articles_public_order_idx ON articles (published_at DESC, id DESC) WHERE is_published;

CREATE INDEX booking_units_unit_idx ON booking_units (unit_id, booking_id);
CREATE INDEX bookings_listing_dates_idx ON bookings (listing_id, check_in_date, check_out_date);
CREATE INDEX bookings_status_idx ON bookings (status);
CREATE INDEX bookings_user_idx ON bookings (user_id, created_at DESC);

CREATE INDEX exchange_rates_lookup_idx ON exchange_rates (quote_currency, effective_from DESC);

CREATE INDEX feed_videos_listing_id_idx ON feed_videos (listing_id);
CREATE INDEX feed_videos_listing_order_idx ON feed_videos (listing_id, sort_order ASC, created_at DESC);
CREATE INDEX feed_videos_location_id_idx ON feed_videos (location_id);
CREATE INDEX feed_videos_order_idx ON feed_videos (is_active, sort_order, created_at, id);

CREATE INDEX hotelier_listings_listing_idx ON hotelier_listings (listing_id, hotelier_id);
CREATE UNIQUE INDEX hotelier_messages_external_unique ON hotelier_messages (source, external_message_id) WHERE (external_message_id IS NOT NULL);
CREATE INDEX hotelier_messages_owner_listing_created_idx ON hotelier_messages (hotelier_id, listing_id, created_at DESC, id DESC);

CREATE INDEX idx_counterparties_location_name ON counterparties (location_id, name);
CREATE INDEX idx_listing_feature_tag_assignments_tag_id ON listing_feature_tag_assignments (tag_id, listing_id);

CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_fulfilled_at ON orders (fulfilled_at) WHERE (fulfilled_at IS NOT NULL);
CREATE INDEX idx_orders_moderated_by ON orders (moderated_by) WHERE (moderated_by IS NOT NULL);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE UNIQUE INDEX orders_one_pending_cart_per_user_idx ON orders (user_id) WHERE (status = 'pending');
CREATE INDEX orders_pending_created_at_idx ON orders (created_at, id) WHERE (status = 'pending');

CREATE INDEX idx_products_attributes ON products USING gin (attributes);
CREATE INDEX idx_products_catalog ON products (location_id, is_active, created_at DESC);
CREATE INDEX idx_products_type ON products (product_type);

CREATE INDEX idx_users_email ON users (email);

CREATE UNIQUE INDEX listing_reviews_booking_unique ON listing_reviews (booking_id) WHERE (booking_id IS NOT NULL);
CREATE UNIQUE INDEX listing_reviews_external_unique ON listing_reviews (external_source, external_review_id) WHERE is_imported;
CREATE INDEX listing_reviews_public_idx ON listing_reviews (listing_id, created_at DESC, id DESC) WHERE (status = 'approved' AND NOT is_hidden);
CREATE INDEX listing_reviews_reviewer_user_idx ON listing_reviews (reviewer_user_id, created_at DESC, id DESC) WHERE (reviewer_user_id IS NOT NULL);
CREATE INDEX listing_reviews_status_idx ON listing_reviews (status, created_at DESC, id DESC);

CREATE INDEX listing_unit_images_unit_idx ON listing_unit_images (unit_id, sort_order);
CREATE INDEX listing_units_listing_idx ON listing_units (listing_id, type, is_active);
CREATE UNIQUE INDEX listing_units_name_idx ON listing_units (listing_id, parent_unit_id, name) NULLS NOT DISTINCT;

CREATE INDEX listings_average_overall_rating_idx ON listings (average_overall_rating) WHERE (average_overall_rating IS NOT NULL);
CREATE INDEX listings_distance_from_center_km_idx ON listings (distance_from_center_km) WHERE (distance_from_center_km IS NOT NULL);
CREATE UNIQUE INDEX listings_external_identity_unique ON listings (external_source, external_id) WHERE (external_source IS NOT NULL);
CREATE INDEX listings_geo_gist_idx ON listings USING gist (geo) WHERE (geo IS NOT NULL);

CREATE INDEX product_reviews_author_idx ON product_reviews (author_id, created_at DESC, id DESC) WHERE (author_id IS NOT NULL);
CREATE UNIQUE INDEX product_reviews_external_unique ON product_reviews (external_source, external_review_id) WHERE is_imported;
CREATE UNIQUE INDEX product_reviews_order_product_unique ON product_reviews (order_id, product_id) WHERE (order_id IS NOT NULL);
CREATE INDEX product_reviews_public_idx ON product_reviews (product_id, created_at DESC, id DESC) WHERE (status = 'approved' AND NOT is_hidden);
CREATE INDEX product_reviews_public_rating_idx ON product_reviews (product_id, rating DESC, id DESC) WHERE (status = 'approved' AND NOT is_hidden);
CREATE INDEX product_reviews_status_idx ON product_reviews (status, created_at DESC, id DESC);

-- -----------------------------------------------------------------------------
-- Seed Initial Reference Data
-- -----------------------------------------------------------------------------

INSERT INTO currencies (code, name) VALUES
    ('RUB', 'Russian ruble'),
    ('USD', 'US dollar'),
    ('EUR', 'Euro')
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (name, code, name_ru) VALUES
    ('Russia', 'RU', 'Россия')
ON CONFLICT (code) DO NOTHING;

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
