const mongoose = require('mongoose');
const moment = require("moment-timezone");

const commentSchema = new mongoose.Schema({
  report_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image_url: { type: String, required: false },
  comment_text: { type: String, required: true },
  status: { type: String, required: true },  // ✅ Store status changes
  category: { type: String, required: true }, // ✅ Store category
  citizen_name: { type: String, required: true }, // ✅ Store citizen's name
  phone_number: { type: String, required: true }, // ✅ Store citizen's phone
  timestamp: {     
    type: Date, 
    default: () => moment().tz("Asia/Jerusalem").toDate(),
  },
});

commentSchema.pre("save", function (next) {
  this.timestamp = moment().tz("Asia/Jerusalem").toDate();
  next();
});

module.exports = mongoose.model('Comment', commentSchema);
