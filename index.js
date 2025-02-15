// imports
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require('path');

const { Server } = require("socket.io");
const connectDB = require("./config");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;
require("dotenv").config();

const userRoutes = require("./routers/userRoutes");
const reportRoutes = require("./routers/reportRoutes");
const commentRoutes = require("./routers/commentRoutes");

// ✅ Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ✅ Initialize WebSocket Server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// ✅ Store online users
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`📡 User ${userId} registered with socket ID ${socket.id}`);
  });
  socket.on("sendMessage", (data) => {
    const { recipientId, message } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", { message, from: socket.id });
      console.log(`📨 Message sent to ${recipientId}`);
    }
  });
  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`🔌 User ${userId} disconnected`);
        break;
      }
    }
  });
});


// ✅ Middleware
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'view/build')));

// ✅ Attach WebSocket to requests
app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

// ✅ API Routes
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/comments", commentRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// ✅ Error Handling
app.use((req, res) => {
  res.status(400).send("Something is broken!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// ✅ Start Server
server.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
