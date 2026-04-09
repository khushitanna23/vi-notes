import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Routes import
import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessions.js";

// Load env
dotenv.config();

const app = express();
mongoose.set("bufferCommands", false);

// ✅ FIXED CORS (IMPORTANT 🔥)
app.use(cors({
  origin: true, // 🔥 allow all (3000, 3001 etc.)
  credentials: true
}));

app.use(express.json());

// ✅ MongoDB connect
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vinotes", {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("MongoDB connected successfully ✅"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.error("Please start MongoDB service (mongod) and restart backend.");
  });

// ✅ Base route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Vi-Notes API is running" });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

// ✅ Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop previous backend process and retry.`);
    return;
  }
  console.error("Server start error:", err);
});