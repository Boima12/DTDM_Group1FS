const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Folder',
            default: null,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        color: {
            type: String,
            default: '#007a5c',
        },
        isTrash: {
            type: Boolean,
            default: false,
            index: true,
        },
        trashDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

folderSchema.index({ ownerId: 1, parentId: 1, isTrash: 1 });

module.exports = mongoose.model('Folder', folderSchema);
