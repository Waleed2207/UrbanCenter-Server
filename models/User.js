const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const mongoose = require('mongoose');

const REPORT_CATEGORIES = {
  "Road Hazards": ["Potholes", "Fallen Trees", "Damaged Traffic Signs"],
  "Public Safety": ["Suspicious Activity", "Vandalism", "Noise Complaints"],
  "Environmental Issues": ["Illegal Dumping", "Air Pollution", "Water Pollution"],
  "Infrastructure Problems": ["Broken Streetlights", "Faulty Power Lines", "Water Pipe Leaks"],
  "Animal Control": ["Stray Animals", "Animal Abuse", "Dead Animals on Roads"],
  "Health & Sanitation": ["Overflowing Trash Bins", "Hazardous Waste Disposal", "Public Restrooms Issues"],
  "Weather-Related Issues": ["Flooding", "Storm Damage", "Snow/Ice Accumulation"]
};

const UserSchema = new mongoose.Schema({
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['citizen', 'authority'],
    required: true,
  },
  related_category: {
    type: String,
    enum: Object.keys(REPORT_CATEGORIES),
    required: function () {
      return this.role === 'authority'; // Required only if user is authority
    },
  },
  registration_date: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to hash the password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.pre('validate', function (next) {
  if (this.role === 'authority' && !this.related_category) {
    return next(new Error('Authority users must have a related category.'));
  }
  if (this.role === 'citizen' && this.related_category) {
    return next(new Error('Citizen users cannot have a related category.'));
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {

  return await bcrypt.compare(candidatePassword, this.password);

};


// Generate auth token method
UserSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(
    { _id: user._id.toString(), role: user.role, related_category: user.related_category },
    process.env.JWT_SECRET
  );
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Customize JSON output
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  user.registration_date = moment(user.registration_date)
    .local()
    .format('YYYY-MM-DD HH:mm:ss'); // Convert to local time
  delete user.password; // Remove sensitive fields
  delete user.tokens;
  if (user.role === 'citizen') {
    delete user.related_category;
  }
  return user;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
