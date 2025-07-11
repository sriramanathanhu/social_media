-- Live Streaming Tables Migration
-- Run this script to add live streaming functionality to existing database

-- First, add missing user columns for role-based access
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended'));

-- Set the first user as admin (update this email to your admin email)
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- Create live_streams table
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(255) UNIQUE NOT NULL,
    rtmp_url VARCHAR(500) NOT NULL,
    
    -- Stream settings
    source_app VARCHAR(100) DEFAULT 'live',
    source_stream VARCHAR(255),
    
    -- Destination settings for republishing
    destinations JSONB DEFAULT '[]'::jsonb,
    
    -- Stream configuration
    quality_settings JSONB DEFAULT '{
        "resolution": "1920x1080",
        "bitrate": 4000,
        "framerate": 30,
        "audio_bitrate": 128
    }'::jsonb,
    
    -- Auto-posting settings
    auto_post_enabled BOOLEAN DEFAULT false,
    auto_post_accounts UUID[],
    auto_post_message TEXT,
    
    -- Stream status
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('inactive', 'live', 'ended', 'error')),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    thumbnail_url VARCHAR(500),
    category VARCHAR(100),
    tags TEXT[],
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stream_sessions table for tracking live streaming sessions
CREATE TABLE IF NOT EXISTS stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session details
    session_key VARCHAR(255) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Technical stats
    peak_viewers INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    
    -- Quality metrics
    avg_bitrate INTEGER,
    dropped_frames INTEGER DEFAULT 0,
    connection_quality DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Publishing results
    published_to_social BOOLEAN DEFAULT false,
    social_post_ids JSONB DEFAULT '{}'::jsonb,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stream_republishing table for managing RTMP republishing
CREATE TABLE IF NOT EXISTS stream_republishing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Source stream details
    source_app VARCHAR(100) NOT NULL,
    source_stream VARCHAR(255) NOT NULL,
    
    -- Destination details
    destination_name VARCHAR(255) NOT NULL, -- e.g., "YouTube", "Twitter", "Custom RTMP"
    destination_url VARCHAR(500) NOT NULL,
    destination_port INTEGER DEFAULT 1935,
    destination_app VARCHAR(100) NOT NULL,
    destination_stream VARCHAR(255) NOT NULL,
    destination_key VARCHAR(500), -- Stream key for platforms like YouTube
    
    -- Configuration
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    retry_attempts INTEGER DEFAULT 3,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'error', 'disconnected')),
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    connection_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for live streaming tables
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_stream_key ON live_streams(stream_key);

CREATE INDEX IF NOT EXISTS idx_stream_sessions_stream_id ON stream_sessions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_user_id ON stream_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_status ON stream_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_started_at ON stream_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_stream_republishing_stream_id ON stream_republishing(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_republishing_user_id ON stream_republishing(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_republishing_status ON stream_republishing(status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for live streaming tables
DROP TRIGGER IF EXISTS update_live_streams_updated_at ON live_streams;
CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON live_streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stream_sessions_updated_at ON stream_sessions;
CREATE TRIGGER update_stream_sessions_updated_at BEFORE UPDATE ON stream_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stream_republishing_updated_at ON stream_republishing;
CREATE TRIGGER update_stream_republishing_updated_at BEFORE UPDATE ON stream_republishing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Live streaming tables migration completed successfully!';
END $$;