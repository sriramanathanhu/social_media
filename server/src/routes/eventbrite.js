const express = require('express');
const router = express.Router();
const eventbriteController = require('../controllers/eventbriteController');
const auth = require('../middleware/auth');

// OAuth callback route
router.get('/callback', auth, eventbriteController.connectAccount);

// Event management routes
router.post('/events', auth, eventbriteController.createEvent);
router.post('/events/:eventId/tickets', auth, eventbriteController.createTicketClass);
router.post('/events/:eventId/publish', auth, eventbriteController.publishEvent);

// Account routes
router.get('/accounts/:accountId/events', auth, eventbriteController.getAccountEvents);
router.post('/accounts/:accountId/sync', auth, eventbriteController.syncAccountEvents);
router.get('/accounts/:accountId/meta', auth, eventbriteController.getEventMeta);

module.exports = router;