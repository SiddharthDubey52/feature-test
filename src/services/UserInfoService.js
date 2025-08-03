const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const axios = require('axios');
const useragent = require('useragent');
const MobileDetect = require('mobile-detect');
const fastGeoip = require('fast-geoip');
const DeviceDetector = require('device-detector-js');

class UserInfoService {
    static async collectUserInfo(req, frontendData = {}) {
        const userAgent = req.headers['user-agent'] || '';
        
        // Extract real IP (demo mode is handled inside extractRealIP)
        const ip = this.extractRealIP(req);
        
        console.log(`🔍 Processing request for IP: ${ip}`);
        console.log(`📱 User-Agent: ${userAgent}`);
        
        const [networkInfo, deviceInfo, geolocation, browserInfo, systemInfo, fingerprint, securityInfo] = await Promise.all([
            this.extractNetworkInfo(req, ip),
            this.extractAdvancedDeviceInfo(userAgent, frontendData),
            this.extractPreciseGeolocation(ip),
            this.extractAdvancedBrowserInfo(userAgent),
            this.extractSystemInfo(userAgent),
            this.generateDeviceFingerprint(req, userAgent, frontendData),
            this.extractSecurityInfo(req, ip)
        ]);

        const timestamp = new Date().toISOString();

        return {
            timestamp,
            network: networkInfo,
            device: deviceInfo,
            geolocation,
            browser: browserInfo,
            system: systemInfo,
            fingerprint,
            security: securityInfo,
            tracking: {
                sessionId: this.generateSessionId(req),
                visitCount: await this.getVisitCount(ip),
                firstSeen: await this.getFirstSeen(ip),
                lastSeen: timestamp,
                referrer: req.headers.referer || null,
                userBehavior: this.analyzeUserBehavior(req, frontendData)
            }
        };
    }

    static extractRealIP(req) {
        // Check if demo mode is enabled
        if (req.headers['x-demo-mode'] === 'true') {
            return '8.8.8.8'; // Use Google's DNS for demo
        }
        
        return requestIp.getClientIp(req) || 
               req.headers['cf-connecting-ip'] || 
               req.headers['x-real-ip'] || 
               req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.ip ||
               '127.0.0.1';
    }

    static async extractNetworkInfo(req, overrideIp = null) {
        const ip = overrideIp || this.extractRealIP(req);
        
        return {
            ip,
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            acceptEncoding: req.headers['accept-encoding'],
            acceptCharset: req.headers['accept-charset'],
            accept: req.headers['accept'],
            connection: req.headers.connection,
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer,
            xForwardedFor: req.headers['x-forwarded-for'],
            xRealIp: req.headers['x-real-ip'],
            xForwardedProto: req.headers['x-forwarded-proto'],
            xForwardedHost: req.headers['x-forwarded-host'],
            authorization: req.headers.authorization ? 'Present (Hidden)' : null,
            cookie: req.headers.cookie ? 'Present (Hidden)' : null,
            cacheControl: req.headers['cache-control'],
            dnt: req.headers['dnt'], // Do Not Track
            upgradeInsecureRequests: req.headers['upgrade-insecure-requests'],
            secFetchSite: req.headers['sec-fetch-site'],
            secFetchMode: req.headers['sec-fetch-mode'],
            secFetchUser: req.headers['sec-fetch-user'],
            secFetchDest: req.headers['sec-fetch-dest'],
            // Connection analysis
            protocol: req.protocol,
            secure: req.secure,
            method: req.method,
            url: req.url,
            httpVersion: req.httpVersion,
            // Proxy detection
            proxyDetection: this.detectProxy(req),
            // Network timing (if available from frontend)
            networkTiming: this.extractNetworkTiming(req.headers)
        };
    }

