const express = require('express');
const { usersController } = require('../controllers/userController');
const userRoutes = express.Router();

//POST
userRoutes.post('/register', usersController.registerUser);
userRoutes.post('/login', usersController.signInUser);


module.exports = userRoutes;
