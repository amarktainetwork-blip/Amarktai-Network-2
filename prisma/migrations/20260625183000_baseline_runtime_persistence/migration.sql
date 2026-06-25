-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'app',
    "short_description" TEXT NOT NULL,
    "long_description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'coming_soon',
    "access_type" TEXT NOT NULL DEFAULT 'public',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "primary_url" TEXT NOT NULL DEFAULT '',
    "hosted_here" BOOLEAN NOT NULL DEFAULT false,
    "hosting_scope" TEXT NOT NULL DEFAULT 'external_domain',
    "subdomain" TEXT NOT NULL DEFAULT '',
    "custom_domain" TEXT NOT NULL DEFAULT '',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "public_visibility" BOOLEAN NOT NULL DEFAULT true,
    "monitoring_enabled" BOOLEAN NOT NULL DEFAULT false,
    "integration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "app_type" TEXT NOT NULL DEFAULT 'app',
    "ready_to_deploy" BOOLEAN NOT NULL DEFAULT false,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "connected_to_brain" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_status" TEXT NOT NULL DEFAULT 'unconfigured',
    "onboarding_completed_at" TIMESTAMP(3),
    "app_secret" TEXT NOT NULL DEFAULT '',
    "custom_instructions" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 99,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_integrations" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "integration_token" TEXT NOT NULL,
    "heartbeat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "metrics_enabled" BOOLEAN NOT NULL DEFAULT true,
    "events_enabled" BOOLEAN NOT NULL DEFAULT true,
    "vps_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_heartbeat_at" TIMESTAMP(3),
    "health_status" TEXT NOT NULL DEFAULT 'unknown',
    "uptime" DOUBLE PRECISION,
    "version" TEXT NOT NULL DEFAULT '',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_metric_definitions" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "metric_key" TEXT NOT NULL,
    "metric_label" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL DEFAULT 'number',
    "default_chart_type" TEXT NOT NULL DEFAULT 'line',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "app_metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_metric_points" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "metric_key" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_label" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_metric_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_events" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vps_resource_snapshots" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "cpu_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ram_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ram_used_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ram_total_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disk_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disk_used_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disk_total_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_in_kbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_out_kbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vps_resource_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widget_configs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "widget_key" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "settings_json" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "dashboard_widget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_or_project" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "interest" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" SERIAL NOT NULL,
    "provider_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_key" TEXT NOT NULL DEFAULT '',
    "masked_preview" TEXT NOT NULL DEFAULT '',
    "base_url" TEXT NOT NULL DEFAULT '',
    "default_model" TEXT NOT NULL DEFAULT '',
    "fallback_model" TEXT NOT NULL DEFAULT '',
    "health_status" TEXT NOT NULL DEFAULT 'unconfigured',
    "health_message" TEXT NOT NULL DEFAULT '',
    "last_checked_at" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 99,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_events" (
    "id" SERIAL NOT NULL,
    "trace_id" TEXT NOT NULL,
    "product_id" INTEGER,
    "app_slug" TEXT NOT NULL DEFAULT '',
    "task_type" TEXT NOT NULL DEFAULT '',
    "execution_mode" TEXT NOT NULL DEFAULT 'direct',
    "classification_json" TEXT NOT NULL DEFAULT '{}',
    "routed_provider" TEXT,
    "routed_model" TEXT,
    "validation_used" BOOLEAN NOT NULL DEFAULT false,
    "consensus_used" BOOLEAN NOT NULL DEFAULT false,
    "confidence_score" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "warnings_json" TEXT NOT NULL DEFAULT '[]',
    "latency_ms" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_entries" (
    "id" SERIAL NOT NULL,
    "app_slug" TEXT NOT NULL,
    "memory_type" TEXT NOT NULL DEFAULT 'event',
    "key" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_budgets" (
    "id" SERIAL NOT NULL,
    "provider_key" TEXT NOT NULL,
    "monthly_budget_usd" DOUBLE PRECISION,
    "current_spend_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warning_threshold_pct" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "critical_threshold_pct" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "notes" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playground_projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT NOT NULL DEFAULT '',
    "prompt_history_json" TEXT NOT NULL DEFAULT '[]',
    "files_json" TEXT NOT NULL DEFAULT '[]',
    "agent_configs_json" TEXT NOT NULL DEFAULT '[]',
    "workflows_json" TEXT NOT NULL DEFAULT '[]',
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "github_repo" TEXT,
    "github_branch" TEXT,
    "last_pushed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playground_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_configs" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "access_token" TEXT NOT NULL DEFAULT '',
    "default_owner" TEXT NOT NULL DEFAULT '',
    "last_validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_push_logs" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commit_sha" TEXT,
    "commit_message" TEXT NOT NULL,
    "files_changed" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "pushed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_push_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_workspaces" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'github',
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "remote_url" TEXT NOT NULL,
    "local_path" TEXT NOT NULL,
    "current_commit" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_tasks" (
    "id" TEXT NOT NULL,
    "repo_workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "user_request" TEXT NOT NULL DEFAULT '',
    "agent_mode" TEXT NOT NULL,
    "selected_model" TEXT NOT NULL DEFAULT '',
    "selected_model_tier" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "plan_json" TEXT NOT NULL DEFAULT '{}',
    "changed_files_json" TEXT NOT NULL DEFAULT '[]',
    "test_status" TEXT NOT NULL DEFAULT '',
    "build_status" TEXT NOT NULL DEFAULT '',
    "artifact_ids_json" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_patches" (
    "id" TEXT NOT NULL,
    "repo_workspace_id" TEXT NOT NULL,
    "repo_task_id" TEXT,
    "title" TEXT NOT NULL,
    "diff_text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "branch_name" TEXT NOT NULL DEFAULT '',
    "commit_sha" TEXT,
    "pr_url" TEXT,
    "artifact_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_patches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_generation_jobs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "duration" INTEGER,
    "aspect_ratio" TEXT,
    "app_slug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider_job_id" TEXT,
    "result_url" TEXT,
    "result_meta" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_registry_entries" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "family" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'text',
    "primary_role" TEXT NOT NULL DEFAULT 'chat',
    "cost_tier" TEXT NOT NULL DEFAULT 'low',
    "latency_tier" TEXT NOT NULL DEFAULT 'medium',
    "context_window" INTEGER NOT NULL DEFAULT 4096,
    "supports_text" BOOLEAN NOT NULL DEFAULT false,
    "supports_reasoning" BOOLEAN NOT NULL DEFAULT false,
    "supports_code" BOOLEAN NOT NULL DEFAULT false,
    "supports_chat" BOOLEAN NOT NULL DEFAULT false,
    "supports_image_generation" BOOLEAN NOT NULL DEFAULT false,
    "supports_image_editing" BOOLEAN NOT NULL DEFAULT false,
    "supports_video_planning" BOOLEAN NOT NULL DEFAULT false,
    "supports_video_generation" BOOLEAN NOT NULL DEFAULT false,
    "supports_stt" BOOLEAN NOT NULL DEFAULT false,
    "supports_tts" BOOLEAN NOT NULL DEFAULT false,
    "supports_realtime_voice" BOOLEAN NOT NULL DEFAULT false,
    "supports_embeddings" BOOLEAN NOT NULL DEFAULT false,
    "supports_reranking" BOOLEAN NOT NULL DEFAULT false,
    "supports_research" BOOLEAN NOT NULL DEFAULT false,
    "supports_multimodal" BOOLEAN NOT NULL DEFAULT false,
    "supports_tool_use" BOOLEAN NOT NULL DEFAULT false,
    "supports_structured_output" BOOLEAN NOT NULL DEFAULT false,
    "estimated_unit_cost" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "safety_tags" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_registry_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_profiles" (
    "id" SERIAL NOT NULL,
    "app_slug" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "app_type" TEXT NOT NULL DEFAULT 'general',
    "domain" TEXT NOT NULL DEFAULT 'general',
    "default_routing_mode" TEXT NOT NULL DEFAULT 'direct',
    "allowed_providers" TEXT NOT NULL DEFAULT '[]',
    "allowed_models" TEXT NOT NULL DEFAULT '[]',
    "preferred_models" TEXT NOT NULL DEFAULT '[]',
    "fallback_chain" TEXT NOT NULL DEFAULT '[]',
    "cost_mode" TEXT NOT NULL DEFAULT 'balanced',
    "max_cost_per_request" DOUBLE PRECISION,
    "monthly_budget_cap" DOUBLE PRECISION,
    "safe_mode" BOOLEAN NOT NULL DEFAULT true,
    "adult_mode" BOOLEAN NOT NULL DEFAULT false,
    "suggestive_mode" BOOLEAN NOT NULL DEFAULT false,
    "enabled_capabilities" TEXT NOT NULL DEFAULT '[]',
    "enabled_agents" TEXT NOT NULL DEFAULT '[]',
    "routing_strategy" TEXT NOT NULL DEFAULT 'balanced',
    "allow_benchmark" BOOLEAN NOT NULL DEFAULT false,
    "base_personality" TEXT NOT NULL DEFAULT '',
    "emotion_context_window" INTEGER NOT NULL DEFAULT 0,
    "escalation_rules" TEXT NOT NULL DEFAULT '[]',
    "validator_rules" TEXT NOT NULL DEFAULT '[]',
    "agent_permissions" TEXT NOT NULL DEFAULT '[]',
    "multimodal_permissions" TEXT NOT NULL DEFAULT '[]',
    "memory_namespace" TEXT NOT NULL DEFAULT '',
    "retrieval_namespace" TEXT NOT NULL DEFAULT '',
    "budget_sensitivity" TEXT NOT NULL DEFAULT 'medium',
    "latency_sensitivity" TEXT NOT NULL DEFAULT 'medium',
    "logging_privacy_rules" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_ai_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_tune_jobs" (
    "id" SERIAL NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "base_model" TEXT NOT NULL,
    "training_file" TEXT NOT NULL,
    "hyperparameters" TEXT NOT NULL DEFAULT '{}',
    "app_slug" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "trained_tokens" INTEGER,
    "result_model" TEXT,
    "error" TEXT,

    CONSTRAINT "fine_tune_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_jobs" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "config" TEXT NOT NULL DEFAULT '{}',
    "progress" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_job_items" (
    "id" SERIAL NOT NULL,
    "batch_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_index" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "output" TEXT,
    "error" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "latency_ms" INTEGER,
    "tokens" INTEGER,

    CONSTRAINT "batch_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "steps" TEXT NOT NULL DEFAULT '{}',
    "entry_step_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "input" TEXT NOT NULL DEFAULT '{}',
    "output" TEXT,
    "stepResults" TEXT NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_latency" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "system_prompt" TEXT,
    "variables" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_version" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_template_versions" (
    "id" SERIAL NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "system_prompt" TEXT,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_ab_tests" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant_a" INTEGER NOT NULL,
    "variant_b" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "results" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "prompt_ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_strategy_records" (
    "id" SERIAL NOT NULL,
    "app_slug" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "app_type" TEXT NOT NULL DEFAULT 'general',
    "goals" TEXT NOT NULL DEFAULT '[]',
    "kpis" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "strategy_state" TEXT NOT NULL DEFAULT 'not_configured',
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_strategy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_registrations" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_delivery_log" (
    "id" SERIAL NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "status_code" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_agents" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "app_url" TEXT NOT NULL DEFAULT '',
    "app_type" TEXT NOT NULL DEFAULT 'general',
    "purpose" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "response_length" TEXT NOT NULL DEFAULT 'balanced',
    "creativity" TEXT NOT NULL DEFAULT 'balanced',
    "must_show_source_for_quotes" BOOLEAN NOT NULL DEFAULT false,
    "must_use_trusted_sources" BOOLEAN NOT NULL DEFAULT false,
    "can_answer_without_source" TEXT NOT NULL DEFAULT 'sometimes',
    "separate_quote_from_explanation" BOOLEAN NOT NULL DEFAULT false,
    "adult_mode" BOOLEAN NOT NULL DEFAULT false,
    "sensitive_topic_mode" TEXT NOT NULL DEFAULT 'standard',
    "must_handoff_serious_topics" BOOLEAN NOT NULL DEFAULT false,
    "topics_needing_care" TEXT NOT NULL DEFAULT '[]',
    "human_expert_available" BOOLEAN NOT NULL DEFAULT false,
    "handoff_triggers" TEXT NOT NULL DEFAULT '[]',
    "human_contact_method" TEXT NOT NULL DEFAULT '',
    "knowledge_categories" TEXT NOT NULL DEFAULT '[]',
    "knowledge_notes" TEXT NOT NULL DEFAULT '',
    "must_always_do" TEXT NOT NULL DEFAULT '[]',
    "must_never_do" TEXT NOT NULL DEFAULT '[]',
    "admin_notes" TEXT NOT NULL DEFAULT '',
    "structured_rules" TEXT NOT NULL DEFAULT '[]',
    "budget_mode" TEXT NOT NULL DEFAULT 'balanced',
    "allow_premium_only_when_needed" BOOLEAN NOT NULL DEFAULT true,
    "learning_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_improvement_enabled" BOOLEAN NOT NULL DEFAULT false,
    "admin_review_required" BOOLEAN NOT NULL DEFAULT true,
    "last_learning_cycle_at" TIMESTAMP(3),
    "specialty_profile" TEXT NOT NULL DEFAULT '{}',
    "weak_areas" TEXT NOT NULL DEFAULT '[]',
    "religious_mode" TEXT NOT NULL DEFAULT 'none',
    "religious_branch" TEXT NOT NULL DEFAULT '',
    "approved_source_packs" TEXT NOT NULL DEFAULT '[]',
    "doctrine_aware_routing" BOOLEAN NOT NULL DEFAULT false,
    "crawl_status" TEXT NOT NULL DEFAULT 'none',
    "last_crawl_at" TIMESTAMP(3),
    "crawl_summary" TEXT NOT NULL DEFAULT '',
    "detected_niche" TEXT NOT NULL DEFAULT '',
    "detected_capabilities" TEXT NOT NULL DEFAULT '[]',
    "allowed_capabilities" TEXT NOT NULL DEFAULT '["chat","reasoning","code"]',
    "preferred_providers" TEXT NOT NULL DEFAULT '[]',
    "preferred_models" TEXT NOT NULL DEFAULT '[]',
    "fallback_chain" TEXT NOT NULL DEFAULT '[]',
    "voice_style" TEXT NOT NULL DEFAULT 'neutral',
    "voice_tone" TEXT NOT NULL DEFAULT 'professional',
    "voice_personality" TEXT NOT NULL DEFAULT 'helpful',
    "voice_speed" TEXT NOT NULL DEFAULT 'normal',
    "voice_gender" TEXT NOT NULL DEFAULT 'neutral',
    "voice_accent" TEXT NOT NULL DEFAULT '',
    "memory_namespace" TEXT NOT NULL DEFAULT '',
    "retrieval_namespace" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" SERIAL NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "app_slug" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_agent_learning_logs" (
    "id" SERIAL NOT NULL,
    "agent_id" TEXT NOT NULL,
    "cycle_date" TIMESTAMP(3) NOT NULL,
    "cycle_type" TEXT NOT NULL DEFAULT 'daily',
    "summary" TEXT NOT NULL DEFAULT '',
    "improvements" TEXT NOT NULL DEFAULT '[]',
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_agent_learning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL DEFAULT '',
    "api_url" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sub_type" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "trace_id" TEXT NOT NULL DEFAULT '',
    "storage_driver" TEXT NOT NULL DEFAULT 'local',
    "storage_path" TEXT NOT NULL DEFAULT '',
    "storage_url" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT NOT NULL DEFAULT '',
    "file_size_bytes" INTEGER NOT NULL DEFAULT 0,
    "previewable" BOOLEAN NOT NULL DEFAULT true,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error_message" TEXT NOT NULL DEFAULT '',
    "cost_usd_cents" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_budget_configs" (
    "id" SERIAL NOT NULL,
    "app_slug" TEXT NOT NULL,
    "monthly_budget_cents" INTEGER NOT NULL DEFAULT 0,
    "daily_budget_cents" INTEGER NOT NULL DEFAULT 0,
    "requests_per_minute" INTEGER NOT NULL DEFAULT 100,
    "requests_per_day" INTEGER NOT NULL DEFAULT 10000,
    "capability_quotas" TEXT NOT NULL DEFAULT '{}',
    "premium_toggles" TEXT NOT NULL DEFAULT '{}',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pause_reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_budget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_meters" (
    "id" SERIAL NOT NULL,
    "app_slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "capability" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd_cents" INTEGER NOT NULL DEFAULT 0,
    "artifact_count" INTEGER NOT NULL DEFAULT 0,
    "latency_ms_sum" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_agent_logs" (
    "id" SERIAL NOT NULL,
    "manager_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_configs" (
    "id" SERIAL NOT NULL,
    "model_policy" TEXT NOT NULL DEFAULT 'best',
    "fixed_model" TEXT,
    "enabled_features" TEXT NOT NULL DEFAULT '[]',
    "workspace_sessions" TEXT NOT NULL DEFAULT '[]',
    "file_contexts" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_sessions" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "model_policy" TEXT NOT NULL DEFAULT 'best',
    "resolved_model" TEXT NOT NULL DEFAULT '',
    "task_type" TEXT NOT NULL DEFAULT 'chat',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT,
    "file_contexts" TEXT NOT NULL DEFAULT '[]',
    "success" BOOLEAN NOT NULL DEFAULT false,
    "latency_ms" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiva_conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aiva_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiva_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "capability" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "output_type" TEXT NOT NULL DEFAULT 'text',
    "artifact_id" TEXT,
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "warning" TEXT,
    "error_message" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aiva_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiva_memories" (
    "id" TEXT NOT NULL,
    "memory_type" TEXT NOT NULL DEFAULT 'preference',
    "key" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aiva_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_intelligence_profiles" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "website_url" TEXT NOT NULL DEFAULT '',
    "business_type" TEXT NOT NULL DEFAULT '',
    "brand_summary" TEXT NOT NULL DEFAULT '',
    "brand_tone" TEXT NOT NULL DEFAULT '',
    "target_users" TEXT NOT NULL DEFAULT '[]',
    "products_services" TEXT NOT NULL DEFAULT '[]',
    "support_knowledge" TEXT NOT NULL DEFAULT '',
    "content_topics" TEXT NOT NULL DEFAULT '[]',
    "risks" TEXT NOT NULL DEFAULT '[]',
    "recommended_capabilities" TEXT NOT NULL DEFAULT '[]',
    "recommended_model_package" TEXT NOT NULL DEFAULT '{}',
    "crawl_summary" TEXT NOT NULL DEFAULT '',
    "crawl_artifact_id" TEXT,
    "last_crawled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_intelligence_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiva_avatar_configs" (
    "id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "artifact_id" TEXT,
    "image_url" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aiva_avatar_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healing_records" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affected_resource" TEXT NOT NULL,
    "action_taken" TEXT,
    "action_detail" TEXT,
    "auto_healed" BOOLEAN NOT NULL DEFAULT false,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_generation_jobs" (
    "id" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "moods" TEXT NOT NULL DEFAULT '[]',
    "vocal_style" TEXT NOT NULL DEFAULT '',
    "bpm" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "duration_seconds" INTEGER NOT NULL DEFAULT 180,
    "instrumental" BOOLEAN NOT NULL DEFAULT false,
    "cover_art_choice" TEXT NOT NULL DEFAULT 'auto',
    "existing_lyrics" TEXT NOT NULL DEFAULT '',
    "production_notes" TEXT NOT NULL DEFAULT '',
    "artifact_id" TEXT,
    "result_json" TEXT,
    "error_message" TEXT,
    "provider" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_registry" (
    "id" TEXT NOT NULL,
    "capability_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'text',
    "required_flags" TEXT NOT NULL DEFAULT '[]',
    "allowed_providers" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "proof_status" TEXT NOT NULL DEFAULT 'SPECULATIVE',
    "source_file" TEXT NOT NULL DEFAULT '',
    "proof_file" TEXT NOT NULL DEFAULT '',
    "known_issues" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_capability_map" (
    "id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "capability_key" TEXT NOT NULL,
    "models" TEXT NOT NULL DEFAULT '[]',
    "endpoints" TEXT NOT NULL DEFAULT '[]',
    "proven" BOOLEAN NOT NULL DEFAULT false,
    "proof_type" TEXT NOT NULL DEFAULT 'inferred',
    "proof_source" TEXT NOT NULL DEFAULT '',
    "last_verified" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_capability_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_discovery_cache" (
    "id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "cost_tier" TEXT NOT NULL DEFAULT 'medium',
    "latency_tier" TEXT NOT NULL DEFAULT 'medium',
    "context_window" INTEGER NOT NULL DEFAULT 4096,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_discovery_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_profiles" (
    "id" TEXT NOT NULL,
    "profile_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "cost_tier" TEXT NOT NULL DEFAULT 'medium',
    "quality_preference" TEXT NOT NULL DEFAULT 'medium',
    "latency_preference" TEXT NOT NULL DEFAULT 'medium',
    "max_cost_per_request" INTEGER NOT NULL DEFAULT 0,
    "max_fallback_depth" INTEGER NOT NULL DEFAULT 3,
    "allow_premium" BOOLEAN NOT NULL DEFAULT false,
    "allow_streaming" BOOLEAN NOT NULL DEFAULT true,
    "allow_long_running_jobs" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_library" (
    "id" TEXT NOT NULL,
    "avatar_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'realistic',
    "provider" TEXT NOT NULL DEFAULT 'genx',
    "thumbnail_url" TEXT NOT NULL DEFAULT '',
    "voice_id" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_library" (
    "id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'genx',
    "model" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT 'neutral',
    "accent" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "style" TEXT NOT NULL DEFAULT 'neutral',
    "preview_url" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL DEFAULT '',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "content_types" TEXT NOT NULL DEFAULT '[]',
    "budget_tier" TEXT NOT NULL DEFAULT 'balanced',
    "quality_tier" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approval_mode" TEXT NOT NULL DEFAULT 'auto',
    "duration_days" INTEGER NOT NULL DEFAULT 7,
    "website_url" TEXT NOT NULL DEFAULT '',
    "workflow_id" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_items" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "script" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "prompt_summary" TEXT NOT NULL DEFAULT '',
    "scheduled_for" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approval_status" TEXT NOT NULL DEFAULT 'draft',
    "approval_notes" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_assets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT,
    "campaign_item_id" TEXT,
    "asset_type" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "approval_status" TEXT NOT NULL DEFAULT 'draft',
    "approval_notes" TEXT NOT NULL DEFAULT '',
    "runtime_selected_provider" TEXT NOT NULL DEFAULT '',
    "runtime_selected_model" TEXT NOT NULL DEFAULT '',
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "generation_mode" TEXT NOT NULL DEFAULT '',
    "prompt_summary" TEXT NOT NULL DEFAULT '',
    "source_inputs" TEXT NOT NULL DEFAULT '{}',
    "result_url" TEXT,
    "result_file_path" TEXT,
    "thumbnail_url" TEXT,
    "mime_type" TEXT,
    "duration_seconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "cost_credits" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "error" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_versions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "result_url" TEXT,
    "result_file_path" TEXT,
    "thumbnail_url" TEXT,
    "prompt_summary" TEXT NOT NULL DEFAULT '',
    "source_inputs" TEXT NOT NULL DEFAULT '{}',
    "provider" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "cost_credits" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "campaign_id" TEXT,
    "campaign_item_id" TEXT,
    "asset_id" TEXT,
    "agent_id" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'generic_export',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "block_reason" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "error" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_results" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "campaign_id" TEXT,
    "campaign_item_id" TEXT,
    "asset_ids" TEXT NOT NULL DEFAULT '[]',
    "platform" TEXT NOT NULL DEFAULT 'generic_export',
    "status" TEXT NOT NULL DEFAULT 'not_ready',
    "provider" TEXT NOT NULL DEFAULT '',
    "external_post_id" TEXT,
    "external_post_url" TEXT,
    "export_package_id" TEXT,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_analytics" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "campaign_id" TEXT,
    "campaign_item_id" TEXT,
    "asset_id" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'generic',
    "external_post_id" TEXT,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_unit" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_campaign_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL DEFAULT '',
    "app_slug" TEXT NOT NULL,
    "campaign_id" TEXT,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "cron_expression" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "max_runs" INTEGER,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "error" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_campaign_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "app_integrations_product_id_key" ON "app_integrations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_integrations_integration_token_key" ON "app_integrations"("integration_token");

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_provider_key_key" ON "ai_providers"("provider_key");

-- CreateIndex
CREATE INDEX "brain_events_app_slug_idx" ON "brain_events"("app_slug");

-- CreateIndex
CREATE INDEX "brain_events_trace_id_idx" ON "brain_events"("trace_id");

-- CreateIndex
CREATE INDEX "brain_events_timestamp_idx" ON "brain_events"("timestamp");

-- CreateIndex
CREATE INDEX "memory_entries_app_slug_idx" ON "memory_entries"("app_slug");

-- CreateIndex
CREATE INDEX "memory_entries_memory_type_idx" ON "memory_entries"("memory_type");

-- CreateIndex
CREATE UNIQUE INDEX "provider_budgets_provider_key_key" ON "provider_budgets"("provider_key");

-- CreateIndex
CREATE INDEX "playground_projects_status_idx" ON "playground_projects"("status");

-- CreateIndex
CREATE INDEX "playground_projects_type_idx" ON "playground_projects"("type");

-- CreateIndex
CREATE INDEX "github_push_logs_project_id_idx" ON "github_push_logs"("project_id");

-- CreateIndex
CREATE INDEX "github_push_logs_pushed_at_idx" ON "github_push_logs"("pushed_at");

-- CreateIndex
CREATE INDEX "repo_workspaces_status_idx" ON "repo_workspaces"("status");

-- CreateIndex
CREATE INDEX "repo_workspaces_updated_at_idx" ON "repo_workspaces"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "repo_workspaces_owner_repo_branch_key" ON "repo_workspaces"("owner", "repo", "branch");

-- CreateIndex
CREATE INDEX "repo_tasks_repo_workspace_id_idx" ON "repo_tasks"("repo_workspace_id");

-- CreateIndex
CREATE INDEX "repo_tasks_status_idx" ON "repo_tasks"("status");

-- CreateIndex
CREATE INDEX "repo_tasks_created_at_idx" ON "repo_tasks"("created_at");

-- CreateIndex
CREATE INDEX "repo_patches_repo_workspace_id_idx" ON "repo_patches"("repo_workspace_id");

-- CreateIndex
CREATE INDEX "repo_patches_repo_task_id_idx" ON "repo_patches"("repo_task_id");

-- CreateIndex
CREATE INDEX "repo_patches_status_idx" ON "repo_patches"("status");

-- CreateIndex
CREATE INDEX "repo_patches_created_at_idx" ON "repo_patches"("created_at");

-- CreateIndex
CREATE INDEX "video_generation_jobs_status_idx" ON "video_generation_jobs"("status");

-- CreateIndex
CREATE INDEX "video_generation_jobs_app_slug_idx" ON "video_generation_jobs"("app_slug");

-- CreateIndex
CREATE INDEX "video_generation_jobs_created_at_idx" ON "video_generation_jobs"("created_at");

-- CreateIndex
CREATE INDEX "model_registry_entries_provider_idx" ON "model_registry_entries"("provider");

-- CreateIndex
CREATE INDEX "model_registry_entries_category_idx" ON "model_registry_entries"("category");

-- CreateIndex
CREATE INDEX "model_registry_entries_enabled_idx" ON "model_registry_entries"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "model_registry_entries_provider_model_id_key" ON "model_registry_entries"("provider", "model_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_profiles_app_slug_key" ON "app_ai_profiles"("app_slug");

-- CreateIndex
CREATE UNIQUE INDEX "fine_tune_jobs_job_id_key" ON "fine_tune_jobs"("job_id");

-- CreateIndex
CREATE INDEX "fine_tune_jobs_app_slug_idx" ON "fine_tune_jobs"("app_slug");

-- CreateIndex
CREATE INDEX "batch_jobs_app_slug_idx" ON "batch_jobs"("app_slug");

-- CreateIndex
CREATE INDEX "batch_job_items_batch_id_idx" ON "batch_job_items"("batch_id");

-- CreateIndex
CREATE INDEX "workflow_definitions_app_slug_idx" ON "workflow_definitions"("app_slug");

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_id_idx" ON "workflow_runs"("workflow_id");

-- CreateIndex
CREATE INDEX "prompt_templates_app_slug_idx" ON "prompt_templates"("app_slug");

-- CreateIndex
CREATE INDEX "prompt_template_versions_template_id_idx" ON "prompt_template_versions"("template_id");

-- CreateIndex
CREATE INDEX "prompt_ab_tests_template_id_idx" ON "prompt_ab_tests"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_strategy_records_app_slug_key" ON "app_strategy_records"("app_slug");

-- CreateIndex
CREATE INDEX "webhook_registrations_app_slug_idx" ON "webhook_registrations"("app_slug");

-- CreateIndex
CREATE INDEX "webhook_delivery_log_webhook_id_idx" ON "webhook_delivery_log"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_agents_app_slug_key" ON "app_agents"("app_slug");

-- CreateIndex
CREATE INDEX "app_agents_app_type_idx" ON "app_agents"("app_type");

-- CreateIndex
CREATE INDEX "app_agents_active_idx" ON "app_agents"("active");

-- CreateIndex
CREATE INDEX "system_alerts_alert_type_idx" ON "system_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "system_alerts_severity_idx" ON "system_alerts"("severity");

-- CreateIndex
CREATE INDEX "system_alerts_resolved_idx" ON "system_alerts"("resolved");

-- CreateIndex
CREATE INDEX "system_alerts_created_at_idx" ON "system_alerts"("created_at");

-- CreateIndex
CREATE INDEX "app_agent_learning_logs_agent_id_idx" ON "app_agent_learning_logs"("agent_id");

-- CreateIndex
CREATE INDEX "app_agent_learning_logs_cycle_date_idx" ON "app_agent_learning_logs"("cycle_date");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_key_key" ON "integration_configs"("key");

-- CreateIndex
CREATE INDEX "artifacts_app_slug_idx" ON "artifacts"("app_slug");

-- CreateIndex
CREATE INDEX "artifacts_type_idx" ON "artifacts"("type");

-- CreateIndex
CREATE INDEX "artifacts_status_idx" ON "artifacts"("status");

-- CreateIndex
CREATE INDEX "artifacts_created_at_idx" ON "artifacts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "app_budget_configs_app_slug_key" ON "app_budget_configs"("app_slug");

-- CreateIndex
CREATE INDEX "usage_meters_app_slug_idx" ON "usage_meters"("app_slug");

-- CreateIndex
CREATE INDEX "usage_meters_date_idx" ON "usage_meters"("date");

-- CreateIndex
CREATE INDEX "usage_meters_capability_idx" ON "usage_meters"("capability");

-- CreateIndex
CREATE UNIQUE INDEX "usage_meters_app_slug_date_capability_provider_model_key" ON "usage_meters"("app_slug", "date", "capability", "provider", "model");

-- CreateIndex
CREATE INDEX "manager_agent_logs_manager_type_idx" ON "manager_agent_logs"("manager_type");

-- CreateIndex
CREATE INDEX "manager_agent_logs_severity_idx" ON "manager_agent_logs"("severity");

-- CreateIndex
CREATE INDEX "manager_agent_logs_created_at_idx" ON "manager_agent_logs"("created_at");

-- CreateIndex
CREATE INDEX "workspace_sessions_created_at_idx" ON "workspace_sessions"("created_at");

-- CreateIndex
CREATE INDEX "workspace_sessions_trace_id_idx" ON "workspace_sessions"("trace_id");

-- CreateIndex
CREATE INDEX "aiva_messages_conversation_id_idx" ON "aiva_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "aiva_messages_created_at_idx" ON "aiva_messages"("created_at");

-- CreateIndex
CREATE INDEX "aiva_memories_memory_type_idx" ON "aiva_memories"("memory_type");

-- CreateIndex
CREATE UNIQUE INDEX "app_intelligence_profiles_app_slug_key" ON "app_intelligence_profiles"("app_slug");

-- CreateIndex
CREATE INDEX "app_intelligence_profiles_app_slug_idx" ON "app_intelligence_profiles"("app_slug");

-- CreateIndex
CREATE UNIQUE INDEX "aiva_avatar_configs_state_key" ON "aiva_avatar_configs"("state");

-- CreateIndex
CREATE INDEX "healing_records_category_idx" ON "healing_records"("category");

-- CreateIndex
CREATE INDEX "healing_records_severity_idx" ON "healing_records"("severity");

-- CreateIndex
CREATE INDEX "healing_records_resolved_idx" ON "healing_records"("resolved");

-- CreateIndex
CREATE INDEX "healing_records_detected_at_idx" ON "healing_records"("detected_at");

-- CreateIndex
CREATE UNIQUE INDEX "healing_records_category_affected_resource_key" ON "healing_records"("category", "affected_resource");

-- CreateIndex
CREATE INDEX "music_generation_jobs_app_slug_idx" ON "music_generation_jobs"("app_slug");

-- CreateIndex
CREATE INDEX "music_generation_jobs_status_idx" ON "music_generation_jobs"("status");

-- CreateIndex
CREATE INDEX "music_generation_jobs_created_at_idx" ON "music_generation_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "capability_registry_capability_key_key" ON "capability_registry"("capability_key");

-- CreateIndex
CREATE INDEX "capability_registry_category_idx" ON "capability_registry"("category");

-- CreateIndex
CREATE INDEX "capability_registry_enabled_idx" ON "capability_registry"("enabled");

-- CreateIndex
CREATE INDEX "capability_registry_proof_status_idx" ON "capability_registry"("proof_status");

-- CreateIndex
CREATE INDEX "provider_capability_map_provider_key_idx" ON "provider_capability_map"("provider_key");

-- CreateIndex
CREATE INDEX "provider_capability_map_capability_key_idx" ON "provider_capability_map"("capability_key");

-- CreateIndex
CREATE INDEX "provider_capability_map_proven_idx" ON "provider_capability_map"("proven");

-- CreateIndex
CREATE UNIQUE INDEX "provider_capability_map_provider_key_capability_key_key" ON "provider_capability_map"("provider_key", "capability_key");

-- CreateIndex
CREATE INDEX "model_discovery_cache_provider_key_idx" ON "model_discovery_cache"("provider_key");

-- CreateIndex
CREATE INDEX "model_discovery_cache_enabled_idx" ON "model_discovery_cache"("enabled");

-- CreateIndex
CREATE INDEX "model_discovery_cache_last_seen_idx" ON "model_discovery_cache"("last_seen");

-- CreateIndex
CREATE UNIQUE INDEX "model_discovery_cache_provider_key_model_id_key" ON "model_discovery_cache"("provider_key", "model_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_profiles_profile_key_key" ON "budget_profiles"("profile_key");

-- CreateIndex
CREATE INDEX "budget_profiles_cost_tier_idx" ON "budget_profiles"("cost_tier");

-- CreateIndex
CREATE UNIQUE INDEX "avatar_library_avatar_id_key" ON "avatar_library"("avatar_id");

-- CreateIndex
CREATE INDEX "avatar_library_provider_idx" ON "avatar_library"("provider");

-- CreateIndex
CREATE INDEX "avatar_library_enabled_idx" ON "avatar_library"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "voice_library_voice_id_key" ON "voice_library"("voice_id");

-- CreateIndex
CREATE INDEX "voice_library_provider_idx" ON "voice_library"("provider");

-- CreateIndex
CREATE INDEX "voice_library_enabled_idx" ON "voice_library"("enabled");

-- CreateIndex
CREATE INDEX "voice_library_language_idx" ON "voice_library"("language");

-- CreateIndex
CREATE INDEX "campaigns_app_slug_idx" ON "campaigns"("app_slug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "campaigns"("created_at");

-- CreateIndex
CREATE INDEX "campaign_items_campaign_id_idx" ON "campaign_items"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_items_platform_idx" ON "campaign_items"("platform");

-- CreateIndex
CREATE INDEX "campaign_items_status_idx" ON "campaign_items"("status");

-- CreateIndex
CREATE INDEX "generated_assets_app_slug_idx" ON "generated_assets"("app_slug");

-- CreateIndex
CREATE INDEX "generated_assets_campaign_id_idx" ON "generated_assets"("campaign_id");

-- CreateIndex
CREATE INDEX "generated_assets_campaign_item_id_idx" ON "generated_assets"("campaign_item_id");

-- CreateIndex
CREATE INDEX "generated_assets_status_idx" ON "generated_assets"("status");

-- CreateIndex
CREATE INDEX "generated_assets_asset_type_idx" ON "generated_assets"("asset_type");

-- CreateIndex
CREATE INDEX "asset_versions_asset_id_idx" ON "asset_versions"("asset_id");

-- CreateIndex
CREATE INDEX "asset_versions_version_number_idx" ON "asset_versions"("version_number");

-- CreateIndex
CREATE INDEX "publishing_schedules_app_slug_idx" ON "publishing_schedules"("app_slug");

-- CreateIndex
CREATE INDEX "publishing_schedules_campaign_id_idx" ON "publishing_schedules"("campaign_id");

-- CreateIndex
CREATE INDEX "publishing_schedules_status_idx" ON "publishing_schedules"("status");

-- CreateIndex
CREATE INDEX "publishing_schedules_scheduled_for_idx" ON "publishing_schedules"("scheduled_for");

-- CreateIndex
CREATE INDEX "publishing_results_app_slug_idx" ON "publishing_results"("app_slug");

-- CreateIndex
CREATE INDEX "publishing_results_campaign_id_idx" ON "publishing_results"("campaign_id");

-- CreateIndex
CREATE INDEX "publishing_results_status_idx" ON "publishing_results"("status");

-- CreateIndex
CREATE INDEX "campaign_analytics_app_slug_idx" ON "campaign_analytics"("app_slug");

-- CreateIndex
CREATE INDEX "campaign_analytics_campaign_id_idx" ON "campaign_analytics"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_analytics_platform_idx" ON "campaign_analytics"("platform");

-- CreateIndex
CREATE INDEX "campaign_analytics_metric_name_idx" ON "campaign_analytics"("metric_name");

-- CreateIndex
CREATE INDEX "campaign_analytics_captured_at_idx" ON "campaign_analytics"("captured_at");

-- CreateIndex
CREATE INDEX "recurring_campaign_schedules_app_slug_idx" ON "recurring_campaign_schedules"("app_slug");

-- CreateIndex
CREATE INDEX "recurring_campaign_schedules_status_idx" ON "recurring_campaign_schedules"("status");

-- CreateIndex
CREATE INDEX "recurring_campaign_schedules_next_run_at_idx" ON "recurring_campaign_schedules"("next_run_at");

-- AddForeignKey
ALTER TABLE "app_integrations" ADD CONSTRAINT "app_integrations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_metric_definitions" ADD CONSTRAINT "app_metric_definitions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_metric_points" ADD CONSTRAINT "app_metric_points_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_resource_snapshots" ADD CONSTRAINT "vps_resource_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widget_configs" ADD CONSTRAINT "dashboard_widget_configs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_push_logs" ADD CONSTRAINT "github_push_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "playground_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_tasks" ADD CONSTRAINT "repo_tasks_repo_workspace_id_fkey" FOREIGN KEY ("repo_workspace_id") REFERENCES "repo_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_patches" ADD CONSTRAINT "repo_patches_repo_workspace_id_fkey" FOREIGN KEY ("repo_workspace_id") REFERENCES "repo_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_patches" ADD CONSTRAINT "repo_patches_repo_task_id_fkey" FOREIGN KEY ("repo_task_id") REFERENCES "repo_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_job_items" ADD CONSTRAINT "batch_job_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_ab_tests" ADD CONSTRAINT "prompt_ab_tests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_log" ADD CONSTRAINT "webhook_delivery_log_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhook_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_agent_learning_logs" ADD CONSTRAINT "app_agent_learning_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "app_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aiva_messages" ADD CONSTRAINT "aiva_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "aiva_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_capability_map" ADD CONSTRAINT "provider_capability_map_capability_key_fkey" FOREIGN KEY ("capability_key") REFERENCES "capability_registry"("capability_key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_campaign_item_id_fkey" FOREIGN KEY ("campaign_item_id") REFERENCES "campaign_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "generated_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

