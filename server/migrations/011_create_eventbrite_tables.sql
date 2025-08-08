-- Migration: Add Eventbrite integration tables
-- Created: 2025-01-27
-- Description: Add support for Eventbrite accounts, events, and tickets

-- Add Eventbrite-specific columns to social_accounts table
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS eventbrite_user_id VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS eventbrite_organization_id VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS eventbrite_email VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS eventbrite_name VARCHAR(255);

-- Create eventbrite_events table
CREATE TABLE IF NOT EXISTS eventbrite_events (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
    eventbrite_event_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    summary TEXT,
    
    -- Event timing
    start_datetime TIMESTAMP,
    end_datetime TIMESTAMP,
    start_timezone VARCHAR(100),
    end_timezone VARCHAR(100),
    
    -- Location details
    venue_id VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    online_event BOOLEAN DEFAULT false,
    
    -- Event settings
    currency VARCHAR(10) DEFAULT 'USD',
    is_free BOOLEAN DEFAULT true,
    capacity INTEGER,
    category_id VARCHAR(255),
    subcategory_id VARCHAR(255),
    format_id VARCHAR(255),
    
    -- URLs and media
    url TEXT,
    vanity_url VARCHAR(255),
    logo_url TEXT,
    organizer_logo_url TEXT,
    
    -- Status and visibility
    status VARCHAR(50) DEFAULT 'draft', -- draft, live, started, ended, completed, canceled
    listed BOOLEAN DEFAULT true,
    shareable BOOLEAN DEFAULT true,
    invite_only BOOLEAN DEFAULT false,
    show_remaining BOOLEAN DEFAULT true,
    
    -- Social media integration
    auto_post_enabled BOOLEAN DEFAULT false,
    auto_post_accounts INTEGER[],
    auto_post_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    
    -- API response cache
    raw_data JSONB DEFAULT '{}'
);

-- Create eventbrite_ticket_classes table
CREATE TABLE IF NOT EXISTS eventbrite_ticket_classes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES eventbrite_events(id) ON DELETE CASCADE,
    eventbrite_ticket_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Pricing
    cost VARCHAR(20), -- stored as string to handle currency formatting
    fee VARCHAR(20),
    tax VARCHAR(20),
    is_free BOOLEAN DEFAULT true,
    
    -- Availability
    quantity_total INTEGER,
    quantity_sold INTEGER DEFAULT 0,
    sales_start TIMESTAMP,
    sales_end TIMESTAMP,
    
    -- Settings
    minimum_quantity INTEGER DEFAULT 1,
    maximum_quantity INTEGER DEFAULT 10,
    auto_hide BOOLEAN DEFAULT false,
    auto_hide_before TIMESTAMP,
    auto_hide_after TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- API response cache
    raw_data JSONB DEFAULT '{}'
);

-- Create eventbrite_venues table for location management
CREATE TABLE IF NOT EXISTS eventbrite_venues (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
    eventbrite_venue_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Address details
    address_1 VARCHAR(255),
    address_2 VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(10),
    
    -- Contact and metadata
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- API response cache
    raw_data JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eventbrite_events_account_id ON eventbrite_events(account_id);
CREATE INDEX IF NOT EXISTS idx_eventbrite_events_eventbrite_id ON eventbrite_events(eventbrite_event_id);
CREATE INDEX IF NOT EXISTS idx_eventbrite_events_status ON eventbrite_events(status);
CREATE INDEX IF NOT EXISTS idx_eventbrite_events_start_datetime ON eventbrite_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_eventbrite_events_created_at ON eventbrite_events(created_at);

CREATE INDEX IF NOT EXISTS idx_eventbrite_ticket_classes_event_id ON eventbrite_ticket_classes(event_id);
CREATE INDEX IF NOT EXISTS idx_eventbrite_ticket_classes_eventbrite_id ON eventbrite_ticket_classes(eventbrite_ticket_id);

CREATE INDEX IF NOT EXISTS idx_eventbrite_venues_account_id ON eventbrite_venues(account_id);
CREATE INDEX IF NOT EXISTS idx_eventbrite_venues_eventbrite_id ON eventbrite_venues(eventbrite_venue_id);

-- Create indexes for social_accounts Eventbrite columns
CREATE INDEX IF NOT EXISTS idx_social_accounts_eventbrite_user_id ON social_accounts(eventbrite_user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_eventbrite_organization_id ON social_accounts(eventbrite_organization_id);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_eventbrite_events_updated_at 
    BEFORE UPDATE ON eventbrite_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_eventbrite_ticket_classes_updated_at 
    BEFORE UPDATE ON eventbrite_ticket_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_eventbrite_venues_updated_at 
    BEFORE UPDATE ON eventbrite_venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Run this migration after setting up Eventbrite API credentials