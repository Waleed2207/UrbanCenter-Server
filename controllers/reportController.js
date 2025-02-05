const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const crypto = require('crypto');
const { Report, REPORT_CATEGORIES } = require('../models/Report');
const User = require('../models/User');
const moment = require('moment-timezone'); // Import moment-timezone

require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const generateRandomImageName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

exports.createReport = {
  async CreateReport(req, res) {
    try {
      const { user_id, category, subcategory, description, location_lat, location_long, priority } = req.body;
      // const io = req.io; 

      if (!REPORT_CATEGORIES[category] || !REPORT_CATEGORIES[category].includes(subcategory)) {
        return res.status(400).json({ error: "Invalid category-subcategory combination" });
      }

      let image_url = null;

      if (req.file) {
        const buffer = await sharp(req.file.buffer)
          .resize({ height: 1920, width: 1080, fit: 'contain' })
          .toBuffer();

        const imageName = generateRandomImageName();

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: imageName,
          Body: buffer,
          ContentType: req.file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));

        image_url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageName}`;
      }

      const newReport = new Report({
        user_id,
        category,
        subcategory,
        description,
        image_url,
        location_lat,
        location_long,
        priority,
      });

      await newReport.save();
      // io.emit("reportAdded", newReport); 
      res.status(200).json({ message: 'Report created successfully', report: newReport });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create report', details: err.message });
    }
  },
    async getAllReports(req, res) {
        try {
          const reports = await Report.find();
      
          if (!reports || reports.length === 0) {
            return res.status(404).json({ message: 'No reports found' });
          }
      
          for (const report of reports) {
            if (report.image_url) {
              const fileName = report.image_url.split('/').pop();
      
              const getObjectParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
              };
      
              const command = new GetObjectCommand(getObjectParams);
      
              // Generate a signed URL for the image with 7 days expiration
              const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
              report.image_url = url; // Replace the image_url with the signed URL
            }
          }
      
          res.status(200).json({ message: 'Reports retrieved successfully', reports });
        } catch (err) {
          res.status(500).json({ error: 'Failed to retrieve reports', details: err.message });
        }
    },
    async getReportsByUserId(req, res) {
      try {
        const { user_id } = req.params;
    
        // ✅ Fetch reports and include created_at and updated_at
        const reports = await Report.find({ user_id });
    
        if (!reports || reports.length === 0) {
          return res.status(404).json({ message: "No reports found for this user" });
        }
    
        // ✅ Convert UTC timestamps to your local timezone (Israel Time, or any timezone)
        const localReports = reports.map(report => ({
          ...report.toObject(),
          created_at: moment(report.created_at).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss'), 
          updated_at: moment(report.updated_at).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss')
        }));
    
        // ✅ Generate signed URLs for images
        await Promise.all(
          localReports.map(async (report) => {
            if (report.image_url) {
              const fileName = report.image_url.split('/').pop();
              const getObjectParams = { Bucket: process.env.S3_BUCKET_NAME, Key: fileName };
              const command = new GetObjectCommand(getObjectParams);
    
              // Generate a signed URL for the image with a 1-minute expiration
              const url = await getSignedUrl(s3, command, { expiresIn: 60 });
              report.image_url = url; // Replace the image_url with the signed URL
            }
          })
        );
    
        // console.log("API Response Before Sending:", JSON.stringify(reports, null, 2));
    
        res.status(200).json({ message: "Reports retrieved successfully", reports: localReports });
      } catch (err) {
        res.status(500).json({ error: "Failed to retrieve reports", details: err.message });
      }
    },
    async getReportsByCategory(req, res) {

      try {
        const { user_id } = req.params;
    
        // Find the user by ID
        const user = await User.findById(user_id);
    
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
    
        // Ensure user is an authority
        if (user.role !== "authority") {
          return res.status(403).json({ error: "Access denied. Only authority users can access this data." });
        }
    
        // Get reports related to the user's assigned category
        const reports = await Report.find({ category: user.related_category });
    
        if (reports.length === 0) {
          return res.status(404).json({ message: "No reports found for this category" });
        }
    
        // Convert timestamps to local timezone
        const localReports = reports.map(report => ({
          ...report.toObject(),
          created_at: moment(report.created_at).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss'),
          updated_at: moment(report.updated_at).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss')
        }));
    
        // Generate signed URLs for images
        await Promise.all(
          localReports.map(async (report) => {
            if (report.image_url) {
              const fileName = report.image_url.split('/').pop();
              const getObjectParams = { Bucket: process.env.S3_BUCKET_NAME, Key: fileName };
              const command = new GetObjectCommand(getObjectParams);
    
              // Generate a signed URL for the image with a 1-minute expiration
              const url = await getSignedUrl(s3, command, { expiresIn: 60 });
              report.image_url = url; // Replace the image_url with the signed URL
            }
          })
        );
    
        res.status(200).json({ message: "Reports retrieved successfully", reports: localReports });
    
      } catch (err) {
        res.status(500).json({ error: "Failed to retrieve reports by category", details: err.message });
      }

    },
    async getSignedUrl(req, res) {
      try {
        const report = await Report.findById(req.params.id);
  
        if (!report || !report.image_url) {
          return res.status(404).json({ error: 'Report or image not found' });
        }
  
        const fileName = report.image_url.split('/').pop();
  
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
        });
  
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });
  
        res.status(200).json({ signedUrl });
      } catch (err) {
        res.status(500).json({ error: 'Failed to generate signed URL', details: err.message });
      }
    },
  
    async updateReport(req, res) {
      try {
        const { id } = req.params;
        const { user_id, category, description,subcategory, location_lat, location_long, priority, status } = req.body;
        // const io = req.io;

        const report = await Report.findById(id);
        if (!report) {
          return res.status(404).json({ error: 'Report not found' });
        }
        if (!REPORT_CATEGORIES[category] || !REPORT_CATEGORIES[category].includes(subcategory)) {
          return res.status(400).json({ error: "Invalid category-subcategory combination" });
        }
        let image_url = report.image_url;
        let imageUpdated = false;
    
        // Handle image update
        if (req.file) {
          const buffer = await sharp(req.file.buffer)
            .resize({ height: 1920, width: 1080, fit: 'contain' })
            .toBuffer();
    
          const imageName = generateRandomImageName();
    
          const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: imageName,
            Body: buffer,
            ContentType: req.file.mimetype,
          };
    
          await s3.send(new PutObjectCommand(params));
    
          if (report.image_url) {
            const oldFileName = report.image_url.split('/').pop();
            await s3.send(
              new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: oldFileName,
              })
            );
          }
    
          image_url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageName}`;
          imageUpdated = true;
        }
    
        // Check if any field is actually updated
        const isUpdated =
        imageUpdated ||
        (user_id && user_id.toString() !== report.user_id.toString()) ||
        (category && category !== report.category) ||
        (subcategory && subcategory !== report.subcategory) ||
        (description && description !== report.description) ||
        (location_lat && parseFloat(location_lat) !== parseFloat(report.location_lat)) ||
        (location_long && parseFloat(location_long) !== parseFloat(report.location_long)) ||
        (priority && priority !== report.priority) ||
        (status && status !== report.status);
    
        if (!isUpdated) {
          return res.status(200).json({ message: 'Nothing has changed', report });
        }
    
        // Update the report only if changes exist
        if (user_id) report.user_id = user_id;
        if (category) report.category = category;
        if (description) report.description = description;
        if (subcategory) report.subcategory = subcategory;
        if (location_lat) report.location_lat = parseFloat(location_lat);
        if (location_long) report.location_long = parseFloat(location_long);
        if (priority) report.priority = priority;
        if (status) report.status = status;
        if (image_url) report.image_url = image_url;
    
        await report.save();
        // io.emit("reportUpdated", report);
        res.status(200).json({ message: 'Report updated successfully', report });
      } catch (err) {
        res.status(500).json({ error: 'Failed to update report', details: err.message });
      }
    },  
    async updateReportStatus(req, res) {
      try {
        const { id } = req.params;
        const { status } = req.body;
        // const io = req.io;

        // ✅ Validate status
        const validStatuses = ["pending", "in_progress", "resolved"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }
    
        // ✅ Find the report
        const report = await Report.findById(id);
        console.log(report);
        if (!report) {
          return res.status(404).json({ error: "Report not found" });
        }
    
        // ✅ Ensure only authorities can update status
        const user = await User.findById(req.user._id);
        if (!user || user.role !== "authority") {
          return res.status(403).json({ error: "Access denied. Only authority users can update report status." });
        }
    
        // ✅ Update the report status
        report.status = status;
        report.updated_at = moment().tz("Asia/Jerusalem").toDate(); // Update timestamp
        await report.save();
        // io.emit("reportUpdated", report);
        res.status(200).json({ message: "Report status updated successfully", report });
      } catch (err) {
        res.status(500).json({ error: "Failed to update report status", details: err.message });
      }
    },
    async deleteReport(req, res) {
      try {
        const { id } = req.params;
        // const io = req.io;

        const report = await Report.findById(id);
        if (!report) {
          return res.status(404).json({ error: 'Report not found' });
        }
  
        if (report.image_url) {
          const fileName = report.image_url.split('/').pop();
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: fileName,
            })
          );
        }
  
        await report.deleteOne();
        // io.emit("reportDeleted", id); 
        res.status(200).json({ message: 'Report deleted successfully' });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete report', details: err.message });
      }
    },
  };
  