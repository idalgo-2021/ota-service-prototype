-- Destructive rollback of the consolidated baseline. Application data is deleted.
DROP TABLE IF EXISTS
    public.article_tags,
    public.articles,
    public.booking_units,
    public.bookings,
    public.counterparties,
    public.countries,
    public.currencies,
    public.exchange_rates,
    public.feed_videos,
    public.hotelier_listings,
    public.hotelier_messages,
    public.listing_disappointment_analyses,
    public.listing_feature_tag_assignments,
    public.listing_feature_tags,
    public.listing_images,
    public.listing_review_summaries,
    public.listing_reviews,
    public.listing_types,
    public.listing_unit_images,
    public.listing_units,
    public.listings,
    public.locations,
    public.order_items,
    public.orders,
    public.product_review_summaries,
    public.product_reviews,
    public.products,
    public.user_profiles,
    public.users
CASCADE;

DROP FUNCTION IF EXISTS public.validate_listing_unit_parent() CASCADE;
