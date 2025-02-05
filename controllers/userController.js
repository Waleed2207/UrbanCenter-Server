const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { REPORT_CATEGORIES } = require('../models/Report'); // Import category list

// Register a user
exports.usersController = {
    async registerUser(req, res) {
        try {
          const { username, email, password, role, related_category } = req.body;
      
          // Check for required fields
          if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
          }

          if (role === 'authority') {
            if (!related_category) {
              return res.status(400).json({ error: 'Authority users must have a related category' });
            }
            if (!Object.keys(REPORT_CATEGORIES).includes(related_category)) {
              return res.status(400).json({ error: 'Invalid related category' });
            }
          } else if (role === 'citizen' && related_category) {
            return res.status(400).json({ error: 'Citizen users cannot have a related category' });
          }
          // Check if the user already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            // Send 400 error for duplicate email
            return res.status(400).json({ error: 'User with this email already exists' });
          }
      
          // Create a new user
          const newUser = new User({
            username,
            email,
            password, // Do not hash the password here
            role,
            related_category: role === 'authority' ? related_category : undefined,
          });
      
          // Save the user to the database
          await newUser.save();
      
          // Remove sensitive fields before sending the response
          const { password: _, ...userWithoutPassword } = newUser.toObject();
      
          res.status(200).json({
            message: 'User registered successfully',
            user: userWithoutPassword,
          });
        } catch (err) {
          // Handle duplicate email error (MongoDB error code 11000)
          if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(400).json({ error: 'User with this email already exists' });
          }
      
          // Log error and send generic 500 error
          console.error('Registration error:', err);
          res.status(500).json({ error: 'Failed to register user', details: err.message });
        }
      },
      
  // Sign in a user
  async signInUser(req, res) {
    try {
      const { email, password } = req.body;
  
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
  
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
  
      // Check if the password is valid
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Invalid password' });
      }
  
      // Generate a JWT token
      const token = jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '3h' }
      );
  
      // Update tokens field atomically
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { tokens: [{ token }] } },
        { new: true } // Return the updated document
      );
  
      // Prepare user data for response
      const userData = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        related_category: user.role === 'authority' ? user.related_category : undefined,
      };
  
      res.status(200).json({
        message: 'Sign in successful',
        token,
        user: userData,
      });
    } catch (err) {
      console.error('Sign-in error:', err);
      res.status(500).json({ error: 'Failed to sign in', details: err.message });
    }
  }
  
  
};