    static async extractAdvancedDeviceInfo(userAgent, frontendData = {}) {
        try {
            const uaParser = new UAParser(userAgent);
            const uaResult = uaParser.getResult();
            const useragentParsed = useragent.parse(userAgent);
            const mobileDetect = new MobileDetect(userAgent);
            const deviceDetector = new DeviceDetector();
            const deviceResult = deviceDetector.parse(userAgent);

            let deviceType = 'desktop';
            if (mobileDetect.mobile()) {
                deviceType = mobileDetect.tablet() ? 'tablet' : 'mobile';
            } else if (uaResult.device.type) {
                deviceType = uaResult.device.type;
            }

            let vendor = 'Unknown';
            let model = 'Unknown';
            
            if (deviceResult.device) {
                vendor = deviceResult.device.brand || vendor;
                model = deviceResult.device.model || model;
            } else if (uaResult.device.vendor) {
                vendor = uaResult.device.vendor;
                model = uaResult.device.model || model;
            }

            const devicePatterns = this.analyzeUserAgentPatterns(userAgent);
            if (devicePatterns.vendor !== 'Unknown') vendor = devicePatterns.vendor;
            if (devicePatterns.model !== 'Unknown') model = devicePatterns.model;

            const deviceInfo = {
                type: deviceType,
                vendor,
                model,
                isMobile: mobileDetect.mobile() !== null,
                isTablet: mobileDetect.tablet() !== null,
                isDesktop: !mobileDetect.mobile(),
                
                // Use frontend data when available, otherwise infer
                screenResolution: frontendData.screenResolution || this.inferScreenResolution(userAgent, deviceType),
                colorDepth: frontendData.colorDepth || 24,
                pixelRatio: frontendData.pixelRatio || this.inferPixelRatio(userAgent),
                timezone: frontendData.timezone || 'UTC',
                language: frontendData.language || 'en-US',
                platform: frontendData.platform || uaResult.os.name,
                cookieEnabled: frontendData.cookieEnabled !== undefined ? frontendData.cookieEnabled : true,
                onlineStatus: frontendData.onlineStatus !== undefined ? frontendData.onlineStatus : true,
                hardwareConcurrency: frontendData.hardwareConcurrency || this.inferCores(vendor, model),
                deviceMemory: frontendData.deviceMemory || this.inferMemory(deviceType, vendor),
                maxTouchPoints: frontendData.maxTouchPoints || (deviceType === 'mobile' ? 10 : 0),
                touchSupport: frontendData.touchSupport !== undefined ? frontendData.touchSupport : (deviceType !== 'desktop'),
                
                // Browser-based geolocation data (high precision)
                browserLocation: frontendData.browserLocation || null,
                
                // Battery information - Smart estimation without permissions
                batteryLevel: this.estimateBatteryLevel(userAgent, deviceType, vendor, model),
                batteryCharging: this.estimateChargingStatus(userAgent, deviceType),
                batteryChargingTime: null, // Cannot estimate without API
                batteryDischargingTime: this.estimateRemainingTime(userAgent, deviceType, vendor),
                batteryEstimated: true // Flag to indicate this is estimated data
            };
            
            return deviceInfo;
        } catch (error) {
            console.error('Error extracting device info:', error);
            return {
                type: 'unknown',
                vendor: 'Unknown',
                model: 'Unknown',
                error: error.message
            };
        }
    }

    static analyzeUserAgentPatterns(userAgent) {
        const patterns = {
            'iPhone15': { vendor: 'Apple', model: 'iPhone 15' },
            'iPhone14': { vendor: 'Apple', model: 'iPhone 14' },
            'iPhone13': { vendor: 'Apple', model: 'iPhone 13' },
            'iPhone': { vendor: 'Apple', model: 'iPhone' },
            'iPad': { vendor: 'Apple', model: 'iPad' },
            'Macintosh': { vendor: 'Apple', model: 'Mac' },
            'SM-S': { vendor: 'Samsung', model: 'Galaxy S' },
            'Galaxy': { vendor: 'Samsung', model: 'Galaxy' },
            'Pixel': { vendor: 'Google', model: 'Pixel' },
            'OnePlus': { vendor: 'OnePlus', model: 'OnePlus' },
            'HUAWEI': { vendor: 'Huawei', model: 'Huawei' },
            'Windows NT': { vendor: 'Microsoft', model: 'Windows' }
        };

        for (const [pattern, info] of Object.entries(patterns)) {
            if (userAgent.includes(pattern)) {
                return info;
            }
        }
        return { vendor: 'Unknown', model: 'Unknown' };
    }

