const { StatusCodes } = require('http-status-codes');

const notFound = (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(StatusCodes.NOT_FOUND).json({
            msg: `API endpoint not found: ${req.method} ${req.originalUrl}`,
        });
    }
    return res.status(StatusCodes.NOT_FOUND).send('<h1>404 — Resource Not Found</h1>');
};

module.exports = notFound;
