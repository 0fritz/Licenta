import {Request, Response} from "express";
import jwt from "jsonwebtoken";
import db from "../db";
import { User } from "../types/userTypes";
import dotenv from "dotenv";
import {OtpRecord} from "../types/requestTypes";

dotenv.config();

export const JWT_SECRET  = process.env.JWT_SECRET as string;

export const requestOtp = (req: Request, res: Response): void => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 10000000;

  db.prepare(`
    INSERT OR REPLACE INTO otps (email, code, expires_at)
    VALUES (?, ?, ?)
  `).run(email, code, expiresAt);

  if (process.env.NODE_ENV !== "production") {
    console.log(`OTP for ${email}: ${code}`);
  }

  res.json({ message: "OTP generated" });
};



export const verifyOtp = (req: Request, res: Response): void => {
  const email = req.body.email?.trim().toLowerCase();
  const code = req.body.code;

  if (!email || !code) {
    res.status(400).json({ error: "Email and OTP code are required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  const record = db
    .prepare("SELECT * FROM otps WHERE email = ? AND code = ?")
    .get(email, code) as OtpRecord | undefined;

  if (!record || Date.now() > record.expires_at) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  // OTP is valid → remove it
  db.prepare("DELETE FROM otps WHERE email = ?").run(email);

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;

    if (user) {
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1000h" });
    
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_picture: user.profile_picture || "",
        },
        newUser: false,
      })
  } else {
    // User doesn't exist → frontend will redirect to profile creation
    const tempToken = jwt.sign({ email, action: "create-profile" }, JWT_SECRET, {
      expiresIn: "10m",
    });

    res.json({
      tempToken,
      newUser: true,
      email,
    });
  }
};
