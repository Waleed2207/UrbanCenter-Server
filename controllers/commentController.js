const { S3Client, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { Report, REPORT_CATEGORIES } = require('../models/Report');
const moment = require("moment-timezone");

require("dotenv").config();

// ✅ Initialize the S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

exports.CommentController = {
    async addComment(req, res) {
        try {
            const { report_id, user_id, comment_text } = req.body;

            const newComment = new Comment({ report_id, user_id, comment_text });
            await newComment.save();

            res.status(201).json({ message: "Comment added successfully", comment: newComment });
        } catch (err) {
            res.status(500).json({ error: "Failed to add comment", details: err.message });
        }
    },

    async getCommentsByUserAndCategory(req, res) {
        try {
            const { user_id, category } = req.params;
        
            // ✅ Fetch comments based on user_id and category
            const comments = await Comment.find({ user_id, category });
        
            if (!comments || comments.length === 0) {
              return res.status(404).json({ message: "No comments found for this user and category" });
            }
        
            // ✅ Convert UTC timestamps to local timezone (Israel Time)
            const localComments = comments.map(comment => ({
              ...comment.toObject(),
              timestamp: moment(comment.timestamp).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss')
            }));
        
            // ✅ Generate signed URLs for images
            await Promise.all(
              localComments.map(async (comment) => {
                if (comment.image_url) {
                  const fileName = comment.image_url.split('/').pop();
                  const getObjectParams = { Bucket: process.env.S3_BUCKET_NAME, Key: fileName };
                  const command = new GetObjectCommand(getObjectParams);
        
                  // Generate a signed URL for the image with a 1-minute expiration
                  const url = await getSignedUrl(s3, command, { expiresIn: 60 });
                  comment.image_url = url; // Replace the image_url with the signed URL
                }
              })
            );
        
            res.status(200).json({ message: "Comments retrieved successfully", comments: localComments });
          } catch (err) {
            res.status(500).json({ error: "Failed to retrieve comments", details: err.message });
          }
        
    },
    async deleteCommentByReportId(req, res){
        try {
            const { report_id } = req.params;
            const io = req.io;
            const onlineUsers = req.onlineUsers;
        
            // ✅ Find and delete the comment based on report_id
            const deletedComment = await Comment.findOneAndDelete({ report_id });
        
            if (!deletedComment) {
              return res.status(404).json({ message: "Comment not found for this report_id" });
            }
        
            const report = await Report.findOne({ _id: report_id }).populate("user_id", "username phone_number");

        
            if (!report) {
              return res.status(200).json({ message: "Comment deleted successfully, but report not found", deletedComment });
            }
        
            const citizen_name = report.user_id?.username || "Unknown";
            const phone_number = report.user_id?.phone_number || "N/A";
        
            // ✅ Delete the image from AWS S3 if it exists
            if (report.image_url) {
              try {
                const fileName = report.image_url.split('/').pop();
                await s3.send(
                  new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: fileName,
                  })
                );
              } catch (s3Error) {
                console.error("S3 Deletion Error:", s3Error);
              }
            }
        
            // ✅ Delete the report from MongoDB
            await report.deleteOne();
        
            // ✅ Notify authorities in the category
            const authorities = await User.find({ role: "authority", related_category: report.category });
        
            authorities.forEach((authority) => {
              const socketId = onlineUsers.get(authority._id.toString());
              if (socketId) {
                io.to(socketId).emit("reportDeleted", {
                  report_id,
                  category: report.category,
                  citizen_name,
                  phone_number,
                });
              }
            });
        
            res.status(200).json({
              message: "Comment and associated report deleted successfully",
              deletedComment,
              deletedReport: { report_id, citizen_name, phone_number },
            });
        
          } catch (err) {
            console.error("Error deleting comment and report:", err);
            res.status(500).json({ error: "Failed to delete comment and report", details: err.message });
          }
    }

};
