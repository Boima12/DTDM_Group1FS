const mongoose = require("mongoose");

let gridBucket;

const connectDB = (url) => {
    return mongoose.connect(url, {
        dbName: 'GROUP1FS'
    }).then((conn) => {
        console.log("Connected to MongoDB");

        // Create GridFS Bucket using the active mongoose connection db
        gridBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
            bucketName: 'fs' // Default bucket name
        });
        return conn;
        
    }).catch((err) => console.log(err));
};

const getGridBucket = () => {
    if (!gridBucket) {
        throw new Error("GridFSBucket is not initialized yet.");
    }
    return gridBucket;
};

module.exports = { connectDB, getGridBucket };