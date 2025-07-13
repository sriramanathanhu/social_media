-- Create live_streams table for streaming functionality
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(255) NOT NULL UNIQUE,
    rtmp_url VARCHAR(255) NOT NULL,
    source_app VARCHAR(255) DEFAULT 'live',
    source_stream VARCHAR(255),
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('inactive', 'live', 'ended', 'error')),
    
    -- App-based streaming columns
    app_id UUID REFERENCES stream_apps(id) ON DELETE SET NULL,
    app_key_id UUID REFERENCES stream_app_keys(id) ON DELETE SET NULL,
    
    -- Stream configuration
    destinations JSONB DEFAULT '[]',
    quality_settings JSONB DEFAULT '{}',
    
    -- Auto-posting settings
    auto_post_enabled BOOLEAN DEFAULT false,
    auto_post_accounts TEXT[],
    auto_post_message TEXT,
    
    -- Metadata
    category VARCHAR(100),
    tags TEXT[],
    is_public BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Create stream_sessions table for tracking live sessions
CREATE TABLE IF NOT EXISTS stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),
    
    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Statistics
    peak_viewers INTEGER DEFAULT 0,
    viewer_count INTEGER DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stream_republishing table for multi-platform streaming
CREATE TABLE IF NOT EXISTS stream_republishing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Destination configuration
    destination_name VARCHAR(255) NOT NULL,
    destination_url VARCHAR(255) NOT NULL,
    destination_port INTEGER DEFAULT 1935,
    destination_app VARCHAR(255) NOT NULL,
    destination_stream VARCHAR(255) NOT NULL,
    destination_key VARCHAR(255),
    
    -- Control settings
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    retry_attempts INTEGER DEFAULT 3,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'error', 'disabled')),
    last_error TEXT,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    connection_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_app_id ON live_streams(app_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_app_key_id ON live_streams(app_key_id);

CREATE INDEX IF NOT EXISTS idx_stream_sessions_stream_id ON stream_sessions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_user_id ON stream_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_status ON stream_sessions(status);

CREATE INDEX IF NOT EXISTS idx_stream_republishing_stream_id ON stream_republishing(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_republishing_user_id ON stream_republishing(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_republishing_status ON stream_republishing(status);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_live_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_streams_updated_at
    BEFORE UPDATE ON live_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_live_streams_updated_at();

CREATE TRIGGER update_stream_sessions_updated_at
    BEFORE UPDATE ON stream_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_live_streams_updated_at();

CREATE TRIGGER update_stream_republishing_updated_at
    BEFORE UPDATE ON stream_republishing
    FOR EACH ROW
    EXECUTE FUNCTION update_live_streams_updated_at();