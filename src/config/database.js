const mongoose = require('mongoose');

class Database {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            if (this.connection) {
                return this.connection;
            }

            const mongoUri = process.env.MONGODB_URI;
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not defined');
            }

            // Connection options
            const options = {
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
                retryWrites: true // Automatically retry write operations on network errors
            };

            this.connection = await mongoose.connect(mongoUri, options);
            
            console.log('✅ Successfully connected to MongoDB');
            console.log(`📊 Database: ${process.env.DB_NAME}`);
            console.log(`📦 Collection: ${process.env.COLLECTION_NAME}`);
            
            return this.connection;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                console.log('✅ Disconnected from MongoDB');
            }
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
        }
    }

    getConnection() {
        return this.connection;
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
