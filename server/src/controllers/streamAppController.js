const StreamApp = require('../models/StreamApp');
const StreamAppKey = require('../models/StreamAppKey');
const { validationResult } = require('express-validator');

// Create a new stream app
const createApp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      appName,
      description,
      rtmpAppPath,
      defaultStreamKey,
      settings
    } = req.body;

    // Check if app path is unique
    const isPathAvailable = await StreamApp.validateAppPath(rtmpAppPath);
    if (!isPathAvailable) {
      return res.status(400).json({
        success: false,
        message: 'RTMP app path already exists. Please choose a different path.'
      });
    }

    // Check if user already has an app with this name
    const existingApp = await StreamApp.findByUserIdAndName(req.user.id, appName);
    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You already have an app with this name. Please choose a different name.'
      });
    }

    const app = await StreamApp.create({
      userId: req.user.id,
      appName,
      description,
      rtmpAppPath,
      defaultStreamKey,
      settings
    });

    // If a default stream key is provided, create it as the primary key
    if (defaultStreamKey) {
      await StreamAppKey.create({
        appId: app.id,
        keyName: 'primary',
        streamKey: defaultStreamKey,
        description: 'Primary stream key',
        isActive: true
      });
    }

    res.status(201).json({
      success: true,
      app
    });
  } catch (error) {
    console.error('Create app error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create app'
    });
  }
};

// Get all apps for the current user
const getApps = async (req, res) => {
  try {
    const apps = await StreamApp.findByUserId(req.user.id);
    
    res.json({
      success: true,
      apps
    });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch apps'
    });
  }
};

// Get a specific app with its keys
const getApp = async (req, res) => {
  try {
    const { id } = req.params;
    const app = await StreamApp.getAppWithKeys(id);

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    // Verify ownership
    if (app.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      app
    });
  } catch (error) {
    console.error('Get app error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app'
    });
  }
};

// Update an app
const updateApp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verify ownership
    const existingApp = await StreamApp.findById(id);
    if (!existingApp) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    if (existingApp.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if RTMP app path is being changed and is unique
    if (updateData.rtmpAppPath && updateData.rtmpAppPath !== existingApp.rtmp_app_path) {
      const isPathAvailable = await StreamApp.validateAppPath(updateData.rtmpAppPath, id);
      if (!isPathAvailable) {
        return res.status(400).json({
          success: false,
          message: 'RTMP app path already exists. Please choose a different path.'
        });
      }
    }

    // Check if app name is being changed and is unique for this user
    if (updateData.appName && updateData.appName !== existingApp.app_name) {
      const existingAppWithName = await StreamApp.findByUserIdAndName(req.user.id, updateData.appName);
      if (existingAppWithName && existingAppWithName.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'You already have an app with this name. Please choose a different name.'
        });
      }
    }

    const updatedApp = await StreamApp.update(id, updateData);

    res.json({
      success: true,
      app: updatedApp
    });
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update app'
    });
  }
};

// Delete an app
const deleteApp = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existingApp = await StreamApp.findById(id);
    if (!existingApp) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    if (existingApp.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await StreamApp.delete(id);

    res.json({
      success: true,
      message: 'App deleted successfully'
    });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete app'
    });
  }
};

// Add a key to an app
const addKey = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { keyName, streamKey, description, isActive } = req.body;

    // Verify app ownership
    const app = await StreamApp.findById(id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if key name is unique within the app
    const isKeyNameAvailable = await StreamAppKey.validateKeyName(id, keyName);
    if (!isKeyNameAvailable) {
      return res.status(400).json({
        success: false,
        message: 'A key with this name already exists in this app. Please choose a different name.'
      });
    }

    const key = await StreamAppKey.create({
      appId: id,
      keyName,
      streamKey,
      description,
      isActive
    });

    res.status(201).json({
      success: true,
      key
    });
  } catch (error) {
    console.error('Add key error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add key'
    });
  }
};

// Get all keys for an app
const getKeys = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify app ownership
    const app = await StreamApp.findById(id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const keys = await StreamAppKey.findByAppId(id);

    res.json({
      success: true,
      keys
    });
  } catch (error) {
    console.error('Get keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch keys'
    });
  }
};

// Update a key
const updateKey = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { keyId } = req.params;
    const updateData = req.body;

    // Get the key and verify ownership through the app
    const key = await StreamAppKey.findById(keyId);
    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Key not found'
      });
    }

    const app = await StreamApp.findById(key.app_id);
    if (!app || app.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if key name is being changed and is unique
    if (updateData.keyName && updateData.keyName !== key.key_name) {
      const isKeyNameAvailable = await StreamAppKey.validateKeyName(key.app_id, updateData.keyName, keyId);
      if (!isKeyNameAvailable) {
        return res.status(400).json({
          success: false,
          message: 'A key with this name already exists in this app. Please choose a different name.'
        });
      }
    }

    const updatedKey = await StreamAppKey.update(keyId, updateData);

    res.json({
      success: true,
      key: updatedKey
    });
  } catch (error) {
    console.error('Update key error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update key'
    });
  }
};

// Delete a key
const deleteKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    // Get the key and verify ownership through the app
    const key = await StreamAppKey.findById(keyId);
    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Key not found'
      });
    }

    const app = await StreamApp.findById(key.app_id);
    if (!app || app.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await StreamAppKey.delete(keyId);

    res.json({
      success: true,
      message: 'Key deleted successfully'
    });
  } catch (error) {
    console.error('Delete key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete key'
    });
  }
};

module.exports = {
  createApp,
  getApps,
  getApp,
  updateApp,
  deleteApp,
  addKey,
  getKeys,
  updateKey,
  deleteKey
};