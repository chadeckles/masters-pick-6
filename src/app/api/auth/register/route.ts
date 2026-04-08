import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashSync } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "900", "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Input length limits
    if (name.length > 50 || email.length > 100 || password.length > 128) {
      return NextResponse.json(
        { error: "Input too long" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Sanitize name — strip HTML tags
    const cleanName = name.replace(/<[^>]*>/g, "").trim();
    if (!cleanName) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email exists
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const id = uuid();
    const passwordHash = hashSync(password, 12);

    db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).run(id, cleanName, email.toLowerCase(), passwordHash);

    await createSession({ userId: id, name: cleanName, email: email.toLowerCase() });

    return NextResponse.json({ id, name: cleanName, email: email.toLowerCase() });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
