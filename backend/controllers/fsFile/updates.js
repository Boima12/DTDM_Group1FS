const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const { getMetadataFromFilename } = require('../../utils/fileHelpers.js');
const mongoose = require('mongoose');


// 1. RENAME FILE BY ID
const renameFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { filename } = req.body;

        if (!filename) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: "New filename is required" });
        }

        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "File not found" });
        }

        await bucket.rename(_id, filename);

        const { extension, contentType, category, previewable } = getMetadataFromFilename(filename);

        const filesCollection = mongoose.connection.db.collection(`${bucket.s.options.bucketName}.files`);
            await filesCollection.updateOne(
                { _id },
                {
                    $set: {
                        'metadata.originalName': filename,
                        'metadata.extension': extension,
                        'metadata.contentType': contentType,
                        'metadata.category': category,
                        'metadata.previewable': previewable,
                    },
                }
            );

            res.status(StatusCodes.OK).json({
                msg: "File renamed successfully",
                newFilename: filename,
                metadata: {
                    originalName: filename,
                    extension,
                    contentType,
                    category,
                    previewable,
                },
            }
        );
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


// 2. MARK FILES AS TRASH (markAsTrash: true) BY ID
const markFilesAsTrash = async (req, res) => {
    try {
        const { ids } = req.body;
        const _ids = ids.map(id => mongoose.Types.ObjectId.createFromHexString(id));
        const bucket = getGridBucket();

        await bucket.s._filesCollection.updateMany(
            { _id: { $in: _ids } },
            {
                $set: {
                    'metadata.markAsTrash': true,
                    'metadata.markAsTrashDate': new Date(),
                },
            }
        );

        res.status(StatusCodes.OK).json({ msg: "Files marked as trash successfully" });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


// 3. DELETE FILE BY ID
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        await bucket.delete(_id);
        res.status(StatusCodes.OK).json({ msg: "File deleted successfully" });

        // *Verification:* Querying bucket.find({ _id }) returns an empty array after execution.
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};


module.exports = {
    renameFile,
    deleteFile,
    markFilesAsTrash
};