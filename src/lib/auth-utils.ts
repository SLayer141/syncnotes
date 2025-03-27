import { randomBytes } from "crypto";

export function generateOTP(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isOTPExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}

export function getOTPExpiryDate(): Date {
  // OTP expires in 10 minutes
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 10);
  return expiryDate;
} 