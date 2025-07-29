const { UserInfo } = require('../models/UserInfo');
const UserInfoService = require('../services/UserInfoService');

class UserInfoController {
    // Main endpoint to get user information
    static async getUserInfo(req, res) {
        try {
            // Get frontend data from request body (for POST requests)
            const frontendData = req.body || {};
            
            // Collect all user information
            const userData = await UserInfoService.collectUserInfo(req, frontendData);
            
            // Validate and create UserInfo model
            const validatedData = UserInfo.validateData(userData);
            const userInfo = new UserInfo(validatedData);

            // Save to database
            let savedRecord = null;
            try {
                savedRecord = await UserInfo.saveToDatabase(validatedData);
                console.log(`💾 User info saved to database with ID: ${savedRecord._id}`);
            } catch (dbError) {
                console.error('❌ Database save error (continuing with response):', dbError.message);
                // Continue with response even if database save fails
            }

            // Log the request (optional - remove in production if not needed)
            console.log(`📊 User info collected for IP: ${userData.network.ip}`);

            // Return the complete user information
            res.status(200).json({
                success: true,
                message: 'User information collected successfully',
                data: userInfo.toJSON(),
                summary: userInfo.getSummary(),
                database: savedRecord ? {
                    saved: true,
                    id: savedRecord._id,
                    savedAt: savedRecord.createdAt
                } : {
                    saved: false,
                    message: 'Failed to save to database but data collected successfully'
                }
            });

        } catch (error) {
            console.error('❌ Error in getUserInfo controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to collect user information',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get user info summary (lighter version)
    static async getUserInfoSummary(req, res) {
        try {
            const userData = await UserInfoService.collectUserInfo(req);
            const validatedData = UserInfo.validateData(userData);
            const userInfo = new UserInfo(validatedData);

            // Save to database
            try {
                await UserInfo.saveToDatabase(validatedData);
            } catch (dbError) {
                console.error('❌ Database save error (continuing with response):', dbError.message);
            }

            res.status(200).json({
                success: true,
                message: 'User information summary collected successfully',
                data: userInfo.getSummary()
            });

        } catch (error) {
            console.error('❌ Error in getUserInfoSummary controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to collect user information summary',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get all records from database
    static async getAllRecords(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const skip = parseInt(req.query.skip) || 0;
            
            const records = await UserInfo.getAllRecords(limit, skip);
            
            res.status(200).json({
                success: true,
                message: 'Records retrieved successfully',
                data: records,
                count: records.length,
                pagination: {
                    limit,
                    skip,
                    hasMore: records.length === limit
                }
            });
        } catch (error) {
            console.error('❌ Error fetching records:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch records',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get records by IP
    static async getRecordsByIP(req, res) {
        try {
            const { ip } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            
            const records = await UserInfo.getRecordsByIP(ip, limit);
            
            res.status(200).json({
                success: true,
                message: `Records for IP ${ip} retrieved successfully`,
                data: records,
                count: records.length
            });
        } catch (error) {
            console.error('❌ Error fetching records by IP:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch records by IP',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get database statistics
    static async getStatistics(req, res) {
        try {
            const stats = await UserInfo.getStatistics();
            
            res.status(200).json({
                success: true,
                message: 'Statistics retrieved successfully',
                data: stats
            });
        } catch (error) {
            console.error('❌ Error fetching statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Health check for user info service
    static async healthCheck(req, res) {
        try {
            res.status(200).json({
                success: true,
                message: 'User info service is running',
                timestamp: new Date().toISOString(),
                service: 'user-info-api',
                database: 'connected'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'User info service is not available'
            });
        }
    }
}

module.exports = UserInfoController;
