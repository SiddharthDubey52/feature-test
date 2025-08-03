const mongoose = require('mongoose');

// Mongoose schema for user info
const userInfoSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    network: {
        ip: { type: String, default: null },
        userAgent: { type: String, default: null },
        acceptLanguage: { type: String, default: null },
        acceptEncoding: { type: String, default: null },
        connection: { type: String, default: null },
        host: { type: String, default: null },
        origin: { type: String, default: null },
        referer: { type: String, default: null },
        xForwardedFor: { type: String, default: null },
        xRealIp: { type: String, default: null }
    },
    device: {
        type: { type: String, default: 'unknown' },
        vendor: { type: String, default: 'unknown' },
        model: { type: String, default: 'unknown' },
        screenResolution: { type: String, default: null },
        colorDepth: { type: Number, default: null },
        pixelDepth: { type: Number, default: null },
        timezone: { type: String, default: null },
        language: { type: String, default: null },
        platform: { type: String, default: null },
        cookieEnabled: { type: Boolean, default: null },
        onlineStatus: { type: Boolean, default: null },
        hardwareConcurrency: { type: Number, default: null },
        deviceMemory: { type: Number, default: null },
        maxTouchPoints: { type: Number, default: null },
        // Battery information (estimated)
        batteryLevel: { type: Number, default: null },
        batteryCharging: { type: Boolean, default: null },
        batteryChargingTime: { type: Number, default: null },
        batteryDischargingTime: { type: Number, default: null },
        batteryEstimated: { type: Boolean, default: null },
        // Browser-based precise geolocation
        browserLocation: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            accuracy: { type: Number, default: null },
            altitude: { type: Number, default: null },
            altitudeAccuracy: { type: Number, default: null },
            heading: { type: Number, default: null },
            speed: { type: Number, default: null },
            timestamp: { type: Number, default: null },
            source: { type: String, default: null },
            error: { type: String, default: null }
        }
    },
    geolocation: {
        country: { type: String, default: null },
        region: { type: String, default: null },
        city: { type: String, default: null },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        timezone: { type: String, default: null },
        isp: { type: String, default: null },
        organization: { type: String, default: null }
    },
    browser: {
        name: { type: String, default: 'unknown' },
        version: { type: String, default: 'unknown' },
        engine: { type: String, default: 'unknown' },
        engineVersion: { type: String, default: 'unknown' }
    },
    system: {
        os: { type: String, default: 'unknown' },
        osVersion: { type: String, default: 'unknown' },
        architecture: { type: String, default: 'unknown' },
        cpu: { type: String, default: 'unknown' }
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: process.env.COLLECTION_NAME || 'userinfo'
});

// Create indexes for better query performance
userInfoSchema.index({ 'network.ip': 1 });
userInfoSchema.index({ timestamp: -1 });
userInfoSchema.index({ 'geolocation.country': 1 });
userInfoSchema.index({ 'browser.name': 1 });

// Create the model
const UserInfoModel = mongoose.model('UserInfo', userInfoSchema);

class UserInfo {
    constructor(data) {
        this.timestamp = new Date().toISOString();
        this.network = data.network || {};
        this.device = data.device || {};
        this.geolocation = data.geolocation || {};
        this.browser = data.browser || {};
        this.system = data.system || {};
    }

