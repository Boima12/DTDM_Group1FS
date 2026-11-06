const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const mongoose = require('mongoose');


// 1. GET LIST OF ALL FILES METADATA
const getFilesInfo = async (req, res) => {
    try {
        const bucket = getGridBucket();
        const files = await bucket.find().toArray();
        res.status(StatusCodes.OK).json({ files });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


// 2. GET SPECIFIC FILE INFO
const getSpecificFileInfo = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate if id is a valid 24-character hex string first
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid ObjectId format" });
        }

        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "File not found" });
        }

        const file = files[0];

        // 1. Get MongoDB Connection Details
        const mongoInfo = {
            databaseName: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            readyState: mongoose.connection.readyState // 1 = connected
        };

        // 2. Get Render Environment Info
        const renderInfo = {
            instanceId: process.env.RENDER_INSTANCE_ID || 'local-dev',
            serviceId: process.env.RENDER_SERVICE_ID || 'local-dev',
            serviceName: process.env.RENDER_SERVICE_NAME || 'local-dev',
            region: process.env.RENDER_REGION || 'local-dev',
            nodeVersion: process.version
        };

        res.status(StatusCodes.OK).json({ 
            file,
            clusterInfo: mongoInfo,
            renderInfo
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


module.exports = {
    getFilesInfo,
    getSpecificFileInfo
};