const eventbriteService = require('../services/eventbrite');
const SocialAccount = require('../models/SocialAccount');
const crypto = require('crypto');
const db = require('../config/database');

// Encryption utility functions (using same approach as other services)
const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';

function encryptToken(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.includes(':')) {
      throw new Error('Invalid encrypted data format');
    }
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt token: ' + error.message);
  }
}

class EventbriteController {
    // Connect Eventbrite account (OAuth callback)
    async connectAccount(req, res) {
        try {
            const { code, state } = req.query;
            const { user } = req;

            if (!code) {
                return res.status(400).json({ error: 'Authorization code required' });
            }

            console.log('EVENTBRITE CONNECT DEBUG:', { code: code.substring(0, 10) + '...', state });

            // Exchange code for access token
            const tokenData = await eventbriteService.getAccessToken(code);
            console.log('EVENTBRITE TOKEN RESPONSE:', { 
                hasAccessToken: !!tokenData.access_token, 
                tokenType: tokenData.token_type 
            });

            // Get user profile
            const userProfile = await eventbriteService.getUserProfile(tokenData.access_token);
            console.log('EVENTBRITE USER PROFILE:', {
                id: userProfile.id,
                name: userProfile.name,
                email: userProfile.email
            });

            // Get user organizations
            const organizations = await eventbriteService.getUserOrganizations(tokenData.access_token);
            console.log('EVENTBRITE ORGANIZATIONS:', organizations.length);

            // Use first organization or personal organization
            const organization = organizations[0] || { id: userProfile.id, name: userProfile.name };

            // Check if account already exists
            const existingAccount = await SocialAccount.findOne({
                user_id: user.id,
                platform: 'eventbrite',
                eventbrite_user_id: userProfile.id
            });

            if (existingAccount) {
                // Update existing account tokens
                await SocialAccount.updateTokens(
                    existingAccount.id,
                    encryptToken(tokenData.access_token),
                    tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
                    tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null
                );

                // Update Eventbrite-specific fields
                await db.query(
                    `UPDATE social_accounts 
                     SET eventbrite_organization_id = $1, eventbrite_email = $2, eventbrite_name = $3,
                         display_name = $4, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $5`,
                    [organization.id, userProfile.email, userProfile.name, userProfile.name, existingAccount.id]
                );

                await SocialAccount.updateLastUsed(existingAccount.id);

                return res.json({ 
                    success: true, 
                    account: existingAccount,
                    message: 'Eventbrite account reconnected successfully' 
                });
            }

            // Create new account
            const accountData = {
                user_id: user.id,
                platform: 'eventbrite',
                username: userProfile.email,
                display_name: userProfile.name,
                avatar_url: userProfile.image_id ? 
                    `https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F${userProfile.image_id}%2Fuser%2F1%2Foriginal.jpg` : null,
                access_token: encryptToken(tokenData.access_token),
                refresh_token: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
                token_expires_at: tokenData.expires_in ? 
                    new Date(Date.now() + tokenData.expires_in * 1000) : null,
                status: 'active',
                eventbrite_user_id: userProfile.id,
                eventbrite_organization_id: organization.id,
                eventbrite_email: userProfile.email,
                eventbrite_name: userProfile.name
            };

            const account = await SocialAccount.create(accountData);

            res.json({ 
                success: true, 
                account,
                message: 'Eventbrite account connected successfully' 
            });

        } catch (error) {
            console.error('Error connecting Eventbrite account:', error);
            res.status(500).json({ 
                error: 'Failed to connect Eventbrite account',
                details: error.message 
            });
        }
    }

