const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load HF token from environment
const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error("❌ ERROR: HF_TOKEN environment variable is not set");
  console.error("Please add HF_TOKEN to your .env file");
  process.exit(1);
}

console.log("✓ HF_TOKEN loaded from environment");

// Enhanced health check endpoint with diagnostic info
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Ronit AI Backend",
    endpoints: {
      health: "GET /health",
      imageGeneration: "POST /api/generate-image",
      diagnostics: "GET /api/diagnostics"
    }
  });
});

// Diagnostic endpoint to help troubleshoot issues
app.get("/api/diagnostics", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: {
      port: PORT,
      uptime: process.uptime()
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      huggingfaceAvailable: !!HF_TOKEN
    },
    endpoints: [
      { method: "GET", path: "/health", description: "Health check" },
      { method: "POST", path: "/api/generate-image", description: "Image generation" }
    ]
  });
});

// Image generation endpoint
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      console.warn("⚠️ Empty prompt received");
      return res.status(400).json({ error: "Image prompt cannot be empty" });
    }

    console.log(`🎨 Generating image for prompt: "${prompt.substring(0, 100)}..."`);

    // Call Hugging Face API with correct router endpoint
    const hfResponse = await axios.post(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          Accept: "image/png",
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
        timeout: 90000, // 90 second timeout for image generation
      }
    );

    // Convert image to base64
    const base64Image = Buffer.from(hfResponse.data).toString("base64");
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log("✓ Image generated successfully");
    console.log(`📊 Image size: ${(base64Image.length / 1024).toFixed(2)} KB`);

    res.json({
      success: true,
      image: dataUrl,
    });
  } catch (error) {
    console.error("❌ Backend error:", error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      "Failed to generate image";

    // Provide helpful error messages
    let userFriendlyMessage = errorMessage;
    if (error.message.includes("timeout")) {
      userFriendlyMessage = "Image generation timed out. Please try again.";
    } else if (error.message.includes("ECONNREFUSED")) {
      userFriendlyMessage = "Cannot connect to Hugging Face. Please check your internet connection.";
    } else if (statusCode === 401 || statusCode === 403) {
      userFriendlyMessage = "Hugging Face API key is invalid. Please check your HF_TOKEN.";
    } else if (statusCode === 429) {
      userFriendlyMessage = "Rate limited. Please wait a moment and try again.";
    }

    res.status(statusCode).json({
      error: userFriendlyMessage,
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      success: false,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    availableEndpoints: [
      "GET /health",
      "GET /api/diagnostics",
      "POST /api/generate-image"
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "An error occurred"
  });
});

// Start server with better error handling
const server = app.listen(PORT, () => {
  // Output simple startup message that Electron can detect
  console.log("Backend Server Started");
  
  console.log(`
╔════════════════════════════════════════╗
║   ✅ Backend Server Started            ║
╠════════════════════════════════════════╣
║ 🌐 http://localhost:${PORT}           
║ 🏥 Health: http://localhost:${PORT}/health
║ 🔧 Diagnostics: http://localhost:${PORT}/api/diagnostics
║ 🎨 Generate: POST http://localhost:${PORT}/api/generate-image
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