    // Validate and sanitize the data
    static validateData(data) {
        const validatedData = {
            network: {
                ip: data.network?.ip || null,
                userAgent: data.network?.userAgent || null,
                acceptLanguage: data.network?.acceptLanguage || null,
                acceptEncoding: data.network?.acceptEncoding || null,
                connection: data.network?.connection || null,
                host: data.network?.host || null,
                origin: data.network?.origin || null,
                referer: data.network?.referer || null,
                xForwardedFor: data.network?.xForwardedFor || null,
                xRealIp: data.network?.xRealIp || null
            },
            device: {
                type: data.device?.type || 'unknown',
                vendor: data.device?.vendor || 'unknown',
                model: data.device?.model || 'unknown',
                screenResolution: data.device?.screenResolution || null,
                colorDepth: data.device?.colorDepth || null,
                pixelDepth: data.device?.pixelDepth || null,
                timezone: data.device?.timezone || null,
                language: data.device?.language || null,
                platform: data.device?.platform || null,
                cookieEnabled: data.device?.cookieEnabled || null,
                onlineStatus: data.device?.onlineStatus || null,
                hardwareConcurrency: data.device?.hardwareConcurrency || null,
                deviceMemory: data.device?.deviceMemory || null,
                maxTouchPoints: data.device?.maxTouchPoints || null,
                // Battery information
                batteryLevel: data.device?.batteryLevel || null,
                batteryCharging: data.device?.batteryCharging || null,
                batteryChargingTime: data.device?.batteryChargingTime || null,
                batteryDischargingTime: data.device?.batteryDischargingTime || null,
                batteryEstimated: data.device?.batteryEstimated || null,
                // Browser location
                browserLocation: data.device?.browserLocation ? {
                    latitude: data.device.browserLocation.latitude || null,
                    longitude: data.device.browserLocation.longitude || null,
                    accuracy: data.device.browserLocation.accuracy || null,
                    altitude: data.device.browserLocation.altitude || null,
                    altitudeAccuracy: data.device.browserLocation.altitudeAccuracy || null,
                    heading: data.device.browserLocation.heading || null,
                    speed: data.device.browserLocation.speed || null,
                    timestamp: data.device.browserLocation.timestamp || null,
                    source: data.device.browserLocation.source || null,
                    error: data.device.browserLocation.error || null
                } : null
            },
            geolocation: {
                country: data.geolocation?.country || null,
                region: data.geolocation?.region || null,
                city: data.geolocation?.city || null,
                latitude: data.geolocation?.latitude || null,
                longitude: data.geolocation?.longitude || null,
                timezone: data.geolocation?.timezone || null,
                isp: data.geolocation?.isp || null,
                organization: data.geolocation?.organization || null
            },
            browser: {
                name: data.browser?.name || 'unknown',
                version: data.browser?.version || 'unknown',
                engine: data.browser?.engine || 'unknown',
                engineVersion: data.browser?.engineVersion || 'unknown'
            },
            system: {
                os: data.system?.os || 'unknown',
                osVersion: data.system?.osVersion || 'unknown',
                architecture: data.system?.architecture || 'unknown',
                cpu: data.system?.cpu || 'unknown'
            }
        };

        return validatedData;
    }

    // Save data to MongoDB
    static async saveToDatabase(data) {
        try {
            const validatedData = this.validateData(data);
            const userInfo = new UserInfoModel(validatedData);
            const savedData = await userInfo.save();
            
            console.log(`💾 User info saved to database with ID: ${savedData._id}`);
            return savedData;
        } catch (error) {
            console.error('❌ Error saving to database:', error.message);
            throw error;
        }
    }

    // Get all user info records
    static async getAllRecords(limit = 100, skip = 0) {
        try {
            const records = await UserInfoModel
                .find({})
                .sort({ timestamp: -1 })
                .limit(limit)
                .skip(skip)
                .lean();
            
            return records;
        } catch (error) {
            console.error('❌ Error fetching records:', error.message);
            throw error;
        }
    }

    // Get records by IP
    static async getRecordsByIP(ip, limit = 50) {
        try {
            const records = await UserInfoModel
                .find({ 'network.ip': ip })
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
            
            return records;
        } catch (error) {
            console.error('❌ Error fetching records by IP:', error.message);
            throw error;
        }
    }

    // Get statistics
    static async getStatistics() {
        try {
            const totalRecords = await UserInfoModel.countDocuments();
            const uniqueIPs = await UserInfoModel.distinct('network.ip');
            const topCountries = await UserInfoModel.aggregate([
                { $group: { _id: '$geolocation.country', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            const topBrowsers = await UserInfoModel.aggregate([
                { $group: { _id: '$browser.name', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            return {
                totalRecords,
                uniqueIPs: uniqueIPs.length,
                topCountries,
                topBrowsers
            };
        } catch (error) {
            console.error('❌ Error fetching statistics:', error.message);
            throw error;
        }
    }

    // Convert to JSON format for response
    toJSON() {
        return {
            timestamp: this.timestamp,
            network: this.network,
            device: this.device,
            geolocation: this.geolocation,
            browser: this.browser,
            system: this.system
        };
    }

    // Get a summary of the user info
    getSummary() {
        return {
            timestamp: this.timestamp,
            ip: this.network.ip,
            country: this.geolocation.country,
            city: this.geolocation.city,
            browser: `${this.browser.name} ${this.browser.version}`,
            os: `${this.system.os} ${this.system.osVersion}`,
            device: this.device.type
        };
    }
}

module.exports = { UserInfo, UserInfoModel };
