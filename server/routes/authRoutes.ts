import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  authenticate,
  authorize,
  hashPassword,
  signToken,
  toPublicUser,
  verifyPassword,
  type AuthenticatedRequest,
} from '../middleware/auth.ts';
import { dataStore } from '../services/dataStore.ts';

export const authRouter = Router();
export const usersRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

authRouter.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('role')
      .optional()
      .isIn(['student', 'faculty'])
      .withMessage('Self-registration supports student or faculty roles.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
      return;
    }

    try {
      const { name, email, password, role = 'student', department } = req.body;
      const passwordHash = await hashPassword(password);
      const user = await dataStore.createUser({
        name,
        email,
        passwordHash,
        role,
        department: department || 'Computer Science & Engineering',
      });

      const token = signToken(user);
      res.status(201).json({
        token,
        user: toPublicUser(user),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      res.status(409).json({ error: msg });
    }
  }
);

authRouter.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    try {
      const { email, password } = req.body;
      const user = await dataStore.findUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = signToken(user);
      res.json({
        token,
        user: toPublicUser(user),
      });
    } catch {
      res.status(500).json({ error: 'Authentication service error.' });
    }
  }
);

authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  const studentProfile =
    req.user?.role === 'student'
      ? await dataStore.findStudentByUserOrEmail(req.user.id, req.user.email)
      : null;

  res.json({
    user: req.user,
    studentProfile,
  });
});

authRouter.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('department').optional().trim().isLength({ max: 120 }),
    body('newPassword').optional().isLength({ min: 6 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }
    try {
      const patch: Record<string, string> = {};
      if (req.body.name) patch.name = req.body.name;
      if (req.body.department) patch.department = req.body.department;
      if (req.body.newPassword) {
        patch.passwordHash = await hashPassword(req.body.newPassword);
      }
      const updated = await dataStore.updateUser(req.user!.id, patch);
      if (!updated) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.json({ user: toPublicUser(updated) });
    } catch {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
);

// -------------------- ADMIN USER MANAGEMENT --------------------
usersRouter.get('/', authenticate, authorize('admin'), async (_req, res) => {
  const users = await dataStore.listUsers();
  res.json({ users: users.map(toPublicUser) });
});

usersRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').isIn(['admin', 'faculty', 'student']).withMessage('Invalid role.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }
    try {
      const passwordHash = await hashPassword(req.body.password);
      const user = await dataStore.createUser({
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: req.body.role,
        department: req.body.department || 'Computer Science & Engineering',
      });
      res.status(201).json({ user: toPublicUser(user) });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to create user.' });
    }
  }
);

usersRouter.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('role').optional().isIn(['admin', 'faculty', 'student']),
    body('department').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }
    const updated = await dataStore.updateUser(req.params.id, {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.role ? { role: req.body.role } : {}),
      ...(req.body.department !== undefined ? { department: req.body.department } : {}),
    });
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: toPublicUser(updated) });
  }
);

usersRouter.delete('/:id', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  if (req.params.id === req.user?.id) {
    res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
    return;
  }
  const deleted = await dataStore.deleteUser(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ deleted: true });
});
