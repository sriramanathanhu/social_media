const express = require('express');
const accountGroupController = require('../controllers/accountGroupController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Account group routes
router.get('/', accountGroupController.getGroups);
router.post('/', accountGroupController.createGroupValidation, accountGroupController.createGroup);
router.get('/:id', accountGroupController.getGroup);
router.put('/:id', accountGroupController.updateGroupValidation, accountGroupController.updateGroup);
router.delete('/:id', accountGroupController.deleteGroup);

// Account management in groups
router.post('/:groupId/accounts/:accountId', accountGroupController.addAccountToGroup);
router.delete('/accounts/:accountId', accountGroupController.removeAccountFromGroup);

module.exports = router;