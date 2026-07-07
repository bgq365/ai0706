create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  warehouse_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  code text primary key,
  name text not null
);

create table if not exists user_role_bindings (
  user_id uuid not null references users(id) on delete cascade,
  role_code text not null references roles(code) on delete cascade,
  primary key (user_id, role_code)
);

create table if not exists waybill_snapshots (
  waybill_no text primary key,
  customer_name text not null,
  receiver_name text not null,
  receiver_phone text not null,
  amount numeric(12, 2) not null,
  status text not null,
  warehouse_id text not null,
  synced_at timestamptz not null,
  source_request_id text
);

create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  endpoint text not null,
  method text not null,
  request_summary text not null,
  status_code integer not null,
  success boolean not null,
  duration_ms integer not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists exception_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  waybill_no text not null references waybill_snapshots(waybill_no),
  title text not null,
  category text not null,
  subtype text not null,
  status text not null,
  amount numeric(12, 2) not null,
  warehouse_id text not null,
  reporter_id uuid references users(id),
  summary text not null,
  data_source text not null,
  snapshot_synced_at timestamptz not null,
  current_approver_level integer,
  retry_count integer not null default 0,
  reporter_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  execution_status text not null default 'not_started',
  closed_at timestamptz,
  assigned_approver_id uuid references users(id),
  assigned_approver_name text,
  due_at timestamptz,
  timeout_escalation_count integer not null default 0
);

create table if not exists approval_records (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references exception_tickets(id) on delete cascade,
  level integer not null,
  action text not null,
  actor_id uuid references users(id),
  actor_name text not null,
  comment text not null,
  created_at timestamptz not null default now(),
  request_token text
);

create table if not exists compensation_records (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references exception_tickets(id) on delete cascade,
  approval_record_id uuid not null references approval_records(id) on delete cascade,
  amount numeric(12, 2) not null,
  direction text not null,
  status text not null,
  finance_reference text,
  created_at timestamptz not null default now()
);

create table if not exists inventory_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references exception_tickets(id) on delete cascade,
  approval_record_id uuid not null references approval_records(id) on delete cascade,
  event_type text not null,
  sku_code text,
  delta_qty integer,
  warehouse_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists scan_records (
  id uuid primary key default gen_random_uuid(),
  waybill_no text not null references waybill_snapshots(waybill_no),
  sku_code text not null,
  operator_name text not null,
  warehouse_id text not null,
  result text not null,
  abnormal_reason text,
  hold_status text not null,
  ticket_id uuid references exception_tickets(id),
  rule_id text,
  scanned_at timestamptz not null default now()
);

create table if not exists qc_rules (
  id uuid primary key default gen_random_uuid(),
  subtype text not null,
  severity text not null,
  trigger_condition jsonb not null,
  auto_create_ticket boolean not null default true,
  auto_approval_level integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_exception_tickets_status_created_at
  on exception_tickets(status, created_at desc);

create index if not exists idx_sync_logs_request_id
  on sync_logs(request_id);

create index if not exists idx_scan_records_waybill_scanned_at
  on scan_records(waybill_no, scanned_at desc);
