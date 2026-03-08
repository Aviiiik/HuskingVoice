import express from 'express';
import AuthService from '../services/auth.service.js';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../utils/jwt.util.js';

const router = express.Router();
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await AuthService.register({ name, email, password, role });

    // Optional: auto-login after registration
   const tokens = {
      accessToken: generateAccessToken(user),
      refreshToken: generateRefreshToken(user._id),
    };
    console.log('User registered:', tokens);
    res.status(201).json({
     ...tokens,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: 'Registration successful',
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const tokens = await AuthService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await AuthService.getMe(decoded.sub);
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});
export default router;