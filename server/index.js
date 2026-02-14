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

const app = express();
const port = process.env.PORT;
const sql = neon(config.DATABASE_URL);

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
app.use(helmet());
app.use(morgan("combined"));
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS || 60_000,
    max: config.RATE_LIMIT_MAX || 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json());

const signToken = (payload) => jwt.sign(payload, config.JWT_SECRET, { expiresIn: "24h" });
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
};

await ensureTables();

const sseClients = new Set();
const broadcast = (event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
};

// Per-route limiter for auth endpoints
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Anti-bruteforce tracking (in-memory)
const loginAttempts = new Map(); // key: email|ip -> { count, blockedUntil }
const getKey = (email, ip) => `${email}|${ip || "unknown"}`;
const isBlocked = (email, ip) => {
  const key = getKey(email, ip);
  const rec = loginAttempts.get(key);
  return rec && rec.blockedUntil && rec.blockedUntil > Date.now();
};
const recordFailure = (email, ip) => {
  const key = getKey(email, ip);
  const rec = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= 5) {
    rec.blockedUntil = Date.now() + 15 * 60_000; // 15 minutes
    rec.count = 0;
  }
  loginAttempts.set(key, rec);
};
const clearFailures = (email, ip) => {
  loginAttempts.delete(getKey(email, ip));
};
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

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

app.post("/api/auth/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Unable to process request" });
    const email = normalizeEmail(parsed.data.email);
    const existing = await sql`SELECT id FROM public.users WHERE email = ${email} LIMIT 1`;
    if (existing.length) return res.status(400).json({ error: "Unable to process request" });
    const id = randomUUID();
    const hash = await bcrypt.hash(parsed.data.password, 12);
    await sql`INSERT INTO public.users (id, email, password_hash, full_name) VALUES (${id}, ${email}, ${hash}, ${parsed.data.full_name || null})`;
    await sql`INSERT INTO public.user_roles (user_id, role) VALUES (${id}, ${"customer"})`;
    const roles = ["customer"];
    const token = signToken({ id, email, roles });
    res.status(201).json({ token, user: { id, email }, roles });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const ip = req.ip;
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });
    const email = normalizeEmail(parsed.data.email);
    if (isBlocked(email, ip)) return res.status(429).json({ error: "Invalid credentials" });
    const rows = await sql`SELECT id, password_hash FROM public.users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user) {
      recordFailure(email, ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!ok) {
      recordFailure(email, ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const roleRows = await sql`SELECT role FROM public.user_roles WHERE user_id = ${user.id}`;
    const roles = roleRows.map((r) => r.role);
    const token = signToken({ id: user.id, email, roles });
    res.json({ token, user: { id: user.id, email }, roles });
    clearFailures(email, ip);
  } catch (e) {
    res.status(500).json({ error: String(e) });
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
    res.status(500).json({ error: "Internal server error", details: e.message });
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
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/api/orders", auth, async (req, res) => {
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
    `; } catch (e) { return res.status(500).json({ error: "create_orders_failed", message: e?.message || String(e) }); }
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
    `; } catch (e) { return res.status(500).json({ error: "create_order_items_failed", message: e?.message || String(e) }); }
    const {
      customer_name,
      customer_phone,
      delivery_address,
      order_type,
      subtotal,
      delivery_fee,
      total,
      payment_method,
      paystack_reference,
      special_instructions,
      items,
      user_id = req.user?.id ?? null,
    } = req.body;

    const allowedPaymentMethods = ["mtn", "vodafone", "airteltigo", "pay_on_delivery", "paystack"];
    if (!allowedPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    let payment_status = "pending";
    if (payment_method === "paystack") {
      if (typeof paystack_reference !== "string" || paystack_reference.trim().length === 0) {
        return res.status(400).json({ error: "Payment reference required" });
      }
      const verified = await verifyPaystackReference(paystack_reference.trim());
      if (!verified.ok) return res.status(402).json({ error: "Payment not completed" });

      const expectedMinor = Math.round(Number(total) * 100);
      if (Number.isFinite(expectedMinor) && typeof verified.amount === "number" && verified.amount !== expectedMinor) {
        return res.status(400).json({ error: "Payment amount mismatch" });
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
          await sql`
            INSERT INTO public.order_items
            (id, order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, created_at)
            VALUES (${randomUUID()}, ${order.id}, ${it.id}, ${it.name}, ${it.quantity}, ${it.price}, ${it.special_instructions ?? null}, now())
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
    res.status(500).json({ error: String(e) });
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
    await sql`
      UPDATE public.orders SET status = ${status} WHERE id = ${id}
    `;
    res.json({ ok: true });
    broadcast({ type: "order_status_updated", order_id: id, status });
  } catch (e) {
    res.status(500).json({ error: String(e) });
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
    const inserted = await sql`
      INSERT INTO public.menu_items
      (name, description, price, category_id, image_url, is_available, is_weekend_only)
      VALUES (${name}, ${description}, ${price}, ${category_id}, ${image_url}, ${is_available}, ${is_weekend_only})
      RETURNING *
    `;
    res.status(201).json(inserted[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
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
