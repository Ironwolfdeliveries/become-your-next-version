-- Guided Kai is the launch default. These fields support a future, explicitly enabled LIVE mode.
alter table public.kai_usage_events
  add column if not exists mode text not null default 'guided' check (mode in ('guided', 'live')),
  add column if not exists input_tokens integer not null default 0 check (input_tokens >= 0),
  add column if not exists output_tokens integer not null default 0 check (output_tokens >= 0),
  add column if not exists estimated_cost_micro_usd bigint not null default 0 check (estimated_cost_micro_usd >= 0);

create index if not exists kai_live_usage_budget_idx on public.kai_usage_events(mode, created_at desc);

comment on table public.kai_usage_events is 'Usage ledger for optional future LIVE Kai. Guided Kai does not create model usage events.';
