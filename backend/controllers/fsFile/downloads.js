const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const mongoose = require('mongoose');


// 1. DOWNLOAD / STREAM FILE BY ID
const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "File not found" });
        }

        const file = files[0];
        res.set('Content-Type', file.metadata?.contentType || 'application/octet-stream');
        res.set('Content-Disposition', `inline; filename="${file.filename}"`);

        // Pipe GridFS download stream directly to Express HTTP response
        const downloadStream = bucket.openDownloadStream(_id);
        downloadStream.pipe(res);

        // *Verification:* Requesting this endpoint streams the complete file back to the browser.
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


module.exports = {
    downloadFile,
};