const AccountGroup = require('../models/AccountGroup');
const { body, validationResult } = require('express-validator');

const createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color } = req.body;
    const group = await AccountGroup.create(req.user.id, name, description, color);
    
    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await AccountGroup.findByUserId(req.user.id);
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await AccountGroup.getGroupWithAccounts(id, req.user.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, color } = req.body;
    
    const group = await AccountGroup.update(id, req.user.id, {
      name,
      description,
      color
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({ group });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await AccountGroup.delete(id, req.user.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

const addAccountToGroup = async (req, res) => {
  try {
    const { groupId, accountId } = req.params;
    
    const account = await AccountGroup.addAccountToGroup(accountId, groupId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({ message: 'Account added to group successfully', account });
  } catch (error) {
    console.error('Add account to group error:', error);
    res.status(500).json({ error: 'Failed to add account to group' });
  }
};

const removeAccountFromGroup = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await AccountGroup.removeAccountFromGroup(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({ message: 'Account removed from group successfully', account });
  } catch (error) {
    console.error('Remove account from group error:', error);
    res.status(500).json({ error: 'Failed to remove account from group' });
  }
};

const createGroupValidation = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code')
];

const updateGroupValidation = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code')
];

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addAccountToGroup,
  removeAccountFromGroup,
  createGroupValidation,
  updateGroupValidation
};