    // Create event
    async createEvent(req, res) {
        try {
            const { user } = req;
            const { accountId, eventData } = req.body;

            console.log('EVENTBRITE CREATE EVENT REQUEST:', { 
                accountId, 
                eventName: eventData.name,
                userId: user.id 
            });

            // Get the account
            const account = await SocialAccount.findOne({
                id: accountId,
                user_id: user.id,
                platform: 'eventbrite'
            });

            if (!account) {
                return res.status(404).json({ error: 'Eventbrite account not found' });
            }

            // Decrypt access token
            const accessToken = decryptToken(account.access_token);

            // Validate token
            const isValid = await eventbriteService.validateToken(accessToken);
            if (!isValid) {
                await SocialAccount.updateStatus(account.id, 'error');
                return res.status(401).json({ error: 'Eventbrite access token is invalid. Please reconnect your account.' });
            }

            // Create event on Eventbrite
            const eventResult = await eventbriteService.createEvent(
                accessToken, 
                account.eventbrite_organization_id, 
                eventData
            );

            console.log('EVENTBRITE EVENT CREATED:', { eventId: eventResult.id, name: eventResult.name.text });

            // Store event in database
            const dbEventData = {
                account_id: account.id,
                eventbrite_event_id: eventResult.id,
                name: eventResult.name.text,
                description: eventResult.description ? eventResult.description.text : null,
                start_datetime: eventResult.start ? eventResult.start.utc : null,
                end_datetime: eventResult.end ? eventResult.end.utc : null,
                start_timezone: eventResult.start ? eventResult.start.timezone : null,
                end_timezone: eventResult.end ? eventResult.end.timezone : null,
                currency: eventResult.currency,
                is_free: eventResult.is_free || true,
                capacity: eventResult.capacity,
                category_id: eventResult.category_id,
                format_id: eventResult.format_id,
                url: eventResult.url,
                logo_url: eventResult.logo ? eventResult.logo.url : null,
                status: eventResult.status,
                listed: eventResult.listed,
                shareable: eventResult.shareable,
                invite_only: eventResult.invite_only,
                show_remaining: eventResult.show_remaining,
                online_event: eventResult.online_event,
                raw_data: eventResult
            };

            // Insert into eventbrite_events table
            const query = `
                INSERT INTO eventbrite_events (
                    account_id, eventbrite_event_id, name, description,
                    start_datetime, end_datetime, start_timezone, end_timezone,
                    currency, is_free, capacity, category_id, format_id,
                    url, logo_url, status, listed, shareable, invite_only,
                    show_remaining, online_event, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING *
            `;

            const values = [
                dbEventData.account_id, dbEventData.eventbrite_event_id, dbEventData.name,
                dbEventData.description, dbEventData.start_datetime, dbEventData.end_datetime,
                dbEventData.start_timezone, dbEventData.end_timezone, dbEventData.currency,
                dbEventData.is_free, dbEventData.capacity, dbEventData.category_id,
                dbEventData.format_id, dbEventData.url, dbEventData.logo_url,
                dbEventData.status, dbEventData.listed, dbEventData.shareable,
                dbEventData.invite_only, dbEventData.show_remaining, dbEventData.online_event,
                JSON.stringify(dbEventData.raw_data)
            ];

            const result = await db.query(query, values);
            const savedEvent = result.rows[0];

            // Update account's last used timestamp
            await SocialAccount.updateLastUsed(account.id);

            res.json({
                success: true,
                event: savedEvent,
                eventbrite_event: eventResult,
                message: 'Event created successfully'
            });

        } catch (error) {
            console.error('Error creating Eventbrite event:', error);
            res.status(500).json({
                error: 'Failed to create event',
                details: error.message
            });
        }
    }

