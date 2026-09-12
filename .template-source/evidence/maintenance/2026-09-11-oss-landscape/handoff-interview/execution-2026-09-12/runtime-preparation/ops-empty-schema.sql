create table ops_task_override (
  task_id varchar(128) primary key, is_enabled boolean not null, version bigint not null,
  updated_by varchar(128) not null, updated_at timestamp with time zone not null
);
create table ops_task_execution (
  id varchar(36) primary key, task_id varchar(128) not null, scheduler_execution_id varchar(128),
  status varchar(32) not null, attempt integer not null, node_id varchar(128), error_message varchar(2000),
  started_at timestamp with time zone not null, finished_at timestamp with time zone
);
create index idx_ops_task_exec_task_time on ops_task_execution(task_id, started_at);
create unique index uk_ops_task_exec_scheduler on ops_task_execution(scheduler_execution_id, attempt);
create table ops_operation (
  id varchar(36) primary key, parent_operation_id varchar(36), idempotency_key varchar(128) not null,
  operation_type varchar(64) not null, reason varchar(500) not null, operator_name varchar(128) not null,
  status varchar(32) not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null
);
create unique index uk_ops_operation_idempotency on ops_operation(idempotency_key);
create index idx_ops_operation_created on ops_operation(created_at);
create table ops_operation_target (
  id varchar(36) primary key, operation_id varchar(36) not null,
  target_id varchar(128) not null, status varchar(32) not null, result_summary varchar(2000),
  started_at timestamp with time zone, finished_at timestamp with time zone
);
create index idx_ops_target_operation on ops_operation_target(operation_id);
create table ops_alert (
  id varchar(36) primary key, resource_id varchar(256) not null, alert_type varchar(64) not null,
  active_key char(64),
  severity varchar(32) not null, status varchar(32) not null, message varchar(2000) not null,
  opened_at timestamp with time zone not null, acknowledged_by varchar(128),
  acknowledged_at timestamp with time zone, resolved_at timestamp with time zone,
  updated_at timestamp with time zone not null
);
create index idx_ops_alert_current on ops_alert(status, opened_at);
create index idx_ops_alert_resource on ops_alert(resource_id, alert_type, status);
create unique index uk_ops_alert_active on ops_alert(active_key);
create table ops_storage_snapshot (
  id varchar(36) primary key, target_id varchar(128) not null, target_type varchar(32) not null,
  provider varchar(32), status varchar(32) not null, total_bytes bigint, used_bytes bigint,
  file_count bigint, captured_at timestamp with time zone not null
);
create index idx_ops_storage_target_time on ops_storage_snapshot(target_id, captured_at);
create table ops_storage_snapshot_item (
  id varchar(36) primary key, snapshot_id varchar(36) not null,
  parent_path varchar(1000), item_path varchar(1000) not null, depth integer not null,
  size_bytes bigint, file_count bigint
);
create index idx_ops_storage_item_snapshot on ops_storage_snapshot_item(snapshot_id, depth);
