const mongoose = require("mongoose");
const moment = require("moment-timezone");

const REPORT_CATEGORIES = {
  "Road Hazards": ["Potholes", "Fallen Trees", "Damaged Traffic Signs"],
  "Public Safety": ["Suspicious Activity", "Vandalism", "Noise Complaints"],
  "Environmental Issues": ["Illegal Dumping", "Air Pollution", "Water Pollution"],
  "Infrastructure Problems": ["Broken Streetlights", "Faulty Power Lines", "Water Pipe Leaks"],
  "Animal Control": ["Stray Animals", "Animal Abuse", "Dead Animals on Roads"],
  "Health & Sanitation": ["Overflowing Trash Bins", "Hazardous Waste Disposal", "Public Restrooms Issues"],
  "Weather-Related Issues": ["Flooding", "Storm Damage", "Snow/Ice Accumulation"]
};

const reportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, enum: Object.keys(REPORT_CATEGORIES), required: true },
  subcategory: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        return Object.values(REPORT_CATEGORIES).some((subcats) => subcats.includes(value));
      },
      message: "Invalid subcategory",
    },
  },
  description: { type: String, required: true },
  image_url: { type: String, required: false },
  location_lat: { type: Number, required: true },
  location_long: { type: Number, required: true },
  status: { type: String, enum: ["pending", "in_progress", "resolved"], default: "pending" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  created_at: { 
    type: Date, 
    default: () => moment().tz("Asia/Jerusalem").toDate() 
  },
  updated_at: { 
    type: Date, 
    default: () => moment().tz("Asia/Jerusalem").toDate() 
  },
});

// Auto-update `updated_at`
reportSchema.pre("save", function (next) {
  this.updated_at = moment().tz("Asia/Jerusalem").toDate();
  next();
});

module.exports = {
  Report: mongoose.model("Report", reportSchema),
  REPORT_CATEGORIES,
};