    // Add ticket class to event
    async createTicketClass(req, res) {
        try {
            const { user } = req;
            const { eventId, ticketData } = req.body;

            console.log('EVENTBRITE CREATE TICKET REQUEST:', { eventId, ticketName: ticketData.name });

            // Get the event from database
            const eventQuery = `
                SELECT e.*, a.* FROM eventbrite_events e
                JOIN social_accounts a ON e.account_id = a.id
                WHERE e.id = $1 AND a.user_id = $2 AND a.platform = 'eventbrite'
            `;
            const eventResult = await db.query(eventQuery, [eventId, user.id]);

            if (eventResult.rows.length === 0) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const event = eventResult.rows[0];
            const accessToken = decryptToken(event.access_token);

            // Create ticket class on Eventbrite
            const ticketResult = await eventbriteService.createTicketClass(
                accessToken,
                event.eventbrite_event_id,
                ticketData
            );

            console.log('EVENTBRITE TICKET CREATED:', { ticketId: ticketResult.id, name: ticketResult.name });

            // Store ticket in database
            const ticketQuery = `
                INSERT INTO eventbrite_ticket_classes (
                    event_id, eventbrite_ticket_id, name, description,
                    cost, is_free, quantity_total, minimum_quantity,
                    maximum_quantity, sales_start, sales_end, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const ticketValues = [
                event.id,
                ticketResult.id,
                ticketResult.name,
                ticketResult.description,
                ticketResult.cost,
                ticketResult.free,
                ticketResult.quantity_total,
                ticketResult.minimum_quantity,
                ticketResult.maximum_quantity,
                ticketResult.sales_start,
                ticketResult.sales_end,
                JSON.stringify(ticketResult)
            ];

            const savedTicket = await db.query(ticketQuery, ticketValues);

            res.json({
                success: true,
                ticket: savedTicket.rows[0],
                eventbrite_ticket: ticketResult,
                message: 'Ticket class created successfully'
            });

        } catch (error) {
            console.error('Error creating Eventbrite ticket class:', error);
            res.status(500).json({
                error: 'Failed to create ticket class',
                details: error.message
            });
        }
    }

    // Publish event
    async publishEvent(req, res) {
        try {
            const { user } = req;
            const { eventId } = req.body;

            console.log('EVENTBRITE PUBLISH EVENT REQUEST:', { eventId, userId: user.id });

            // Get the event from database
            const eventQuery = `
                SELECT e.*, a.* FROM eventbrite_events e
                JOIN social_accounts a ON e.account_id = a.id
                WHERE e.id = $1 AND a.user_id = $2 AND a.platform = 'eventbrite'
            `;
            const eventResult = await db.query(eventQuery, [eventId, user.id]);

            if (eventResult.rows.length === 0) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const event = eventResult.rows[0];
            const accessToken = decryptToken(event.access_token);

            // Publish event on Eventbrite
            const publishResult = await eventbriteService.publishEvent(
                accessToken,
                event.eventbrite_event_id
            );

            console.log('EVENTBRITE EVENT PUBLISHED:', { published: publishResult.published });

            // Update event status in database
            if (publishResult.published) {
                await db.query(
                    'UPDATE eventbrite_events SET status = $1, published_at = $2 WHERE id = $3',
                    ['live', new Date(), event.id]
                );
            }

            res.json({
                success: true,
                published: publishResult.published,
                message: publishResult.published ? 'Event published successfully' : 'Event could not be published'
            });

        } catch (error) {
            console.error('Error publishing Eventbrite event:', error);
            res.status(500).json({
                error: 'Failed to publish event',
                details: error.message
            });
        }
    }

    // Get account events
    async getAccountEvents(req, res) {
        try {
            const { accountId } = req.params;
            const { user } = req;

            // Get account
            const account = await SocialAccount.findOne({
                id: accountId,
                user_id: user.id,
                platform: 'eventbrite'
            });

            if (!account) {
                return res.status(404).json({ error: 'Eventbrite account not found' });
            }

            // Get events from database
            const query = `
                SELECT * FROM eventbrite_events 
                WHERE account_id = $1 
                ORDER BY created_at DESC
            `;
            const result = await db.query(query, [account.id]);

            res.json({
                success: true,
                events: result.rows
            });

        } catch (error) {
            console.error('Error getting Eventbrite events:', error);
            res.status(500).json({
                error: 'Failed to get events',
                details: error.message
            });
        }
    }

    // Sync events from Eventbrite
    async syncAccountEvents(req, res) {
        try {
            const { accountId } = req.params;
            const { user } = req;

            // Get account
            const account = await SocialAccount.findOne({
                id: accountId,
                user_id: user.id,
                platform: 'eventbrite'
            });

            if (!account) {
                return res.status(404).json({ error: 'Eventbrite account not found' });
            }

            const accessToken = decryptToken(account.access_token);

            // Get events from Eventbrite
            const events = await eventbriteService.getUserEvents(
                accessToken,
                account.eventbrite_organization_id
            );

            console.log(`EVENTBRITE SYNC: Found ${events.length} events`);

            // Update database with events
            for (const event of events) {
                const existingQuery = 'SELECT id FROM eventbrite_events WHERE eventbrite_event_id = $1';
                const existing = await db.query(existingQuery, [event.id]);

                if (existing.rows.length === 0) {
                    // Insert new event
                    const insertQuery = `
                        INSERT INTO eventbrite_events (
                            account_id, eventbrite_event_id, name, description,
                            start_datetime, end_datetime, start_timezone, end_timezone,
                            currency, is_free, capacity, url, status, listed,
                            shareable, invite_only, show_remaining, online_event, raw_data
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    `;

                    await db.query(insertQuery, [
                        account.id, event.id, event.name.text,
                        event.description ? event.description.text : null,
                        event.start ? event.start.utc : null,
                        event.end ? event.end.utc : null,
                        event.start ? event.start.timezone : null,
                        event.end ? event.end.timezone : null,
                        event.currency, event.is_free, event.capacity,
                        event.url, event.status, event.listed,
                        event.shareable, event.invite_only,
                        event.show_remaining, event.online_event,
                        JSON.stringify(event)
                    ]);
                }
            }

            // Update account's last used timestamp
            await SocialAccount.updateLastUsed(account.id);

            res.json({
                success: true,
                synced: events.length,
                message: `Synced ${events.length} events from Eventbrite`
            });

        } catch (error) {
            console.error('Error syncing Eventbrite events:', error);
            res.status(500).json({
                error: 'Failed to sync events',
                details: error.message
            });
        }
    }

    // Get categories and formats
    async getEventMeta(req, res) {
        try {
            const { accountId } = req.params;
            const { user } = req;

            // Get account
            const account = await SocialAccount.findOne({
                id: accountId,
                user_id: user.id,
                platform: 'eventbrite'
            });

            if (!account) {
                return res.status(404).json({ error: 'Eventbrite account not found' });
            }

            const accessToken = decryptToken(account.access_token);

            // Get categories and formats in parallel
            const [categories, formats] = await Promise.all([
                eventbriteService.getCategories(accessToken),
                eventbriteService.getFormats(accessToken)
            ]);

            res.json({
                success: true,
                categories,
                formats
            });

        } catch (error) {
            console.error('Error getting Eventbrite meta data:', error);
            res.status(500).json({
                error: 'Failed to get categories and formats',
                details: error.message
            });
        }
    }
}

module.exports = new EventbriteController();