const express = require('express');
const router = express.Router();
const UserInfoController = require('../controllers/UserInfoController');
const { rateLimit, validateUserInfoRequest, setResponseHeaders } = require('../middleware/userInfoMiddleware');

// Apply middleware to all routes
router.use(setResponseHeaders);
router.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Main route for collecting user information
// This is the single endpoint your frontend will hit
router.get('/user-info', validateUserInfoRequest, UserInfoController.getUserInfo);
router.post('/user-info', validateUserInfoRequest, UserInfoController.getUserInfo);

// Alternative summary endpoint (lighter version)
router.get('/user-info/summary', UserInfoController.getUserInfoSummary);
router.post('/user-info/summary', UserInfoController.getUserInfoSummary);

// Live tracking endpoint with enhanced location analysis
router.post('/user-info/live-track', UserInfoController.liveTrack);

// Stealth tracking endpoint (no GPS permission required)
router.post('/user-info/stealth-track', UserInfoController.stealthTrack);

// Database management endpoints
router.get('/user-info/records', UserInfoController.getAllRecords);
router.get('/user-info/records/:ip', UserInfoController.getRecordsByIP);
router.get('/user-info/statistics', UserInfoController.getStatistics);

// Health check for user info service
router.get('/user-info/health', UserInfoController.healthCheck);

module.exports = router;
