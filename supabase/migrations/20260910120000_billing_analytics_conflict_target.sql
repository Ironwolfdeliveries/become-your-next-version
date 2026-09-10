-- PostgREST ON CONFLICT(source_event_id) cannot infer the former partial index.
-- A regular unique index still permits multiple NULLs for non-Stripe analytics.
create unique index analytics_events_source_event_id_unique
  on public.analytics_events(source_event_id);
drop index public.analytics_events_source_event_id_key;
