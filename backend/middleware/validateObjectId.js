const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');

const validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            msg: `Invalid ObjectId format for parameter "${paramName}".`,
        });
    }
    return next();
};

module.exports = { validateObjectIdParam };
