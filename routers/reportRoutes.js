const express = require('express');
const { createReport } = require('../controllers/reportController');
const upload = require('../middlewares/s3Uploader');
const authMiddleware = require("../middlewares/authMiddleware");

const reportRoutes = express.Router();

//POST
reportRoutes.post('/report', upload.single('image'), createReport.CreateReport);

//GET 
reportRoutes.get('/', createReport.getAllReports);
reportRoutes.get('/report/user/:user_id', createReport.getReportsByUserId);
reportRoutes.get('/report/category/:user_id', createReport.getReportsByCategory);
reportRoutes.get('/report/:id', createReport.getSignedUrl);

//PUT
reportRoutes.put('/report/:id', upload.single('image'), createReport.updateReport);
reportRoutes.put("/report/status/:id", authMiddleware , upload.single('image'), createReport.updateReportStatus);

//DELETE
reportRoutes.delete('/report/:id', createReport.deleteReport);

module.exports = reportRoutes;
