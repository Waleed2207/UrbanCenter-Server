const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment_text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Comment', commentSchema);
