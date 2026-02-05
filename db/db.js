const { MongoClient } = require('mongodb');

// Connect to MongoDB
const uri = process.env.mongo_host;
const defaultDbName = 'test'; // Default database (backward compatibility)

let mongoClient;
const dbCache = new Map(); // Cache database connections

/**
 * Initialize MongoDB client connection
 * This should be called once at application startup
 */
async function connectToMongo() {
    if (mongoClient) {
        console.log('MongoDB client already connected');
        return mongoClient;
    }

    try {
        // Create a single Mongo client for all tenants
        mongoClient = new MongoClient(uri, {
            useUnifiedTopology: true,
            maxPoolSize: 50, // Increase pool size for multiple databases
            minPoolSize: 10
        });
        
        await mongoClient.connect();
        console.log('MongoDB client connected successfully');
        
        // Connect to default database for backward compatibility
        const defaultDb = mongoClient.db(defaultDbName);
        global.db = defaultDb; // Keep global.db for legacy code
        
        return mongoClient;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

/**
 * Get database instance for a specific tenant
 * Uses caching to avoid creating multiple connections
 * 
 * @param {string} dbName - Database name for the tenant
 * @returns {Db} MongoDB database instance
 */
function getTenantDb(dbName) {
    if (!mongoClient) {
        throw new Error('MongoDB client not connected. Call connectToMongo first.');
    }

    // Return cached database connection if exists
    if (dbCache.has(dbName)) {
        return dbCache.get(dbName);
    }

    // Create new database connection and cache it
    const db = mongoClient.db(dbName);
    dbCache.set(dbName, db);
    console.log(`Created database connection for: ${dbName}`);
    
    return db;
}

/**
 * Get default database (for backward compatibility)
 * @returns {Db} Default database instance
 */
function getDb() {
    if (!mongoClient) {
        throw new Error('MongoDB client not connected. Call connectToMongo first.');
    }
    return getTenantDb(defaultDbName);
}

/**
 * Get database from request object (tenant-aware)
 * Automatically extracts tenant database from req.tenant
 * 
 * @param {Request} req - Express request object with tenant info
 * @returns {Db} Tenant-specific database instance
 */
function getDbFromRequest(req) {
    if (!mongoClient) {
        throw new Error('MongoDB client not connected. Call connectToMongo first.');
    }

    // Debug logging with stack trace
    const stack = new Error().stack.split('\n')[2].trim();
    console.log(`getDbFromRequest called from: ${stack}`);
    console.log('  req exists:', !!req);
    console.log('  req.tenant exists:', !!req?.tenant);
    console.log('  req.tenant.dbName:', req?.tenant?.dbName);

    // If tenant info is attached to request, use tenant's database
    if (req && req.tenant && req.tenant.dbName) {
        console.log(`✅ Using tenant database: ${req.tenant.dbName}`);
        return getTenantDb(req.tenant.dbName);
    }

    // Fallback to default database
    console.warn('❌ No tenant info found in request, using default database');
    return getDb();
}

/**
 * Close MongoDB connection
 */
async function closeMongo() {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        dbCache.clear();
        console.log('MongoDB connection closed');
    }
}

/**
 * List all databases (admin function)
 */
async function listDatabases() {
    if (!mongoClient) {
        throw new Error('MongoDB client not connected. Call connectToMongo first.');
    }

    const adminDb = mongoClient.db().admin();
    const result = await adminDb.listDatabases();
    return result.databases;
}

module.exports = { 
    connectToMongo, 
    getDb, 
    getTenantDb,
    getDbFromRequest,
    closeMongo,
    listDatabases
};