    static inferScreenResolution(userAgent, deviceType) {
        if (userAgent.includes('iPhone15')) return '1179x2556';
        if (userAgent.includes('iPhone14')) return '1170x2532';
        if (userAgent.includes('iPhone')) return '828x1792';
        if (userAgent.includes('iPad')) return '1668x2388';
        if (deviceType === 'mobile') return '360x800';
        if (deviceType === 'tablet') return '768x1024';
        return '1920x1080';
    }

    static inferPixelRatio(userAgent) {
        if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 3;
        if (userAgent.includes('Android')) return 2;
        return 1;
    }

    static inferCores(vendor, model) {
        if (vendor === 'Apple') {
            if (model.includes('15') || model.includes('14')) return 6; // A17/A16 chips
            if (model.includes('13') || model.includes('12')) return 6; // A15/A14 chips
            return 4; // Older Apple devices
        }
        if (vendor === 'Google' && model.includes('Pixel')) return 8; // Tensor chips
        if (vendor === 'Samsung') return 8; // Snapdragon/Exynos
        return 4; // Default mobile
    }

    static inferMemory(deviceType, vendor) {
        if (deviceType === 'desktop') return 16;
        if (vendor === 'Apple') {
            return 6; // iPhones typically have 6GB+ now
        }
        if (vendor === 'Samsung') return 8; // Samsung flagships
        if (vendor === 'Google') return 8; // Pixel phones
        if (deviceType === 'tablet') return 4;
        return 4; // Default mobile
    }

    // Smart battery estimation without permissions
    static estimateBatteryLevel(userAgent, deviceType, vendor, model) {
        // Base estimation on device type and typical usage patterns
        let baseBattery = 70; // Default assumption
        
        // Desktop/laptop users often have power nearby
        if (deviceType === 'desktop') {
            baseBattery = Math.floor(Math.random() * 40) + 60; // 60-100%
        }
        
        // Mobile device patterns
        if (deviceType === 'mobile') {
            const hour = new Date().getHours();
            
            // Time-based estimation (people charge at night, use during day)
            if (hour >= 0 && hour <= 6) {
                baseBattery = Math.floor(Math.random() * 30) + 70; // 70-100% (likely charging at night)
            } else if (hour >= 7 && hour <= 12) {
                baseBattery = Math.floor(Math.random() * 40) + 50; // 50-90% (morning usage)
            } else if (hour >= 13 && hour <= 18) {
                baseBattery = Math.floor(Math.random() * 50) + 30; // 30-80% (afternoon drain)
            } else {
                baseBattery = Math.floor(Math.random() * 60) + 20; // 20-80% (evening usage)
            }
            
            // Newer devices tend to have better battery
            if (vendor === 'Apple') {
                if (model.includes('15') || model.includes('14')) baseBattery += 10;
                if (model.includes('13') || model.includes('12')) baseBattery += 5;
            }
            if (vendor === 'Samsung' || vendor === 'Google') {
                baseBattery += 5; // Flagship devices
            }
        }
        
        // Tablet users often use devices plugged in
        if (deviceType === 'tablet') {
            baseBattery = Math.floor(Math.random() * 35) + 65; // 65-100%
        }
        
        // Ensure battery is within realistic range
        return Math.min(100, Math.max(15, baseBattery));
    }

