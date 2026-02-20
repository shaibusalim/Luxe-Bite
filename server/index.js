import express from "express";
import cors from "cors";
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { randomUUID, createHash, timingSafeEqual } from "crypto";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3002;
const sql = neon(config.DATABASE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload security configuration
const MAX_FILE_SIZE_MB = config.MAX_FILE_SIZE_MB || 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = (config.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/webp,image/gif")
  .split(",")
  .map((t) => t.trim());

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename
    const ext = path.extname(file.originalname || "").toLowerCase();
    const sanitizedExt = ext.match(/^\.(jpg|jpeg|png|gif|webp)$/) ? ext : ".jpg";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + sanitizedExt);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`
      ),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
});

const allowedOrigins = (config.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
// Enhanced security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Logging (only in production for security)
if (config.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// Global rate limiting
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS || 60_000,
    max: config.RATE_LIMIT_MAX || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
  })
);

// Body parser with size limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploads with security headers
app.use("/uploads", express.static(uploadsDir, {
  setHeaders: (res, path) => {
    // Only allow images
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader("Content-Type", "image/jpeg");
    }
  },
}));

const signToken = (payload) =>
  jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN || "24h",
  });
const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  console.log("Auth header present:", !!header);
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    console.log("Auth failed: No bearer token");
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = jwt.verify(token, config.JWT_SECRET);
    req.user = user;
    console.log("Auth success: user id", user.id, "roles", user.roles);
    next();
  } catch (e) {
    console.log("Auth failed: JWT error", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
const ensureAdmin = (req, res, next) => {
  if (req.user?.roles?.includes("admin")) return next();
  return res.status(403).json({ error: "Forbidden" });
};

const ensureTables = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS public.users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      UNIQUE (user_id, role)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      order_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      subtotal DOUBLE PRECISION NOT NULL,
      delivery_fee DOUBLE PRECISION DEFAULT 0,
      total DOUBLE PRECISION NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      special_instructions TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DOUBLE PRECISION NOT NULL,
      special_instructions TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.menu_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      image_url TEXT,
      is_available BOOLEAN DEFAULT true,
      is_weekend_only BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.delivery_settings (
      id TEXT PRIMARY KEY,
      delivery_fee DECIMAL(10,2) DEFAULT 10.00,
      is_delivery_enabled BOOLEAN DEFAULT true,
      is_pay_on_delivery_enabled BOOLEAN DEFAULT true,
      min_order_amount DECIMAL(10,2) DEFAULT 0,
      opening_time TIME DEFAULT '10:00:00',
      closing_time TIME DEFAULT '22:00:00',
      delivery_area TEXT DEFAULT 'Tamale',
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.admin_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      order_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      total DOUBLE PRECISION,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      read BOOLEAN NOT NULL DEFAULT false
    )
  `;
};

await ensureTables();

const createAdminNotification = async (payload) => {
  const id = randomUUID();
  const type = payload.type || "order_cancelled";
  const orderId = payload.order_id || null;
  const customerName = payload.customer_name || null;
  const customerPhone = payload.customer_phone || null;
  const total = typeof payload.total === "number" ? payload.total : null;
  try {
    await sql`
      INSERT INTO public.admin_notifications
      (id, type, order_id, customer_name, customer_phone, total)
      VALUES (${id}, ${type}, ${orderId}, ${customerName}, ${customerPhone}, ${total})
    `;
  } catch (e) {
    console.error("Failed to persist admin notification:", e);
  }
};

const sseClients = new Set();
const broadcast = (event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
};

// Stricter rate limiting for auth endpoints
app.use(
  "/api/auth",
  rateLimit({
    windowMs: config.RATE_LIMIT_AUTH_WINDOW_MS || 60_000,
    max: config.RATE_LIMIT_AUTH_MAX || 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many authentication attempts, please try again later.",
    skipSuccessfulRequests: true,
  })
);

// Rate limiting for order creation
const orderCreateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 orders per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many order requests, please try again later.",
});

