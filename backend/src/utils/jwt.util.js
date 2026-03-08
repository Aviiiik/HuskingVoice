import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
dotenv.config();
if(!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('Error: JWT secrets are not set in .env');
  process.exit(1); // exit immediately so you notice the problem
}

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const generateAccessToken = (user) => jwt.sign(
  { sub: user._id.toString(), role: user.role },
  ACCESS_SECRET,
  { expiresIn: '30m' }   // ← short!
);

export const generateRefreshToken = (userId) => jwt.sign(
  { sub: userId.toString() },
  REFRESH_SECRET,
  { expiresIn: '14d' }
);

export const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);