    static estimateChargingStatus(userAgent, deviceType) {
        // Desktop/laptops are often plugged in
        if (deviceType === 'desktop') {
            return Math.random() > 0.3; // 70% chance of being plugged in
        }
        
        // Mobile charging patterns based on time
        const hour = new Date().getHours();
        
        if (hour >= 0 && hour <= 6) {
            return Math.random() > 0.2; // 80% chance charging at night
        } else if (hour >= 9 && hour <= 17) {
            return Math.random() > 0.8; // 20% chance charging during work hours
        } else {
            return Math.random() > 0.6; // 40% chance charging evening/morning
        }
    }

    static estimateRemainingTime(userAgent, deviceType, vendor) {
        // Only estimate for mobile devices (minutes)
        if (deviceType !== 'mobile') return null;
        
        const hour = new Date().getHours();
        let baseTime = 300; // 5 hours default
        
        // Time-based estimation
        if (hour >= 0 && hour <= 6) {
            baseTime = Math.floor(Math.random() * 600) + 480; // 8-18 hours (night)
        } else if (hour >= 7 && hour <= 12) {
            baseTime = Math.floor(Math.random() * 300) + 360; // 6-11 hours (morning)
        } else if (hour >= 13 && hour <= 18) {
            baseTime = Math.floor(Math.random() * 240) + 180; // 3-7 hours (afternoon)
        } else {
            baseTime = Math.floor(Math.random() * 360) + 120; // 2-8 hours (evening)
        }
        
        // Better devices last longer
        if (vendor === 'Apple') {
            baseTime *= 1.2; // Apple devices typically have good battery life
        }
        if (vendor === 'Samsung' || vendor === 'Google') {
            baseTime *= 1.1; // Flagship Android devices
        }
        
        return Math.floor(baseTime);
    }

