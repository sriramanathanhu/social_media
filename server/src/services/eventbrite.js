const axios = require('axios');
const crypto = require('crypto');

class EventbriteService {
    constructor() {
        this.clientId = process.env.EVENTBRITE_CLIENT_ID;
        this.clientSecret = process.env.EVENTBRITE_CLIENT_SECRET;
        this.redirectUri = process.env.EVENTBRITE_REDIRECT_URI;
        this.apiBaseUrl = 'https://www.eventbriteapi.com/v3';
        
        if (!this.clientId || !this.clientSecret) {
            console.warn('Eventbrite API credentials not configured');
        }
    }

    // Generate OAuth authorization URL
    generateAuthUrl() {
        const state = crypto.randomBytes(32).toString('hex');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            state: state
        });

        return {
            url: `https://www.eventbrite.com/oauth/authorize?${params.toString()}`,
            state: state
        };
    }

    // Exchange authorization code for access token
    async getAccessToken(code) {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('client_id', this.clientId);
            params.append('client_secret', this.clientSecret);
            params.append('redirect_uri', this.redirectUri);
            params.append('code', code);

            console.log('Eventbrite token request:', {
                url: 'https://www.eventbrite.com/oauth/token',
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                code: code ? 'present' : 'missing'
            });

            const response = await axios.post('https://www.eventbrite.com/oauth/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            console.log('Eventbrite token response received');
            return response.data;
        } catch (error) {
            console.error('Error getting Eventbrite access token:', error.response?.data || error.message);
            console.error('Request details:', {
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                code: code ? 'present' : 'missing'
            });
            throw new Error('Failed to get access token: ' + (error.response?.data?.error_description || error.message));
        }
    }

    // Get user profile information
    async getUserProfile(accessToken) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/users/me/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error getting Eventbrite user profile:', error.response?.data);
            throw new Error('Failed to get user profile');
        }
    }

    // Get user's organizations
    async getUserOrganizations(accessToken) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/users/me/organizations/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.organizations || [];
        } catch (error) {
            console.error('Error getting Eventbrite organizations:', error.response?.data);
            throw new Error('Failed to get organizations');
        }
    }

    // Create a new event
    async createEvent(accessToken, organizationId, eventData) {
        try {
            const payload = {
                event: {
                    name: {
                        html: eventData.name
                    },
                    description: {
                        html: eventData.description || ''
                    },
                    start: {
                        timezone: eventData.start_timezone || 'UTC',
                        utc: eventData.start_datetime
                    },
                    end: {
                        timezone: eventData.end_timezone || 'UTC',
                        utc: eventData.end_datetime
                    },
                    currency: eventData.currency || 'USD',
                    online_event: eventData.online_event || false,
                    listed: eventData.listed !== undefined ? eventData.listed : true,
                    shareable: eventData.shareable !== undefined ? eventData.shareable : true,
                    invite_only: eventData.invite_only || false,
                    show_remaining: eventData.show_remaining !== undefined ? eventData.show_remaining : true,
                    capacity: eventData.capacity || null
                }
            };

            // Add venue if provided
            if (eventData.venue_id) {
                payload.event.venue_id = eventData.venue_id;
            }

            // Add category if provided
            if (eventData.category_id) {
                payload.event.category_id = eventData.category_id;
            }

            // Add format if provided
            if (eventData.format_id) {
                payload.event.format_id = eventData.format_id;
            }

            console.log('EVENTBRITE CREATE EVENT DEBUG:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`${this.apiBaseUrl}/organizations/${organizationId}/events/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating Eventbrite event:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to create event');
        }
    }

    // Create ticket class for an event
    async createTicketClass(accessToken, eventId, ticketData) {
        try {
            const payload = {
                ticket_class: {
                    name: ticketData.name,
                    description: ticketData.description || '',
                    quantity_total: ticketData.quantity_total || null,
                    minimum_quantity: ticketData.minimum_quantity || 1,
                    maximum_quantity: ticketData.maximum_quantity || 10,
                    free: ticketData.is_free !== undefined ? ticketData.is_free : true
                }
            };

            // Add pricing if it's a paid ticket
            if (!ticketData.is_free && ticketData.cost) {
                payload.ticket_class.cost = ticketData.cost;
            }

            // Add sale dates if provided
            if (ticketData.sales_start) {
                payload.ticket_class.sales_start = ticketData.sales_start;
            }
            if (ticketData.sales_end) {
                payload.ticket_class.sales_end = ticketData.sales_end;
            }

            console.log('EVENTBRITE CREATE TICKET DEBUG:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`${this.apiBaseUrl}/events/${eventId}/ticket_classes/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating Eventbrite ticket class:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to create ticket class');
        }
    }

    // Publish an event
    async publishEvent(accessToken, eventId) {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/events/${eventId}/publish/`, {}, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error publishing Eventbrite event:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to publish event');
        }
    }

    // Get user's events
    async getUserEvents(accessToken, organizationId) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/organizations/${organizationId}/events/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    order_by: 'created_desc',
                    expand: 'venue,ticket_classes'
                }
            });

            return response.data.events || [];
        } catch (error) {
            console.error('Error getting Eventbrite events:', error.response?.data);
            throw new Error('Failed to get events');
        }
    }

    // Get event details
    async getEvent(accessToken, eventId) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/events/${eventId}/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    expand: 'venue,ticket_classes,organizer'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error getting Eventbrite event:', error.response?.data);
            throw new Error('Failed to get event details');
        }
    }

    // Update event
    async updateEvent(accessToken, eventId, updateData) {
        try {
            const payload = { event: {} };

            // Update name if provided
            if (updateData.name) {
                payload.event.name = { html: updateData.name };
            }

            // Update description if provided
            if (updateData.description) {
                payload.event.description = { html: updateData.description };
            }

            // Update timing if provided
            if (updateData.start_datetime) {
                payload.event.start = {
                    timezone: updateData.start_timezone || 'UTC',
                    utc: updateData.start_datetime
                };
            }

            if (updateData.end_datetime) {
                payload.event.end = {
                    timezone: updateData.end_timezone || 'UTC',
                    utc: updateData.end_datetime
                };
            }

            // Update other fields as needed
            ['listed', 'shareable', 'invite_only', 'show_remaining', 'capacity'].forEach(field => {
                if (updateData[field] !== undefined) {
                    payload.event[field] = updateData[field];
                }
            });

            console.log('EVENTBRITE UPDATE EVENT DEBUG:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`${this.apiBaseUrl}/events/${eventId}/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error updating Eventbrite event:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to update event');
        }
    }

    // Delete/cancel event
    async cancelEvent(accessToken, eventId) {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/events/${eventId}/cancel/`, {}, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error canceling Eventbrite event:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to cancel event');
        }
    }

    // Get event categories
    async getCategories(accessToken) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/categories/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.categories || [];
        } catch (error) {
            console.error('Error getting Eventbrite categories:', error.response?.data);
            return [];
        }
    }

    // Get event formats
    async getFormats(accessToken) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/formats/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.formats || [];
        } catch (error) {
            console.error('Error getting Eventbrite formats:', error.response?.data);
            return [];
        }
    }

    // Create venue
    async createVenue(accessToken, organizationId, venueData) {
        try {
            const payload = {
                venue: {
                    name: venueData.name,
                    address: {
                        address_1: venueData.address_1 || '',
                        address_2: venueData.address_2 || '',
                        city: venueData.city || '',
                        region: venueData.region || '',
                        postal_code: venueData.postal_code || '',
                        country: venueData.country || 'US'
                    }
                }
            };

            const response = await axios.post(`${this.apiBaseUrl}/organizations/${organizationId}/venues/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating Eventbrite venue:', error.response?.data);
            throw new Error(error.response?.data?.error_description || 'Failed to create venue');
        }
    }

    // Get user's venues
    async getUserVenues(accessToken, organizationId) {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/organizations/${organizationId}/venues/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.venues || [];
        } catch (error) {
            console.error('Error getting Eventbrite venues:', error.response?.data);
            return [];
        }
    }

    // Validate access token
    async validateToken(accessToken) {
        try {
            await this.getUserProfile(accessToken);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new EventbriteService();