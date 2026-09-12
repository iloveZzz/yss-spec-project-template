CREATE TABLE "scheduled_tasks" (

  "task_name" character varying(255) NOT NULL,
  "task_instance" character varying(255) NOT NULL,
  "execution_time" timestamp(6) without time zone NOT NULL,
  "picked" boolean NOT NULL,
  "picked_by" character varying(255),
  "last_success" timestamp(6) without time zone,
  "last_failure" timestamp(6) without time zone,
  "consecutive_failures" numeric(11,0),
  "last_heartbeat" timestamp(6) without time zone,
  "version" numeric(20,0) NOT NULL,
  "task_data" character varying(3000),
  CONSTRAINT "pk_scheduled_tasks" PRIMARY KEY (TASK_NAME, TASK_INSTANCE)
);
