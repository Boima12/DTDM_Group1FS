const mongoose = require('mongoose');

const fsFileSchema = new mongoose.Schema({
    FSfileName: {
        type: String,
        required: true,
    },
    FSfileDescription: {
        type: String,
        required: true,
    },
})

module.exports = mongoose.model('FsFile', fsFileSchema)