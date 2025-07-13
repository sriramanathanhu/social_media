-- Create stream_apps table for independent app management
CREATE TABLE IF NOT EXISTS stream_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    rtmp_app_path VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'live', 'stream', 'broadcast'
    default_stream_key VARCHAR(255), -- Optional default key
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    settings JSONB DEFAULT '{}', -- App-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique app names per user
    UNIQUE(user_id, app_name)
);

-- Create stream_app_keys table for managing multiple keys per app
CREATE TABLE IF NOT EXISTS stream_app_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES stream_apps(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL, -- e.g., 'primary', 'backup', 'youtube', 'twitch'
    stream_key VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique key names per app
    UNIQUE(app_id, key_name)
);

-- Update live_streams table to reference stream apps instead of generating individual keys
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES stream_apps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS app_key_id UUID REFERENCES stream_app_keys(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_apps_user_id ON stream_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_apps_status ON stream_apps(status);
CREATE INDEX IF NOT EXISTS idx_stream_app_keys_app_id ON stream_app_keys(app_id);
CREATE INDEX IF NOT EXISTS idx_stream_app_keys_active ON stream_app_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_live_streams_app_id ON live_streams(app_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_app_key_id ON live_streams(app_key_id);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_stream_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stream_apps_updated_at
    BEFORE UPDATE ON stream_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_apps_updated_at();

CREATE TRIGGER update_stream_app_keys_updated_at
    BEFORE UPDATE ON stream_app_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_apps_updated_at();