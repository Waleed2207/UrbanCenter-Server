const express = require('express');
const { CommentController } = require('../controllers/commentController');
const commentRoutes = express.Router();

//GET 
commentRoutes.get('/report/category_comment/:user_id/:category', CommentController.getCommentsByUserAndCategory);

//POST
commentRoutes.post('/add', CommentController.addComment);

//DELETE
commentRoutes.delete('/report/category_comment/:report_id', CommentController.deleteCommentByReportId); // ✅ DELETE route


module.exports = commentRoutes;
