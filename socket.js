const { Server } = require("socket.io");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // ✅ Allow frontend WebSocket connection
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ WebSocket Connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ WebSocket Disconnected: ${socket.id}`);
    });

    // Example: Broadcast a message when a report is created
    socket.on("addReport", (report) => {
      io.emit("reportAdded", report);
    });

    socket.on("updateReport", (report) => {
      io.emit("reportUpdated", report);
    });

    socket.on("deleteReport", (reportId) => {
      io.emit("reportDeleted", reportId);
    });
  });

  return io;
};
