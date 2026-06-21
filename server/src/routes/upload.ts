import { Router, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

// Memory storage — process with Sharp, never write raw to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP, and SVG files are allowed"));
    }
  },
});

interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}

/**
 * POST /api/upload/logo
 * Accepts multipart/form-data with field name 'logo'
 * Processes image: resize to 400x400 max, convert to WebP, strip EXIF
 * Returns the public URL of the uploaded image
 */
router.post("/logo", authRequired, upload.single("logo"), async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uniqueId = crypto.randomBytes(16).toString("hex");

    // For SVGs, just save as-is
    if (req.file.mimetype === "image/svg+xml") {
      const svgFilename = `${uniqueId}.svg`;
      const svgPath = path.join(process.cwd(), "uploads", svgFilename);
      fs.writeFileSync(svgPath, req.file.buffer);
      return res.status(201).json({
        url: `/api/uploads/${svgFilename}`,
        filename: svgFilename,
        width: null,
        height: null,
      });
    }

    const filename = `${uniqueId}.webp`;
    const outputPath = path.join(process.cwd(), "uploads", filename);

    // Process image with Sharp
    let pipeline = sharp(req.file.buffer);

    // Resize to max 400x400, maintain aspect ratio
    pipeline = pipeline.resize(400, 400, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Convert to WebP for optimal web performance
    pipeline = pipeline.webp({ quality: 85 });

    // Write to disk
    await pipeline.toFile(outputPath);

    const metadata = await sharp(outputPath).metadata();

    res.status(201).json({
      url: `/api/uploads/${filename}`,
      filename,
      width: metadata.width,
      height: metadata.height,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
