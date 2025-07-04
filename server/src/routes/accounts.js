const express = require('express');
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccount);
router.delete('/:id', accountController.deleteAccount);
router.post('/:id/verify', accountController.verifyAccount);

module.exports = router;