    static async extractPreciseGeolocation(ip) {
        try {
            if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
                return {
                    country: 'Local',
                    region: 'Local',
                    city: 'Local',
                    latitude: null,
                    longitude: null,
                    timezone: 'Local',
                    isp: 'Local Network',
                    organization: 'Local Network',
                    source: 'local'
                };
            }

            console.log(`🌍 Getting location for IP: ${ip}`);
            
            const results = await Promise.allSettled([
                this.getLocationFromIpapi(ip),
                this.getLocationFromIpinfo(ip),
                this.getLocationFromFastGeoip(ip),
                this.getLocationFromGeoipLite(ip)
            ]);

            let bestResult = null;
            let bestScore = 0;

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    const score = this.scoreGeolocationResult(result.value);
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = result.value;
                    }
                }
            }

            return bestResult || {
                country: 'Unknown',
                region: 'Unknown',
                city: 'Unknown',
                latitude: null,
                longitude: null,
                timezone: 'Unknown',
                isp: 'Unknown',
                organization: 'Unknown',
                source: 'none'
            };

        } catch (error) {
            console.error('Error extracting geolocation:', error);
            return {
                country: 'Unknown',
                region: 'Unknown', 
                city: 'Unknown',
                latitude: null,
                longitude: null,
                timezone: 'Unknown',
                isp: 'Unknown',
                organization: 'Unknown',
                source: 'error',
                error: error.message
            };
        }
    }

    static async getLocationFromIpapi(ip) {
        try {
            const response = await axios.get(`http://ipapi.co/${ip}/json/`, {
                timeout: 3000,
                headers: { 'User-Agent': 'Mozilla/5.0 UserInfoAPI/1.0' }
            });
            
            const data = response.data;
            if (data.error) throw new Error(data.reason);
            
            return {
                country: data.country_name,
                countryCode: data.country_code,
                region: data.region,
                city: data.city,
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                timezone: data.timezone,
                isp: data.org,
                organization: data.org,
                postal: data.postal,
                source: 'ipapi.co'
            };
        } catch (error) {
            console.error('ipapi.co failed:', error.message);
            return null;
        }
    }

    static async getLocationFromIpinfo(ip) {
        try {
            const response = await axios.get(`https://ipinfo.io/${ip}/json`, {
                timeout: 3000,
                headers: { 'User-Agent': 'Mozilla/5.0 UserInfoAPI/1.0' }
            });
            
            const data = response.data;
            if (!data.loc) return null;
            
            const [lat, lon] = data.loc.split(',').map(parseFloat);
            
            return {
                country: data.country,
                region: data.region,
                city: data.city,
                latitude: lat,
                longitude: lon,
                timezone: data.timezone,
                isp: data.org,
                organization: data.org,
                postal: data.postal,
                source: 'ipinfo.io'
            };
        } catch (error) {
            console.error('ipinfo.io failed:', error.message);
            return null;
        }
    }

    static async getLocationFromFastGeoip(ip) {
        try {
            const geo = await fastGeoip.lookup(ip);
            if (!geo) return null;
            
            return {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                latitude: geo.ll ? geo.ll[0] : null,
                longitude: geo.ll ? geo.ll[1] : null,
                timezone: geo.timezone,
                isp: geo.area,
                organization: geo.area,
                source: 'fast-geoip'
            };
        } catch (error) {
            console.error('fast-geoip failed:', error.message);
            return null;
        }
    }

    static getLocationFromGeoipLite(ip) {
        try {
            const geo = geoip.lookup(ip);
            if (!geo) return null;
            
            return {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                latitude: geo.ll ? geo.ll[0] : null,
                longitude: geo.ll ? geo.ll[1] : null,
                timezone: geo.timezone,
                isp: 'Unknown',
                organization: 'Unknown',
                source: 'geoip-lite'
            };
        } catch (error) {
            console.error('geoip-lite failed:', error.message);
            return null;
        }
    }

    static scoreGeolocationResult(result) {
        let score = 0;
        if (result.country && result.country !== 'Unknown') score += 1;
        if (result.region && result.region !== 'Unknown') score += 1;
        if (result.city && result.city !== 'Unknown') score += 1;
        if (result.latitude && result.longitude) score += 3;
        if (result.timezone && result.timezone !== 'Unknown') score += 1;
        if (result.isp && result.isp !== 'Unknown') score += 1;
        return score;
    }

    static async extractAdvancedBrowserInfo(userAgent) {
        try {
            const uaParser = new UAParser(userAgent);
            const result = uaParser.getResult();
            const useragentParsed = useragent.parse(userAgent);
            
            return {
                name: result.browser.name || useragentParsed.family || 'unknown',
                version: result.browser.version || useragentParsed.toVersion() || 'unknown',
                major: result.browser.major || useragentParsed.major || 'unknown',
                engine: result.engine.name || 'unknown',
                engineVersion: result.engine.version || 'unknown',
                isWebView: userAgent.includes('wv') || userAgent.includes('WebView'),
                isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
                isBot: /bot|crawler|spider|scraper/i.test(userAgent)
            };
        } catch (error) {
            console.error('Error extracting browser info:', error);
            return {
                name: 'unknown',
                version: 'unknown',
                engine: 'unknown',
                engineVersion: 'unknown',
                error: error.message
            };
        }
    }

    static extractSystemInfo(userAgent) {
        try {
            const uaParser = new UAParser(userAgent);
            const result = uaParser.getResult();
            const useragentParsed = useragent.parse(userAgent);
            
            return {
                os: result.os.name || useragentParsed.os.family || 'unknown',
                osVersion: result.os.version || useragentParsed.os.toVersion() || 'unknown',
                architecture: result.cpu.architecture || 'unknown',
                cpu: result.cpu.architecture || 'unknown'
            };
        } catch (error) {
            console.error('Error extracting system info:', error);
            return {
                os: 'unknown',
                osVersion: 'unknown',
                architecture: 'unknown',
                cpu: 'unknown',
                error: error.message
            };
        }
    }

    static generateSummary(data) {
        const { network, device, geolocation, browser, system } = data;
        
        return {
            timestamp: data.timestamp,
            ip: network.ip,
            country: geolocation.country,
            region: geolocation.region,
            city: geolocation.city,
            coordinates: geolocation.latitude && geolocation.longitude ? 
                `${geolocation.latitude}, ${geolocation.longitude}` : null,
            browser: `${browser.name} ${browser.version}`,
            os: `${system.os} ${system.osVersion}`,
            device: `${device.vendor} ${device.model} (${device.type})`,
            isp: geolocation.isp,
            batteryLevel: device.batteryLevel,
            batteryCharging: device.batteryCharging
        };
    }

    // ========== ADVANCED TRACKING METHODS (Like IPLogger) ==========

    // Generate unique device fingerprint
    static generateDeviceFingerprint(req, userAgent, frontendData = {}) {
        const components = [
            userAgent,
            frontendData.screenResolution || 'unknown',
            frontendData.timezone || 'unknown',
            frontendData.language || req.headers['accept-language'] || 'unknown',
            frontendData.colorDepth || 'unknown',
            frontendData.pixelRatio || 'unknown',
            frontendData.hardwareConcurrency || 'unknown',
            frontendData.deviceMemory || 'unknown',
            req.headers['accept-encoding'] || 'unknown',
            req.headers['accept-language'] || 'unknown'
        ];

        const fingerprint = require('crypto')
            .createHash('sha256')
            .update(components.join('|'))
            .digest('hex');

        return {
            hash: fingerprint,
            components: {
                userAgent: !!userAgent,
                screen: !!frontendData.screenResolution,
                timezone: !!frontendData.timezone,
                language: !!frontendData.language,
                colorDepth: !!frontendData.colorDepth,
                hardware: !!(frontendData.hardwareConcurrency || frontendData.deviceMemory),
                headers: !!(req.headers['accept-encoding'] && req.headers['accept-language'])
            },
            confidence: this.calculateFingerprintConfidence(components),
            uniquenessScore: this.calculateUniquenessScore(components)
        };
    }

    static calculateFingerprintConfidence(components) {
        const definedComponents = components.filter(c => c && c !== 'unknown').length;
        return Math.round((definedComponents / components.length) * 100);
    }

    static calculateUniquenessScore(components) {
        // Simple uniqueness scoring based on entropy
        let score = 0;
        components.forEach(component => {
            if (component && component !== 'unknown') {
                score += component.length * 0.1;
            }
        });
        return Math.min(100, Math.round(score));
    }

    // Extract security-related information
    static extractSecurityInfo(req, ip) {
        return {
            isProxy: this.detectProxy(req).isProxy,
            isVPN: this.detectVPN(req, ip),
            isTor: this.detectTor(ip),
            isBot: this.detectBot(req.headers['user-agent']),
            threatLevel: this.calculateThreatLevel(req, ip),
            ssl: {
                protocol: req.protocol,
                secure: req.secure,
                cipher: req.connection?.getCipher?.() || null
            },
            headers: {
                hasXForwardedFor: !!req.headers['x-forwarded-for'],
                hasXRealIP: !!req.headers['x-real-ip'],
                hasVia: !!req.headers['via'],
                hasXOriginalIP: !!req.headers['x-original-ip'],
                suspiciousHeaders: this.findSuspiciousHeaders(req.headers)
            }
        };
    }

    static detectProxy(req) {
        const proxyHeaders = [
            'x-forwarded-for',
            'x-real-ip',
            'x-original-ip',
            'x-forwarded',
            'forwarded-for',
            'via',
            'client-ip',
            'x-client-ip',
            'x-cluster-client-ip'
        ];

        const detectedHeaders = proxyHeaders.filter(header => req.headers[header]);
        const isProxy = detectedHeaders.length > 0;

        return {
            isProxy,
            detectedHeaders,
            confidence: isProxy ? Math.min(100, detectedHeaders.length * 30) : 0,
            type: this.determineProxyType(req.headers)
        };
    }

    static determineProxyType(headers) {
        if (headers['via']) return 'HTTP Proxy';
        if (headers['x-forwarded-for']) return 'Load Balancer/Proxy';
        if (headers['cf-connecting-ip']) return 'Cloudflare';
        if (headers['x-real-ip']) return 'Reverse Proxy';
        return 'Unknown';
    }

    static detectVPN(req, ip) {
        // Simple VPN detection based on common patterns
        const userAgent = req.headers['user-agent'] || '';
        const vpnIndicators = [
            'VPN',
            'Proxy',
            'Anonymous',
            'Hide',
            'Private'
        ];

        const hasVpnIndicator = vpnIndicators.some(indicator => 
            userAgent.includes(indicator)
        );

        // Check for known VPN IP ranges (simplified)
        const isKnownVpnRange = this.checkVpnIpRanges(ip);

        return {
            likely: hasVpnIndicator || isKnownVpnRange,
            indicators: vpnIndicators.filter(indicator => userAgent.includes(indicator)),
            confidence: (hasVpnIndicator ? 30 : 0) + (isKnownVpnRange ? 70 : 0)
        };
    }

    static checkVpnIpRanges(ip) {
        // Simplified VPN detection - in production, use a VPN detection service
        const knownVpnRanges = [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16'
        ];
        
        // This is a basic implementation - you'd want a proper IP range checker
        return ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.');
    }

    static detectTor(ip) {
        // Tor detection would require a Tor exit node list
        // This is a placeholder - in production, check against Tor exit node lists
        return {
            isTor: false,
            confidence: 0,
            note: 'Tor detection requires exit node database'
        };
    }

    static detectBot(userAgent) {
        const botPatterns = [
            /bot/i, /crawler/i, /spider/i, /scraper/i,
            /google/i, /bing/i, /yahoo/i, /facebook/i,
            /twitter/i, /linkedin/i, /whatsapp/i,
            /curl/i, /wget/i, /python/i, /java/i,
            /postman/i, /insomnia/i, /httpie/i
        ];

        const matchedPatterns = botPatterns.filter(pattern => pattern.test(userAgent));

        return {
            isBot: matchedPatterns.length > 0,
            matchedPatterns: matchedPatterns.map(p => p.toString()),
            confidence: Math.min(100, matchedPatterns.length * 25),
            type: this.classifyBotType(userAgent)
        };
    }

    static classifyBotType(userAgent) {
        if (/google/i.test(userAgent)) return 'Search Engine (Google)';
        if (/bing/i.test(userAgent)) return 'Search Engine (Bing)';
        if (/facebook/i.test(userAgent)) return 'Social Media (Facebook)';
        if (/twitter/i.test(userAgent)) return 'Social Media (Twitter)';
        if (/curl|wget/i.test(userAgent)) return 'Command Line Tool';
        if (/postman|insomnia/i.test(userAgent)) return 'API Testing Tool';
        if (/python|java|node/i.test(userAgent)) return 'Programming Script';
        return 'Unknown Bot';
    }

    static calculateThreatLevel(req, ip) {
        let score = 0;
        let reasons = [];

        // Check proxy usage
        if (this.detectProxy(req).isProxy) {
            score += 30;
            reasons.push('Using proxy/VPN');
        }

        // Check bot detection
        if (this.detectBot(req.headers['user-agent']).isBot) {
            score += 40;
            reasons.push('Automated bot detected');
        }

        // Check suspicious headers
        const suspiciousHeaders = this.findSuspiciousHeaders(req.headers);
        if (suspiciousHeaders.length > 0) {
            score += suspiciousHeaders.length * 10;
            reasons.push('Suspicious headers present');
        }

        // Check for rapid requests (would need session tracking)
        // This is a placeholder for rate limiting logic

        let level = 'Low';
        if (score >= 70) level = 'High';
        else if (score >= 40) level = 'Medium';

        return {
            score,
            level,
            reasons,
            recommendation: this.getThreatRecommendation(level)
        };
    }

    static findSuspiciousHeaders(headers) {
        const suspicious = [];
        
        // Check for multiple proxy headers (chain)
        const proxyHeaders = ['x-forwarded-for', 'x-real-ip', 'via'];
        const proxyCount = proxyHeaders.filter(h => headers[h]).length;
        if (proxyCount > 2) suspicious.push('Multiple proxy headers');

        // Check for automation tools
        if (headers['user-agent'] && /curl|wget|postman/i.test(headers['user-agent'])) {
            suspicious.push('Automation tool user agent');
        }

        // Check for missing common headers
        if (!headers['accept-language']) suspicious.push('Missing accept-language');
        if (!headers['accept-encoding']) suspicious.push('Missing accept-encoding');

        return suspicious;
    }

    static getThreatRecommendation(level) {
        switch (level) {
            case 'High': return 'Block or require additional verification';
            case 'Medium': return 'Monitor closely, consider rate limiting';
            case 'Low': return 'Allow with normal monitoring';
            default: return 'Continue monitoring';
        }
    }

    // Generate session ID for tracking
    static generateSessionId(req) {
        const components = [
            req.headers['user-agent'] || '',
            req.connection.remoteAddress || '',
            Date.now().toString()
        ];
        
        return require('crypto')
            .createHash('md5')
            .update(components.join('|'))
            .digest('hex')
            .substring(0, 16);
    }

    // Analyze user behavior patterns
    static analyzeUserBehavior(req, frontendData = {}) {
        return {
            screenTime: frontendData.screenTime || null,
            clickPattern: frontendData.clickPattern || null,
            scrollBehavior: frontendData.scrollBehavior || null,
            keyboardEvents: frontendData.keyboardEvents || null,
            mouseMovement: frontendData.mouseMovement || null,
            pageVisibility: frontendData.pageVisibility || null,
            interactionScore: this.calculateInteractionScore(frontendData),
            behaviorFlags: this.detectBehaviorFlags(frontendData)
        };
    }

    static calculateInteractionScore(frontendData) {
        let score = 0;
        if (frontendData.clickPattern) score += 20;
        if (frontendData.scrollBehavior) score += 15;
        if (frontendData.keyboardEvents) score += 25;
        if (frontendData.mouseMovement) score += 20;
        if (frontendData.screenTime && frontendData.screenTime > 5000) score += 20;
        return Math.min(100, score);
    }

    static detectBehaviorFlags(frontendData) {
        const flags = [];
        
        if (frontendData.screenTime && frontendData.screenTime < 1000) {
            flags.push('Very short session');
        }
        
        if (!frontendData.mouseMovement && !frontendData.clickPattern) {
            flags.push('No user interaction detected');
        }
        
        if (frontendData.rapidClicks) {
            flags.push('Rapid clicking detected');
        }
        
        return flags;
    }

    // Network timing analysis
    static extractNetworkTiming(headers) {
        return {
            hasTimingData: false, // Would come from frontend Performance API
            note: 'Network timing requires frontend Performance API data'
        };
    }

    // Visit tracking (simplified - would need database)
    static async getVisitCount(ip) {
        // Placeholder - would query database for previous visits
        return Math.floor(Math.random() * 10) + 1;
    }

    static async getFirstSeen(ip) {
        // Placeholder - would query database for first visit
        const daysAgo = Math.floor(Math.random() * 30);
        const firstSeen = new Date();
        firstSeen.setDate(firstSeen.getDate() - daysAgo);
        return firstSeen.toISOString();
    }
}

module.exports = UserInfoService;

module.exports = UserInfoService;
