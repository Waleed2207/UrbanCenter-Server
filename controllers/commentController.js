const Comment = require('../models/Comment');

// Add a comment to a report
exports.CommentController = {

  async addComment(req, res){
    try {
        const { report_id, user_id, comment_text } = req.body;

        const newComment = new Comment({ report_id, user_id, comment_text });
        await newComment.save();

        res.status(201).json({ message: 'Comment added successfully', comment: newComment });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add comment', details: err.message });
    }
    },
    
}