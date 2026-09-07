-- Prevent Stripe webhook retries from duplicating conversion analytics.

alter table public.analytics_events
  add column if not exists source_event_id text;

create unique index if not exists analytics_events_source_event_id_key
  on public.analytics_events(source_event_id)
  where source_event_id is not null;