// Anti-bruteforce tracking (in-memory)
const loginAttempts = new Map(); // key: email|ip -> { count, blockedUntil }
const getKey = (email, ip) => `${email}|${ip || "unknown"}`;
const MAX_LOGIN_ATTEMPTS = config.MAX_LOGIN_ATTEMPTS || 5;
const LOGIN_BLOCK_DURATION_MS = config.LOGIN_BLOCK_DURATION_MS || 15 * 60_000; // 15 minutes default

const isBlocked = (email, ip) => {
  const key = getKey(email, ip);
  const rec = loginAttempts.get(key);
  return rec && rec.blockedUntil && rec.blockedUntil > Date.now();
};
const recordFailure = (email, ip) => {
  const key = getKey(email, ip);
  const rec = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_LOGIN_ATTEMPTS) {
    rec.blockedUntil = Date.now() + LOGIN_BLOCK_DURATION_MS;
    rec.count = 0;
  }
  loginAttempts.set(key, rec);
};
const clearFailures = (email, ip) => {
  loginAttempts.delete(getKey(email, ip));
};
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

// Input sanitization helpers
const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // Remove potential HTML tags
};

const sanitizeNumber = (num, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(num);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
};

// Error response helper (don't leak sensitive info)
const sendError = (res, status, message, details = null) => {
  const response = { error: message };
  // Only include details in development
  if (config.NODE_ENV === "development" && details) {
    response.details = details;
  }
  return res.status(status).json(response);
};

const paystackInitSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  callback_url: z.string().url().optional(),
});

const paystackVerifySchema = z.object({
  reference: z.string().min(1),
});

const paystackBaseUrl = "https://api.paystack.co";
const paystackFetch = async (path, init) => {
  if (!config.PAYSTACK_SECRET_KEY) {
    const err = new Error("Paystack not configured");
    err.code = "PAYSTACK_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch(`${paystackBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
};

const verifyPaystackReference = async (reference) => {
  const { res, data } = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
  if (!res.ok || !data?.status) {
    return { ok: false, data };
  }
  const tx = data?.data;
  return {
    ok: tx?.status === "success",
    amount: typeof tx?.amount === "number" ? tx.amount : null,
    currency: typeof tx?.currency === "string" ? tx.currency : null,
    reference: typeof tx?.reference === "string" ? tx.reference : reference,
    paid_at: typeof tx?.paid_at === "string" ? tx.paid_at : null,
    channel: typeof tx?.channel === "string" ? tx.channel : null,
    data,
  };
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
      message: "Password must contain letters and numbers",
    }),
  full_name: z.string().min(2).max(100),
});

const safeCompare = (a, b) => {
  const da = createHash("sha256").update(String(a)).digest();
  const db = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(da, db);
};

