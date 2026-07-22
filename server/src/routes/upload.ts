import { Router, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authRequired, AuthRequest } from "../middleware/auth";
import { prisma } from "../config/database";

const router = Router();

// Resolve uploads directory relative to THIS FILE's location, not process.cwd()
// Dev (tsx):  __dirname = server/src/routes/  → ../../uploads = server/uploads/
// Prod (dist): __dirname = server/dist/routes/  → ../../uploads = server/uploads/
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      console.log("Created uploads directory at:", UPLOADS_DIR);
    }
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}
ensureUploadsDir();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".svg"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only JPG, PNG, WebP, and SVG files are allowed"));
    }
    cb(null, true);
  },
});

function sanitizeSvg(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<embed[\s\S]*?\/?>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/\bon\w+="[^"]*"/gi, "")
    .replace(/\bon\w+='[^']*'/gi, "")
    .replace(/javascript:\s*/gi, "blocked:")
    .replace(/vbscript:\s*/gi, "blocked:");
}

function generateUniqueFilename(ext: string): string {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const name = crypto.randomBytes(16).toString("hex") + ext;
    if (!fs.existsSync(path.join(UPLOADS_DIR, name))) return name;
  }
  throw new Error("Failed to generate unique filename after " + maxAttempts + " attempts");
}

interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}

function deleteOldLogo(logoUrl: string | null) {
  if (!logoUrl) return;
  const match = logoUrl.match(/\/api\/uploads\/(.+)$/);
  if (!match) return;
  const filename = match[1];
  if (filename === ".gitkeep") return;
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    console.warn("Failed to delete old logo:", filePath);
  }
}

// Multer error wrapper — Express global error handler gives generic 500,
// but multer errors (file too large, wrong type) should return specific statuses
function multerMiddleware(req: any, res: any, next: NextFunction) {
  upload.single("logo")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      if (err.message) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: "Upload failed" });
    }
    next();
  });
}

router.post(
  "/logo",
  authRequired,
  multerMiddleware,
  async (req: UploadRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { businessId: rawBusinessId } = req.body || {};
      const businessId = rawBusinessId || req.query.businessId;
      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      const business = await prisma.business.findFirst({
        where: { id: businessId as string, userId: req.userId! },
        select: { id: true, logoUrl: true },
      });
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Ensure directory still exists (safety net for ephemeral filesystems)
      ensureUploadsDir();

      let filename: string;

      if (req.file.mimetype === "image/svg+xml") {
        filename = generateUniqueFilename(".svg");
        const outputPath = path.join(UPLOADS_DIR, filename);
        const sanitized = sanitizeSvg(req.file.buffer.toString("utf-8"));
        fs.writeFileSync(outputPath, sanitized);
      } else {
        filename = generateUniqueFilename(".webp");
        const outputPath = path.join(UPLOADS_DIR, filename);

        try {
          await sharp(req.file.buffer)
            .resize(400, 400, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(outputPath);
        } catch (sharpErr) {
          console.warn("Sharp processing failed, saving original as PNG fallback:", sharpErr);
          filename = generateUniqueFilename(".png");
          const fallbackPath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(fallbackPath, req.file.buffer);
        }
      }

      const newUrl = `/api/uploads/${filename}`;
      deleteOldLogo(business.logoUrl);

      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const origin = `${proto}://${host}`;
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
      console.error("Upload processing error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  },
);

export default router;
