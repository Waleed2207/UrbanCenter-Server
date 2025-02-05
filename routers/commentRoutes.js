const express = require('express');
const { CommentController } = require('../controllers/commentController');
const commentRoutes = express.Router();

commentRoutes.post('/add', CommentController.addComment);

module.exports = commentRoutes;
