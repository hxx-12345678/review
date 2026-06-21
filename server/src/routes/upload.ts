import { Router, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authRequired, AuthRequest } from "../middleware/auth";
import { prisma } from "../config/database";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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

function deleteOldLogo(logoUrl: string | null) {
  if (!logoUrl) return;
  // Extract filename from URL: /api/uploads/xxx.webp → xxx.webp
  const match = logoUrl.match(/\/api\/uploads\/(.+)$/);
  if (!match) return;
  const filename = match[1];
  // Never delete the .gitkeep sentinel
  if (filename === ".gitkeep") return;
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Non-fatal — log and continue
    console.warn("Failed to delete old logo:", filePath);
  }
}

/**
 * POST /api/upload/logo
 * Accepts multipart/form-data with field name 'logo'
 * - Deletes previous logo file from disk (if any)
 * - Processes image: resize to 400x400 max, convert to WebP, strip EXIF
 * - Updates the business logoUrl in the database
 * Returns the new public URL
 */
router.post("/logo", authRequired, upload.single("logo"), async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Find the business for this user
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { businesses: { select: { id: true, logoUrl: true } } },
    });
    if (!user?.businesses.length) {
      return res.status(404).json({ error: "No business found for this account" });
    }
    const business = user.businesses[0];

    const uniqueId = crypto.randomBytes(16).toString("hex");

    let filename: string;

    // For SVGs, save as-is
    if (req.file.mimetype === "image/svg+xml") {
      filename = `${uniqueId}.svg`;
      const outputPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(outputPath, req.file.buffer);
    } else {
      filename = `${uniqueId}.webp`;
      const outputPath = path.join(UPLOADS_DIR, filename);

      await sharp(req.file.buffer)
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outputPath);
    }

    const newUrl = `/api/uploads/${filename}`;

    // Delete old logo file, then update DB
    deleteOldLogo(business.logoUrl);

    // Store full URL with origin so the client can use it directly
    const origin = req.protocol + "://" + req.get("host");
    const fullUrl = `${origin}${newUrl}`;

    await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl: fullUrl },
    });

    res.status(201).json({
      url: fullUrl,
      filename,
      width: null,
      height: null,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
