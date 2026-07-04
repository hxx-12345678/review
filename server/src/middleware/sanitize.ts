import { Request, Response, NextFunction } from "express";

function sanitizeValue(value: unknown, maxDepth = 5): unknown {
  if (maxDepth <= 0) return value;
  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/[\0\x08\x09\x1a\n\r"'\\]/g, (char) => {
        switch (char) {
          case "\0": return "\\0";
          case "\x08": return "\\b";
          case "\x09": return "\\t";
          case "\x1a": return "\\z";
          case "\n": return "\\n";
          case "\r": return "\\r";
          case '"': return '\\"';
          case "'": return "\\'";
          case "\\": return "\\\\";
          default: return char;
        }
      })
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v, maxDepth - 1));
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val, maxDepth - 1);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body) as typeof req.body;
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }
  next();
}
