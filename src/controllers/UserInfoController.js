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

    // Live tracking endpoint with enhanced location analysis
    static async liveTrack(req, res) {
        try {
            const frontendData = req.body || {};
            const trackingId = frontendData.trackingId || `track_${Date.now()}`;
            
            console.log(`🎯 Live tracking request #${frontendData.trackingCount || 1} for session: ${trackingId}`);
            
            // Collect comprehensive user information
            const userData = await UserInfoService.collectUserInfo(req, frontendData);
            
            // Enhanced location analysis for live tracking
            const locationAnalysis = {
                // GPS Analysis
                gpsLocation: frontendData.browserLocation && frontendData.browserLocation.latitude ? {
                    coordinates: {
                        latitude: frontendData.browserLocation.latitude,
                        longitude: frontendData.browserLocation.longitude,
                        accuracy: frontendData.browserLocation.accuracy,
                        altitude: frontendData.browserLocation.altitude,
                        speed: frontendData.browserLocation.speed,
                        heading: frontendData.browserLocation.heading
                    },
                    quality: UserInfoService.assessLocationQuality(frontendData.browserLocation),
                    source: 'browser-gps',
                    timestamp: frontendData.browserLocation.timestamp
                } : null,
                
                // IP-based location
                ipLocation: userData.geolocation ? {
                    coordinates: {
                        latitude: userData.geolocation.latitude,
                        longitude: userData.geolocation.longitude
                    },
                    address: {
                        country: userData.geolocation.country,
                        region: userData.geolocation.region,
                        city: userData.geolocation.city,
                        timezone: userData.geolocation.timezone
                    },
                    network: {
                        ip: userData.network.ip,
                        isp: userData.geolocation.isp,
                        organization: userData.geolocation.organization
                    },
                    source: userData.geolocation.source
                } : null,
                
                // Location comparison and accuracy
                locationComparison: null,
                
                // Movement analysis (if previous tracking data exists)
                movement: null
            };
            
            // Compare GPS and IP locations if both available
            if (locationAnalysis.gpsLocation && locationAnalysis.ipLocation) {
                locationAnalysis.locationComparison = UserInfoService.compareLocations(
                    locationAnalysis.gpsLocation.coordinates,
                    locationAnalysis.ipLocation.coordinates
                );
            }
            
            // Movement analysis for repeated tracking
            if (frontendData.trackingCount > 1 && frontendData.previousLocation) {
                locationAnalysis.movement = UserInfoService.analyzeMovement(
                    frontendData.previousLocation,
                    locationAnalysis.gpsLocation || locationAnalysis.ipLocation
                );
            }
            
            // Enhanced tracking data
            const trackingData = {
                ...userData,
                tracking: {
                    ...userData.tracking,
                    trackingId,
                    trackingCount: frontendData.trackingCount || 1,
                    sessionDuration: frontendData.sessionDuration || 0,
                    interval: frontendData.interval || 10000,
                    locationAnalysis
                }
            };
            
            // Save to database with tracking metadata
            const userInfo = new UserInfo(UserInfo.validateData(trackingData));
            let savedRecord = null;
            
            try {
                savedRecord = await userInfo.save();
                console.log(`💾 Live tracking data saved: ${savedRecord.id}`);
            } catch (dbError) {
                console.warn('⚠️ Database save failed for live tracking:', dbError.message);
            }
            
            // Create enhanced response for live tracking
            const response = {
                success: true,
                trackingId,
                trackingCount: frontendData.trackingCount || 1,
                timestamp: new Date().toISOString(),
                data: trackingData,
                locationAnalysis,
                summary: {
                    ip: userData.network.ip,
                    country: userData.geolocation?.country,
                    city: userData.geolocation?.city,
                    accuracy: locationAnalysis.gpsLocation?.coordinates.accuracy,
                    locationSources: [
                        locationAnalysis.gpsLocation ? 'GPS' : null,
                        locationAnalysis.ipLocation ? 'IP' : null
                    ].filter(Boolean),
                    movementDetected: locationAnalysis.movement?.distance > 10 // 10 meter threshold
                },
                database: {
                    saved: !!savedRecord,
                    recordId: savedRecord?.id || null
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            console.error('❌ Live tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Live tracking failed',
                error: error.message,
                trackingId: req.body?.trackingId,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Stealth location tracking without GPS permission
    static async stealthTrack(req, res) {
        try {
            const frontendData = req.body || {};
            const trackingId = frontendData.trackingId || `stealth_${Date.now()}`;
            
            console.log(`🔍 Stealth tracking request #${frontendData.calculationCount || 1} for session: ${trackingId}`);
            
            // Collect comprehensive user information (no GPS)
            const userData = await UserInfoService.collectUserInfo(req, frontendData);
            
            // Perform advanced stealth location analysis
            const stealthAnalysis = await UserInfoService.performStealthLocationAnalysis(req, frontendData);
            
            // Enhanced stealth tracking data
            const stealthTrackingData = {
                ...userData,
                stealthAnalysis,
                tracking: {
                    ...userData.tracking,
                    trackingId,
                    calculationCount: frontendData.calculationCount || 1,
                    sessionDuration: frontendData.sessionDuration || 0,
                    stealthMode: true,
                    noGpsPermission: true,
                    algorithmsUsed: stealthAnalysis.algorithms
                }
            };
            
            // Save to database with stealth metadata
            const userInfo = new UserInfo(UserInfo.validateData(stealthTrackingData));
            let savedRecord = null;
            
            try {
                savedRecord = await userInfo.save();
                console.log(`💾 Stealth tracking data saved: ${savedRecord.id}`);
            } catch (dbError) {
                console.warn('⚠️ Database save failed for stealth tracking:', dbError.message);
            }
            
            // Create enhanced response for stealth tracking
            const response = {
                success: true,
                trackingId,
                calculationCount: frontendData.calculationCount || 1,
                timestamp: new Date().toISOString(),
                data: stealthTrackingData,
                stealthAnalysis,
                summary: {
                    ip: userData.network.ip,
                    country: userData.geolocation?.country,
                    city: userData.geolocation?.city,
                    stealthLocation: stealthAnalysis.stealthLocation,
                    confidence: stealthAnalysis.confidence,
                    accuracy: stealthAnalysis.accuracy,
                    algorithmsUsed: stealthAnalysis.algorithms,
                    stealthMode: true
                },
                database: {
                    saved: !!savedRecord,
                    recordId: savedRecord?.id || null
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            console.error('❌ Stealth tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Stealth tracking failed',
                error: error.message,
                trackingId: req.body?.trackingId,
                timestamp: new Date().toISOString()
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