app.get("/api/health", async (_req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/orders/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: "init" })}\n\n`);
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
    res.end();
  });
});

app.post("/api/upload/menu-image", auth, ensureAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid file type" });
  }
  
  // Additional validation
  if (req.file.size > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({ error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit` });
  }
  
  const urlPath = `/uploads/${req.file.filename}`;
  res.json({ url: urlPath });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid request data");
    }
    
    const email = normalizeEmail(parsed.data.email);
    const fullName = sanitizeString(parsed.data.full_name || "", 100);
    
    // Validate email format more strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return sendError(res, 400, "Invalid email format");
    }
    
    const existing = await sql`SELECT id FROM public.users WHERE email = ${email} LIMIT 1`;
    if (existing.length) {
      return sendError(res, 400, "Email already registered");
    }
    
    const id = randomUUID();
    const bcryptRounds = config.BCRYPT_ROUNDS || 12;
    const hash = await bcrypt.hash(parsed.data.password, bcryptRounds);
    
    await sql`INSERT INTO public.users (id, email, password_hash, full_name) VALUES (${id}, ${email}, ${hash}, ${fullName || null})`;
    await sql`INSERT INTO public.user_roles (user_id, role) VALUES (${id}, ${"customer"})`;
    const roles = ["customer"];
    const token = signToken({ id, email, roles });
    res.status(201).json({ token, user: { id, email }, roles });
  } catch (e) {
    console.error("Signup error:", e);
    sendError(res, 500, "Unable to create account", e?.message);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid credentials");
    }
    
    const email = normalizeEmail(parsed.data.email);
    
    // Check if blocked
    if (isBlocked(email, ip)) {
      return sendError(res, 429, "Too many failed attempts. Please try again later.");
    }
    
    const rows = await sql`SELECT id, password_hash FROM public.users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user) {
      recordFailure(email, ip);
      return sendError(res, 401, "Invalid credentials");
    }
    
    const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!ok) {
      recordFailure(email, ip);
      return sendError(res, 401, "Invalid credentials");
    }
    
    const roleRows = await sql`SELECT role FROM public.user_roles WHERE user_id = ${user.id}`;
    const roles = roleRows.map((r) => r.role);
    const token = signToken({ id: user.id, email, roles });
    clearFailures(email, ip);
    res.json({ token, user: { id: user.id, email }, roles });
  } catch (e) {
    console.error("Login error:", e);
    sendError(res, 500, "Login failed", e?.message);
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const ip = req.ip;
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });
    const email = normalizeEmail(parsed.data.email);
    if (isBlocked(email, ip)) return res.status(429).json({ error: "Invalid credentials" });

    const adminEmail = config.ADMIN_EMAIL ? normalizeEmail(config.ADMIN_EMAIL) : null;
    const adminPassword = config.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("Admin login attempted but ADMIN_EMAIL or ADMIN_PASSWORD is not set in .env");
      return res.status(503).json({ error: "Admin login not configured" });
    }

    if (email !== adminEmail || parsed.data.password !== adminPassword) {
      recordFailure(email, ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const id = "admin-service";
    const roles = ["admin"];
    const token = signToken({ id, email, roles });
    res.json({ token, user: { id, email }, roles });
    clearFailures(email, ip);
  } catch (e) {
    console.error("Admin login error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/menu-categories", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, description, sort_order, is_active, created_at
      FROM public.menu_categories
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/all-categories", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, description, sort_order, is_active, created_at
      FROM public.menu_categories
      ORDER BY sort_order ASC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/menu-items", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT mi.*, to_json(mc.*) AS category
      FROM public.menu_items mi
      JOIN public.menu_categories mc ON mc.id = mi.category_id
      WHERE mi.is_available = true
      ORDER BY mi.sort_order ASC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/all-menu-items", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT mi.*, to_json(mc.*) AS category
      FROM public.menu_items mi
      JOIN public.menu_categories mc ON mc.id = mi.category_id
      ORDER BY mi.sort_order ASC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/delivery-settings", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT *
      FROM public.delivery_settings
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    res.json(rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/payments/paystack/initialize", auth, async (req, res) => {
  try {
    const parsed = paystackInitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Unable to process request" });

    const amountMinor = Math.round(parsed.data.amount * 100);
    const { res: psRes, data } = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: parsed.data.email,
        amount: amountMinor,
        currency: parsed.data.currency || "GHS",
        callback_url: parsed.data.callback_url,
      }),
    });

    if (!psRes.ok || !data?.status || !data?.data?.authorization_url || !data?.data?.reference) {
      return res.status(502).json({ error: "Unable to start payment" });
    }

    return res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (e) {
    if (e?.code === "PAYSTACK_NOT_CONFIGURED") {
      return res.status(503).json({ error: "Paystack not configured" });
    }
    return res.status(500).json({ error: "Unable to start payment" });
  }
});

app.get("/api/payments/paystack/verify", auth, async (req, res) => {
  try {
    const parsed = paystackVerifySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Unable to process request" });

    const result = await verifyPaystackReference(parsed.data.reference);
    if (!result.ok) return res.json({ ok: false });
    return res.json({
      ok: true,
      reference: result.reference,
      amount: result.amount,
      currency: result.currency,
      paid_at: result.paid_at,
      channel: result.channel,
    });
  } catch (e) {
    if (e?.code === "PAYSTACK_NOT_CONFIGURED") {
      return res.status(503).json({ error: "Paystack not configured" });
    }
    return res.status(500).json({ error: "Unable to verify payment" });
  }
});

app.get("/api/orders", auth, (req, res, next) => {
  const { user_id } = req.query;
  if (user_id) {
    if (req.user?.id !== user_id && !req.user?.roles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  }
  return ensureAdmin(req, res, next);
}, async (req, res) => {
  console.log(`[${new Date().toISOString()}] Incoming GET /api/orders request from user ${req.user.id}`);
  try {
    const { user_id, page, limit, status } = req.query;
    console.log("GET /api/orders -> fetching for user_id:", user_id || "ALL", "page:", page, "limit:", limit, "status:", status);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Try DB first
    let orders = [];
    let total = 0;
    try {
      if (user_id) {
        if (page && limit) {
          orders = await sql`SELECT * FROM public.orders WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
          const countRes = await sql`SELECT count(*) FROM public.orders WHERE user_id = ${user_id}`;
          total = parseInt(countRes[0].count);
        } else {
          orders = await sql`SELECT * FROM public.orders WHERE user_id = ${user_id} ORDER BY created_at DESC`;
          total = orders.length;
        }
      } else if (status === 'active') {
        if (page && limit) {
          orders = await sql`SELECT * FROM public.orders WHERE status NOT IN ('delivered', 'cancelled') ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
          const countRes = await sql`SELECT count(*) FROM public.orders WHERE status NOT IN ('delivered', 'cancelled')`;
          total = parseInt(countRes[0].count);
        } else {
          orders = await sql`SELECT * FROM public.orders WHERE status NOT IN ('delivered', 'cancelled') ORDER BY created_at DESC`;
          total = orders.length;
        }
      } else if (status && status !== 'all') {
        if (page && limit) {
          orders = await sql`SELECT * FROM public.orders WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
          const countRes = await sql`SELECT count(*) FROM public.orders WHERE status = ${status}`;
          total = parseInt(countRes[0].count);
        } else {
          orders = await sql`SELECT * FROM public.orders WHERE status = ${status} ORDER BY created_at DESC`;
          total = orders.length;
        }
      } else {
        if (page && limit) {
          orders = await sql`SELECT * FROM public.orders ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
          const countRes = await sql`SELECT count(*) FROM public.orders`;
          total = parseInt(countRes[0].count);
        } else {
          orders = await sql`SELECT * FROM public.orders ORDER BY created_at DESC`;
          total = orders.length;
        }
      }
    } catch (dbErr) {
      console.error("DB Order fetch error:", dbErr);
      throw dbErr;
    }

    if (orders.length === 0 && !page) {
      return res.json([]);
    }

    let items = [];
    try {
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        // Use ANY for IN clause with Neon/Postgres
        items = await sql`SELECT * FROM public.order_items WHERE order_id = ANY(${orderIds})`;
      }
    } catch (dbErr) {
      console.error("DB Items fetch error:", dbErr);
      throw dbErr;
    }

    const withItems = orders.map((o) => ({
      ...o,
      order_items: (items || []).filter((it) => it.order_id === o.id),
    }));

    if (page && limit) {
      res.json({
        data: withItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } else {
      res.json(withItems);
    }
  } catch (e) {
    console.error("Final catch in GET /api/orders:", e);
    sendError(res, 500, "Failed to fetch orders", e?.message);
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const orderRows = await sql`
      SELECT * FROM public.orders WHERE id = ${id} LIMIT 1
    `;
    const order = orderRows[0] || null;
    if (!order) return res.json(null);
    const items = await sql`
      SELECT * FROM public.order_items WHERE order_id = ${id}
    `;
    res.json({ ...order, order_items: items });
  } catch (e) {
    console.error("Get order error:", e);
    sendError(res, 500, "Failed to fetch order", e?.message);
  }
});

app.post("/api/orders", auth, orderCreateLimiter, async (req, res) => {
  try {
    try { await sql`
      CREATE TABLE IF NOT EXISTS public.orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery_address TEXT,
        order_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        special_instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `; } catch (e) {
      console.error("Table creation error:", e);
      return sendError(res, 500, "Database error");
    }
    try { await sql`
      CREATE TABLE IF NOT EXISTS public.order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        special_instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `; } catch (e) {
      console.error("Table creation error:", e);
      return sendError(res, 500, "Database error");
    }
    
    // Sanitize and validate inputs
    const customer_name = sanitizeString(req.body.customer_name || "", 100);
    const customer_phone = sanitizeString(req.body.customer_phone || "", 20);
    const delivery_address = sanitizeString(req.body.delivery_address || "", 500);
    const order_type = req.body.order_type === "delivery" || req.body.order_type === "pickup" 
      ? req.body.order_type 
      : null;
    const subtotal = sanitizeNumber(req.body.subtotal, 0, 100000);
    const delivery_fee = sanitizeNumber(req.body.delivery_fee, 0, 10000);
    const total = sanitizeNumber(req.body.total, 0, 100000);
    const payment_method = req.body.payment_method;
    const paystack_reference = typeof req.body.paystack_reference === "string" 
      ? sanitizeString(req.body.paystack_reference, 100) 
      : null;
    const special_instructions = sanitizeString(req.body.special_instructions || "", 500);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const user_id = req.user?.id ?? null;

    // Validation
    if (!customer_name || customer_name.length < 2) {
      return sendError(res, 400, "Valid customer name is required");
    }
    if (!customer_phone || customer_phone.length < 10) {
      return sendError(res, 400, "Valid phone number is required");
    }
    if (!order_type) {
      return sendError(res, 400, "Invalid order type");
    }
    if (order_type === "delivery" && (!delivery_address || delivery_address.length < 5)) {
      return sendError(res, 400, "Delivery address is required");
    }
    if (!subtotal || subtotal <= 0) {
      return sendError(res, 400, "Invalid subtotal");
    }
    if (!total || total <= 0) {
      return sendError(res, 400, "Invalid total");
    }
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, "Order must contain at least one item");
    }
    if (items.length > 50) {
      return sendError(res, 400, "Order cannot contain more than 50 items");
    }

    const allowedPaymentMethods = ["mtn", "vodafone", "airteltigo", "pay_on_delivery", "paystack"];
    if (!allowedPaymentMethods.includes(payment_method)) {
      return sendError(res, 400, "Invalid payment method");
    }

    let payment_status = "pending";
    if (payment_method === "paystack") {
      if (!paystack_reference || paystack_reference.length === 0) {
        return sendError(res, 400, "Payment reference required");
      }
      const verified = await verifyPaystackReference(paystack_reference);
      if (!verified.ok) {
        return sendError(res, 402, "Payment not completed");
      }

      const expectedMinor = Math.round(total * 100);
      if (Number.isFinite(expectedMinor) && typeof verified.amount === "number" && verified.amount !== expectedMinor) {
        return sendError(res, 400, "Payment amount mismatch");
      }
      payment_status = "paid";
    }

    const orderId = randomUUID();
    let inserted;
    try { inserted = await sql`
      INSERT INTO public.orders
      (id, user_id, customer_name, customer_phone, delivery_address, order_type, status, subtotal, delivery_fee, total, payment_method, payment_status, special_instructions)
      VALUES (${orderId}, ${user_id}, ${customer_name}, ${customer_phone}, ${delivery_address}, ${order_type}, 'pending', ${subtotal}, ${delivery_fee}, ${total}, ${payment_method}, ${payment_status}, ${special_instructions})
      RETURNING *
    `; } catch (e) {
      console.error("Order insertion failed:", e);
      return res.status(500).json({ error: "order_insertion_failed", message: e?.message || String(e) });
    }
    const order = inserted[0];

    if (Array.isArray(items) && items.length > 0) {
      try {
        for (const it of items) {
          const itemName = sanitizeString(it.name || "", 200);
          const itemQuantity = sanitizeNumber(it.quantity, 1, 100);
          const itemPrice = sanitizeNumber(it.price, 0, 10000);
          const itemSpecialInstructions = sanitizeString(it.special_instructions || "", 500);
          
          if (!itemName || itemQuantity <= 0 || !itemPrice || itemPrice <= 0) {
            console.error("Invalid order item:", it);
            continue; // Skip invalid items
          }
          
          await sql`
            INSERT INTO public.order_items
            (id, order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, created_at)
            VALUES (${randomUUID()}, ${order.id}, ${it.id || null}, ${itemName}, ${itemQuantity}, ${itemPrice}, ${itemSpecialInstructions || null}, now())
          `;
        }
      } catch (e) {
        console.error("Order items insertion failed:", e);
        // We don't return error here because the order itself was created, 
        // but this is a serious consistency issue.
      }
    }
    res.status(201).json(order);
    broadcast({ type: "order_created", order_id: order.id });
  } catch (e) {
    console.error("Order creation error:", e);
    sendError(res, 500, "Failed to create order", e?.message);
  }
});

app.delete("/api/orders/:id", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE /api/orders/${id} -> requested by user ${req.user.id}`);
    
    // Delete order items first
    const itemsResult = await sql`DELETE FROM public.order_items WHERE order_id = ${id}`;
    console.log(`Deleted order_items for order ${id}`);
    
    // Delete order
    const orderResult = await sql`DELETE FROM public.orders WHERE id = ${id}`;
    console.log(`Deleted order ${id}`);
    
    res.json({ ok: true });
    broadcast({ type: "order_deleted", order_id: id });
  } catch (e) {
    console.error("Delete order error:", e);
    res.status(500).json({ error: String(e), message: e.message });
  }
});

