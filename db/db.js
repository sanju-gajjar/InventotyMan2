const { MongoClient } = require('mongodb');

// Connect to MongoDB
const uri = process.env.mongo_host;
const dbName = 'inventoryman';

let db;

async function connectToMongo() {
    // Create a Mongo client with updated options
    const client = new MongoClient(uri, {
        useUnifiedTopology: true
    });
    await client.connect();
    db = client.db(dbName);
    global.db = db; // Make db available globally
    console.log('Db connected');
    return db;
}

function getDb() {
    if (!db) {
        throw new Error('Database not connected. Call connectToMongo first.');
    }
    return db;
}

module.exports = { connectToMongo, getDb };