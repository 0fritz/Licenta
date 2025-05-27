import { Request } from "express";

export interface OtpRecord {
    email: string;
    code: string;
    expires_at: number;
  }

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role?: string;
  };
}