app.patch("/api/orders/:id/status", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["pending", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    let order = null;
    if (status === "cancelled") {
      const rows = await sql`
        SELECT id, customer_name, customer_phone, total FROM public.orders WHERE id = ${id} LIMIT 1
      `;
      order = rows[0] || null;
      if (!order) {
        return sendError(res, 404, "Order not found");
      }
    }
    await sql`
      UPDATE public.orders SET status = ${status} WHERE id = ${id}
    `;
    res.json({ ok: true });
    broadcast({ type: "order_status_updated", order_id: id, status });
    if (status === "cancelled" && order) {
      const payload = {
        type: "order_cancelled",
        order_id: id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        total: order.total,
      };
      broadcast(payload);
      await createAdminNotification(payload);
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// User cancel own order (only when status is pending)
app.patch("/api/orders/:id/cancel", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const rows = await sql`
      SELECT id, user_id, status, customer_name, customer_phone, total FROM public.orders WHERE id = ${id} LIMIT 1
    `;
    const order = rows[0];
    if (!order) {
      return sendError(res, 404, "Order not found");
    }
    if (order.user_id !== userId) {
      return sendError(res, 403, "You can only cancel your own orders");
    }
    if (order.status !== "pending") {
      return sendError(res, 400, "Only pending orders can be cancelled");
    }

    await sql`
      UPDATE public.orders SET status = 'cancelled' WHERE id = ${id}
    `;
    res.json({ ok: true });
    broadcast({ type: "order_status_updated", order_id: id, status: "cancelled" });
    const payload = {
      type: "order_cancelled",
      order_id: id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total: order.total,
    };
    broadcast(payload);
    await createAdminNotification(payload);
  } catch (e) {
    console.error("Cancel order error:", e);
    sendError(res, 500, "Failed to cancel order", e?.message);
  }
});

app.delete("/api/menu-items/:id", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM public.menu_items WHERE id = ${id}`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/admin/notifications", auth, ensureAdmin, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, type, order_id, customer_name, customer_phone, total, created_at, read
      FROM public.admin_notifications
      ORDER BY created_at DESC
      LIMIT 50
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.patch("/api/admin/notifications/:id/read", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await sql`
      UPDATE public.admin_notifications SET read = true WHERE id = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.patch("/api/admin/notifications/read-all", auth, ensureAdmin, async (_req, res) => {
  try {
    await sql`
      UPDATE public.admin_notifications SET read = true WHERE read = false
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/admin/notifications", auth, ensureAdmin, async (_req, res) => {
  try {
    await sql`
      DELETE FROM public.admin_notifications
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/menu-items", auth, ensureAdmin, async (req, res) => {
  try {
    const {
      name,
      description = null,
      price,
      category_id,
      image_url = null,
      is_available = true,
      is_weekend_only = false,
    } = req.body;

    if (!name || !category_id || price === undefined || price === null || price === "") {
      return res.status(400).json({ error: "Missing required fields: name, price, category_id" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    const id = randomUUID();
    const inserted = await sql`
      INSERT INTO public.menu_items
      (id, name, description, price, category_id, image_url, is_available, is_weekend_only)
      VALUES (${id}, ${name}, ${description}, ${numericPrice}, ${category_id}, ${image_url}, ${is_available}, ${is_weekend_only})
      RETURNING *
    `;
    res.status(201).json(inserted[0]);
  } catch (e) {
    console.error("Error creating menu item:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch("/api/menu-items/:id", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category_id,
      image_url,
      is_available,
      is_weekend_only,
      sort_order,
    } = req.body;
    await sql`
      UPDATE public.menu_items
      SET
        ${name !== undefined ? sql`name = ${name},` : sql``}
        ${description !== undefined ? sql`description = ${description},` : sql``}
        ${price !== undefined ? sql`price = ${price},` : sql``}
        ${category_id !== undefined ? sql`category_id = ${category_id},` : sql``}
        ${image_url !== undefined ? sql`image_url = ${image_url},` : sql``}
        ${is_available !== undefined ? sql`is_available = ${is_available},` : sql``}
        ${is_weekend_only !== undefined ? sql`is_weekend_only = ${is_weekend_only},` : sql``}
        ${sort_order !== undefined ? sql`sort_order = ${sort_order},` : sql``}
        updated_at = now()
      WHERE id = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.patch("/api/menu-items/:id/availability", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    await sql`
      UPDATE public.menu_items SET is_available = ${is_available} WHERE id = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.patch("/api/delivery-settings/:id", auth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_fee,
      is_delivery_enabled,
      is_pay_on_delivery_enabled,
      opening_time,
      closing_time,
      delivery_area,
    } = req.body;
    await sql`
      UPDATE public.delivery_settings
      SET delivery_fee = ${delivery_fee},
          is_delivery_enabled = ${is_delivery_enabled},
          is_pay_on_delivery_enabled = ${is_pay_on_delivery_enabled},
          opening_time = ${opening_time},
          closing_time = ${closing_time},
          delivery_area = ${delivery_area},
          updated_at = now()
      WHERE id = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/admin/seed", auth, ensureAdmin, async (_req, res) => {
  try {
    const categories = [
      { name: "Main Dishes", description: "Signature meals", sort_order: 1 },
      { name: "Sides", description: "Perfect complements", sort_order: 2 },
      { name: "Drinks", description: "Refreshing beverages", sort_order: 3 },
    ];
    for (const c of categories) {
      const id = randomUUID();
      await sql`
        INSERT INTO public.menu_categories (id, name, description, sort_order, is_active, created_at)
        SELECT ${id}, ${c.name}, ${c.description}, ${c.sort_order}, true, now()
        WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE name = ${c.name})
      `;
    }
    const [main] = await sql`SELECT id FROM public.menu_categories WHERE name = ${"Main Dishes"} LIMIT 1`;
    const [sides] = await sql`SELECT id FROM public.menu_categories WHERE name = ${"Sides"} LIMIT 1`;
    const [drinks] = await sql`SELECT id FROM public.menu_categories WHERE name = ${"Drinks"} LIMIT 1`;
    const items = [
      { name: "Jollof Rice with Chicken", price: 35, category_id: main?.id, description: "Spicy jollof with grilled chicken" },
      { name: "Waakye Special", price: 30, category_id: main?.id, description: "Waakye with stew and protein" },
      { name: "Fried Plantain", price: 10, category_id: sides?.id, description: "Golden, crispy plantain" },
      { name: "Coleslaw", price: 8, category_id: sides?.id, description: "Fresh crunchy slaw" },
      { name: "Sobolo", price: 12, category_id: drinks?.id, description: "Hibiscus drink chilled" },
      { name: "Bissap", price: 12, category_id: drinks?.id, description: "Sweet refreshing beverage" },
    ].filter((i) => i.category_id);
    for (const it of items) {
      const id = randomUUID();
      await sql`
        INSERT INTO public.menu_items (id, category_id, name, description, price, is_available, is_weekend_only, sort_order, created_at, updated_at)
        SELECT ${id}, ${it.category_id}, ${it.name}, ${it.description}, ${it.price}, true, false, 0, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE name = ${it.name})
      `;
    }
    await sql`
      INSERT INTO public.delivery_settings (id, delivery_fee, is_delivery_enabled, is_pay_on_delivery_enabled, min_order_amount, opening_time, closing_time, delivery_area, updated_at)
      SELECT ${randomUUID()}, 10.00, true, true, 0, '10:00:00', '22:00:00', 'Tamale', now()
      WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings)
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});
