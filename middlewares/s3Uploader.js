const multer = require('multer');

const storage = multer.memoryStorage(); // Store files in memory for processing with sharp
const upload = multer({ storage });

module.exports = upload;
