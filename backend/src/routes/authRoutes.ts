import { Router } from 'express';
import {
  register,
  loginUser,
  logoutUser,
  refreshToken,
  getCurrentUser,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, loginUser);
router.post('/logout', authenticate, logoutUser);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getCurrentUser);

export default router;
