-- Скрипт для обновления базы данных - добавление предварительной регистрации пользователей
-- Запустите этот скрипт в вашей PostgreSQL базе данных

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

-- Indexes for pre-registered users
CREATE INDEX IF NOT EXISTS idx_pre_registered_phone ON pre_registered_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_pre_registered_activated ON pre_registered_users(is_activated);
CREATE INDEX IF NOT EXISTS idx_pre_registered_added_by ON pre_registered_users(added_by);

-- Trigger for updating pre_registered_users updated_at
CREATE TRIGGER update_pre_registered_users_updated_at 
    BEFORE UPDATE ON pre_registered_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Уведомляем о успешном выполнении
DO $$
BEGIN
    RAISE NOTICE 'База данных успешно обновлена для поддержки предварительной регистрации пользователей';
END $$; 