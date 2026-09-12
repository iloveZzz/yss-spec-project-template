CREATE TABLE IF NOT EXISTS t_data_push_task (
    task_id NUMERIC(20, 0) NOT NULL,
    task_code VARCHAR(128) NOT NULL,
    task_name VARCHAR(256) NOT NULL,
    description VARCHAR(1024),
    current_version_no INTEGER NOT NULL,
    config_status VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL,
    deleted BOOLEAN NOT NULL,
    running_execution_id VARCHAR(64),
    maintainer_id VARCHAR(128),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (task_id)
);
