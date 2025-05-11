import {Request, Response} from "express";
import jwt from "jsonwebtoken";
import db from "../db";
import { User } from "../types/userTypes";
import dotenv from "dotenv";
import {OtpRecord} from "../types/requestTypes";

dotenv.config();

export const JWT_SECRET  = process.env.JWT_SECRET as string;

export const requestOtp = (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email){
    res.status(400).json({ error: "Email is required" });
    return;   
  } 

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // e.g., "548391"
  const expiresAt = Date.now() + 5 * 60 * 1000; // valid for 5 minutes

  db.prepare("INSERT OR REPLACE INTO otps (email, code, expires_at) VALUES (?, ?, ?)")
    .run(email, code, expiresAt);

  console.log(`OTP for ${email}: ${code}`); // ⬅️ log to console

  res.json({ message: "OTP generated and logged (check console)" });
};


export const verifyOtp = (req: Request, res: Response): void => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ error: "Email and OTP are required" });
    return;
  }

  const record = db
    .prepare("SELECT * FROM otps WHERE email = ? AND code = ?")
    .get(email, code) as OtpRecord | undefined;

  if (!record || Date.now() > record.expires_at) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  db.prepare("DELETE FROM otps WHERE email = ?").run(email); // use up OTP

  let user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;

  if (!user) {
    db.prepare("INSERT INTO users (email, name) VALUES (?, NULL)").run(email);
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User;
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name, // frontend can check if name === null
    },
  });
};
