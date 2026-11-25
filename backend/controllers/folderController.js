const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const Folder = require('../models/Folder.js');
const { isValidFilename } = require('../utils/fileHelpers.js');
const {
    buildFolderOwnerFilter,
    buildFileOwnerFilter,
    getFilesCollection,
} = require('../utils/gridfsHelpers.js');
const { logAudit } = require('../utils/auditLogger.js');

const listFolders = async (req, res, next) => {
    try {
        const { parentId, all, trash } = req.query;
        const isTrash = trash === 'true';

        const filter = {
            ...buildFolderOwnerFilter(req.user),
            isTrash,
        };

        if (all !== 'true' && !isTrash) {
            if (!parentId || parentId === 'root' || parentId === 'null') {
                filter.parentId = null;
            } else if (mongoose.Types.ObjectId.isValid(parentId)) {
                filter.parentId = mongoose.Types.ObjectId.createFromHexString(parentId);
            } else {
                return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid parentId.' });
            }
        }

        const folders = await Folder.find(filter).sort({ name: 1 }).lean();

        // Compute direct item counts per folder in parallel
        const filesCol = getFilesCollection();
        const folderIds = folders.map((f) => f._id);

        const [fileCounts, subFolderCounts] = await Promise.all([
            folderIds.length > 0
                ? filesCol
                      .aggregate([
                          {
                              $match: {
                                  ...buildFileOwnerFilter(req.user),
                                  'metadata.markAsTrash': false,
                                  'metadata.isLatestVersion': { $ne: false },
                                  'metadata.folderId': { $in: folderIds },
                              },
                          },
                          { $group: { _id: '$metadata.folderId', count: { $sum: 1 }, totalSize: { $sum: '$length' } } },
                      ])
                      .toArray()
                : [],
            folderIds.length > 0
                ? Folder.aggregate([
                      {
                          $match: {
                              ...buildFolderOwnerFilter(req.user),
                              isTrash: false,
                              parentId: { $in: folderIds },
                          },
                      },
                      { $group: { _id: '$parentId', count: { $sum: 1 } } },
                  ])
                : [],
        ]);

        const fileMap = new Map(fileCounts.map((c) => [String(c._id), c]));
        const subMap = new Map(subFolderCounts.map((c) => [String(c._id), c.count]));

        const enriched = folders.map((folder) => {
            const fid = String(folder._id);
            const fStats = fileMap.get(fid);
            return {
                ...folder,
                _id: fid,
                parentId: folder.parentId ? String(folder.parentId) : null,
                fileCount: fStats?.count || 0,
                totalSize: fStats?.totalSize || 0,
                subFolderCount: subMap.get(fid) || 0,
            };
        });

        return res.status(StatusCodes.OK).json({ folders: enriched });
    } catch (err) {
        return next(err);
    }
};

const getBreadcrumb = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || id === 'root') {
            return res.status(StatusCodes.OK).json({ path: [] });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid folder ID.' });
        }

        const ownerFilter = buildFolderOwnerFilter(req.user);
        const trail = [];
        let currentId = mongoose.Types.ObjectId.createFromHexString(id);
        const visited = new Set();

        while (currentId && trail.length < 20) {
            const key = currentId.toString();
            if (visited.has(key)) break;
            visited.add(key);

            const folder = await Folder.findOne({ _id: currentId, ...ownerFilter }).lean();
            if (!folder) break;
            trail.unshift({
                _id: folder._id.toString(),
                name: folder.name,
                color: folder.color,
            });
            currentId = folder.parentId || null;
        }

        return res.status(StatusCodes.OK).json({ path: trail });
    } catch (err) {
        return next(err);
    }
};

const createFolder = async (req, res, next) => {
    try {
        const { name, parentId = null, color = '#007a5c' } = req.body || {};
        if (!isValidFilename(name)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                msg: 'Folder name is required and must not contain invalid special characters.',
            });
        }

        let parentObjectId = null;
        if (parentId && parentId !== 'root') {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid parent folder ID.' });
            }
            const parentFolder = await Folder.findOne({
                _id: parentId,
                ...buildFolderOwnerFilter(req.user),
                isTrash: false,
            });
            if (!parentFolder) {
                return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Parent folder not found.' });
            }
            parentObjectId = parentFolder._id;
        }

        const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#007a5c';
        const folder = await Folder.create({
            name: name.trim(),
            parentId: parentObjectId,
            ownerId: req.user?.id ? mongoose.Types.ObjectId.createFromHexString(req.user.id) : null,
            color: safeColor,
        });

        await logAudit({
            action: 'FOLDER_CREATE',
            targetType: 'folder',
            targetId: folder._id,
            targetName: folder.name,
            details: { parentId: parentObjectId ? parentObjectId.toString() : null },
            req,
        });

        return res.status(StatusCodes.CREATED).json({
            msg: `Folder "${folder.name}" created.`,
            folder: {
                ...folder.toObject(),
                _id: folder._id.toString(),
                parentId: folder.parentId ? folder.parentId.toString() : null,
                fileCount: 0,
                subFolderCount: 0,
                totalSize: 0,
            },
        });
    } catch (err) {
        return next(err);
    }
};

const renameFolder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body || {};

        if (!isValidFilename(name)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid folder name.' });
        }

        const updates = { name: name.trim() };
        if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
            updates.color = color;
        }

        const folder = await Folder.findOneAndUpdate(
            { _id: id, ...buildFolderOwnerFilter(req.user) },
            { $set: updates },
            { new: true }
        );
        if (!folder) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Folder not found.' });
        }

        await logAudit({
            action: 'FOLDER_RENAME',
            targetType: 'folder',
            targetId: folder._id,
            targetName: folder.name,
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: 'Folder updated successfully.',
            folder,
        });
    } catch (err) {
        return next(err);
    }
};

const deleteFolder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ownerFilter = buildFolderOwnerFilter(req.user);

        const folder = await Folder.findOne({ _id: id, ...ownerFilter });
        if (!folder) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Folder not found.' });
        }

        // Collect folder + all nested subfolders iteratively
        const folderIds = [folder._id];
        let frontier = [folder._id];
        while (frontier.length > 0) {
            const children = await Folder.find({ parentId: { $in: frontier }, ...ownerFilter })
                .select('_id')
                .lean();
            frontier = children.map((c) => c._id);
            folderIds.push(...frontier);
        }

        // Move all files inside those folders to Trash (safe soft-delete!)
        const filesCol = getFilesCollection();
        const fileRes = await filesCol.updateMany(
            {
                ...buildFileOwnerFilter(req.user),
                'metadata.folderId': { $in: folderIds },
                'metadata.markAsTrash': false,
            },
            {
                $set: {
                    'metadata.markAsTrash': true,
                    'metadata.markAsTrashDate': new Date(),
                    'metadata.folderId': null,
                },
            }
        );

        await Folder.deleteMany({ _id: { $in: folderIds } });

        await logAudit({
            action: 'FOLDER_DELETE',
            targetType: 'folder',
            targetId: folder._id,
            targetName: folder.name,
            details: { removedSubfolders: folderIds.length - 1, movedFilesToTrash: fileRes.modifiedCount },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `Folder "${folder.name}" deleted (${fileRes.modifiedCount} file(s) safely moved to Trash).`,
            movedFilesToTrash: fileRes.modifiedCount,
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    listFolders,
    getBreadcrumb,
    createFolder,
    renameFolder,
    deleteFolder,
};
