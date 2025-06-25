-- WorkTime Tracker Database Schema
-- PostgreSQL migrations

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'admin')),
    company_id UUID,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SMS verifications table
CREATE TABLE IF NOT EXISTS sms_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('login', 'registration', 'password_reset')),
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Construction sites table
CREATE TABLE IF NOT EXISTS construction_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER NOT NULL DEFAULT 50 CHECK (radius >= 10 AND radius <= 1000),
    is_active BOOLEAN DEFAULT TRUE,
    company_id UUID,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User site assignments table
CREATE TABLE IF NOT EXISTS user_site_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(user_id, site_id)
);

-- Work shifts table
CREATE TABLE IF NOT EXISTS work_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    start_location JSONB,
    end_location JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Violations table
CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('late_start', 'early_end', 'location_violation', 'no_checkout', 'other')),
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table (for JWT)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id VARCHAR(255),
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync history table
CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'incremental',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat system tables

-- Chats table (one chat per worker-foreman pair)
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    foreman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, foreman_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'task')),
    content TEXT NOT NULL,
    photo_uri VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_read BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Daily tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    assigned_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, assigned_date)
);

-- Photo reports table (linked to chat messages)
CREATE TABLE IF NOT EXISTS photo_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_uri VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push tokens table for notifications
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('ios', 'android', 'web', 'unknown')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, push_token)
);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    sound BOOLEAN DEFAULT TRUE,
    vibration BOOLEAN DEFAULT TRUE,
    shift_reminders BOOLEAN DEFAULT TRUE,
    break_reminders BOOLEAN DEFAULT TRUE,
    gps_events BOOLEAN DEFAULT FALSE,
    violations BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification history table
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('violation', 'assignment', 'shift_reminder', 'overtime', 'general')),
    push_token VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-registered users table - for admin to pre-register users before they can login
CREATE TABLE IF NOT EXISTS pre_registered_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'admin')),
    company_id UUID,
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_activated BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE,
    app_download_sent BOOLEAN DEFAULT FALSE,
    app_download_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_expires ON sms_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_sms_used ON sms_verifications(is_used);

CREATE INDEX IF NOT EXISTS idx_sites_active ON construction_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_sites_company ON construction_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_created_by ON construction_sites(created_by);

CREATE INDEX IF NOT EXISTS idx_assignments_user ON user_site_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_site ON user_site_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON user_site_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON user_site_assignments(valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON work_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_site ON work_shifts(site_id);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON work_shifts(is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON work_shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON work_shifts(end_time);

CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_site ON violations(site_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_resolved ON violations(resolved_at);
CREATE INDEX IF NOT EXISTS idx_violations_created_at ON violations(created_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_metadata(sync_status);

CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON sync_history(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_history_device_id ON sync_history(device_id);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chats_worker ON chats(worker_id);
CREATE INDEX IF NOT EXISTS idx_chats_foreman ON chats(foreman_id);
CREATE INDEX IF NOT EXISTS idx_chats_active ON chats(is_active);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON chat_messages(is_pinned);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_chat ON daily_tasks(chat_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_assigned_to ON daily_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(assigned_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_completed ON daily_tasks(is_completed);

CREATE INDEX IF NOT EXISTS idx_photo_reports_chat ON photo_reports(chat_id);
CREATE INDEX IF NOT EXISTS idx_photo_reports_user ON photo_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_reports_message ON photo_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_photo_reports_validated ON photo_reports(is_validated);
CREATE INDEX IF NOT EXISTS idx_photo_reports_created_at ON photo_reports(created_at);

-- Indexes for notification tables
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON user_push_tokens(push_token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON user_push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_type ON user_push_tokens(device_type);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON user_notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_read_at ON notification_history(read_at);

-- Indexes for pre-registered users
CREATE INDEX IF NOT EXISTS idx_pre_registered_phone ON pre_registered_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_pre_registered_activated ON pre_registered_users(is_activated);
CREATE INDEX IF NOT EXISTS idx_pre_registered_added_by ON pre_registered_users(added_by);

-- Functions for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at 
    BEFORE UPDATE ON construction_sites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at 
    BEFORE UPDATE ON work_shifts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at 
    BEFORE UPDATE ON chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for notification tables
CREATE TRIGGER update_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating pre_registered_users updated_at
CREATE TRIGGER update_pre_registered_users_updated_at 
    BEFORE UPDATE ON pre_registered_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for commonly used queries
CREATE OR REPLACE VIEW active_assignments AS
SELECT 
    a.*,
    u.name as user_name,
    u.phone_number,
    s.name as site_name,
    s.address as site_address
FROM user_site_assignments a
JOIN users u ON a.user_id = u.id
JOIN construction_sites s ON a.site_id = s.id
WHERE a.is_active = true
    AND u.is_active = true
    AND s.is_active = true
    AND (a.valid_from IS NULL OR a.valid_from <= CURRENT_TIMESTAMP)
    AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_TIMESTAMP);

CREATE OR REPLACE VIEW work_reports AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.phone_number,
    s.name as site_name,
    COUNT(ws.id) as shifts_count,
    COALESCE(SUM(ws.total_hours), 0) as total_hours,
    COUNT(v.id) as violations_count,
    MAX(ws.start_time) as last_shift_date
FROM users u
LEFT JOIN work_shifts ws ON u.id = ws.user_id AND ws.end_time IS NOT NULL
LEFT JOIN construction_sites s ON ws.site_id = s.id
LEFT JOIN violations v ON u.id = v.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.phone_number, s.name;

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours(
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF start_time IS NULL OR end_time IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update shift total hours automatically
CREATE OR REPLACE FUNCTION update_shift_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.total_hours = calculate_work_hours(NEW.start_time, NEW.end_time);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shift_hours 
    BEFORE INSERT OR UPDATE ON work_shifts 
    FOR EACH ROW EXECUTE FUNCTION update_shift_total_hours(); 