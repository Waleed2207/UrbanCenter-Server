// const express = require("express");
// const cors = require("cors");
// const http = require("http");
// const socketHandler = require("./socket");
// const connectDB = require("./config");
// require("dotenv").config();

// const PORT = process.env.PORT || 8080;

// const app = express();
// const server = http.createServer(app); // ✅ Use `http.createServer`
// const io = socketHandler(server); // ✅ Initialize WebSocket handler

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(cors({ origin: "http://localhost:3000", credentials: true })); // ✅ Explicitly allow frontend
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// const userRoutes = require("./routers/userRoutes");
// const reportRoutes = require("./routers/reportRoutes");
// const commentRoutes = require("./routers/commentRoutes");

// app.use("/api/users", userRoutes);
// app.use("/api/reports", reportRoutes);
// app.use("/api/comments", commentRoutes);

// // Test WebSocket Endpoint
// app.get("/", (req, res) => {
//   res.send("WebSocket Server is running...");
// });


// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something went wrong!');
// });


// // Start HTTP Server
// server.listen(PORT, () => {
//   console.log(`✅ Server is running on port ${PORT}`);
// });




// imports
const express = require("express");
const cors    = require('cors');
const connectDB = require("./config");
const server = express();
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
require("dotenv").config();
const userRoutes = require('./routers/userRoutes');
const reportRoutes = require('./routers/reportRoutes');
const commentRoutes = require('./routers/commentRoutes');

// Connect to MongoDB 
connectDB();
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({extended: true}));  // hundel post reqs with body
server.use(bodyParser.json());

server.use('/api/users', userRoutes);
server.use('/api/reports', reportRoutes);
server.use('/api/comments', commentRoutes);


server.use((req, res) => {
    res.status(400).send('Something is broken!');
});
server.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });
  
server.listen(PORT, () => console.log(`listening on port ${PORT}`));
