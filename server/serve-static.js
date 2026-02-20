// Optional: Serve static frontend files from backend
// Use this if your hosting provider doesn't support static file serving
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serveStatic = (app) => {
  const distPath = path.join(__dirname, "..", "dist");
  
  // Serve static files from dist directory
  app.use(express.static(distPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    // Skip uploads
    if (req.path.startsWith("/uploads")) {
      return next();
    }
    // Serve index.html for all other routes
    res.sendFile(path.join(distPath, "index.html"));
  });
};
