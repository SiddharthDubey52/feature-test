const app = require('./src/app');
const database = require('./src/config/database');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 User info endpoint: http://localhost:${PORT}/api/user-info`);
    console.log(`📊 Records endpoint: http://localhost:${PORT}/api/user-info/records`);
    console.log(`📈 Statistics endpoint: http://localhost:${PORT}/api/user-info/statistics`);
    console.log(`🧪 Smart test page: http://localhost:${PORT}/smart-test.html`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await database.disconnect();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(async () => {
        await database.disconnect();
        process.exit(0);
    });
});
