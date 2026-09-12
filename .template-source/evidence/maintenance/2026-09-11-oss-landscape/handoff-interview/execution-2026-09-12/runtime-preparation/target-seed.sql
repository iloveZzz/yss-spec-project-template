CREATE TABLE pilot_preview_rows(id bigint PRIMARY KEY, label varchar(64), start_date timestamp NOT NULL, end_date timestamp);
INSERT INTO pilot_preview_rows VALUES (1,'current-example','2026-01-01',NULL),(2,'historical-example','2025-01-01','2025-12-31');
CREATE TABLE pilot_preview_empty(LIKE pilot_preview_rows INCLUDING ALL);
