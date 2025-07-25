-- Create stream_apps table (simplified with text IDs)
CREATE TABLE IF NOT EXISTS stream_apps (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    rtmp_app_path VARCHAR(255) NOT NULL,
    default_stream_key VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stream_app_keys table
CREATE TABLE IF NOT EXISTS stream_app_keys (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES stream_apps(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    stream_key TEXT NOT NULL,
    stream_url TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create live_streams table
CREATE TABLE IF NOT EXISTS live_streams (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(255) NOT NULL,
    rtmp_url VARCHAR(500) NOT NULL,
    source_app VARCHAR(100) DEFAULT 'live',
    source_stream VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive',
    app_id TEXT REFERENCES stream_apps(id),
    app_key_id TEXT REFERENCES stream_app_keys(id),
    destinations JSONB DEFAULT '[]',
    quality_settings JSONB DEFAULT '{}',
    auto_post_enabled BOOLEAN DEFAULT false,
    auto_post_accounts INTEGER[],
    auto_post_message TEXT,
    category VARCHAR(100),
    tags TEXT[],
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT
);

-- Add triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_stream_apps_updated_at
    BEFORE UPDATE ON stream_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_stream_app_keys_updated_at
    BEFORE UPDATE ON stream_app_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_live_streams_updated_at
    BEFORE UPDATE ON live_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();