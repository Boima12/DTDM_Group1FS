// middleware to check if the uploaded file is larger than 100MB
const checkFileSize = (req, res, next) => {
    if (req.file && req.file.size > 100 * 1024 * 1024) { // 100MB in bytes
        return res.status(400).json({ msg: "File size exceeds 100MB limit" });
    }
    next();
}   

module.exports = checkFileSize;