import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fleetsync-super-secret-jwt-key-ita0316-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'driver';
  driverId?: string;
  vehicleId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required or invalid format.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or token invalid.' });
  }
};

export const requireRole = (role: 'manager' | 'driver') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (req.user.role !== role && req.user.role !== 'manager') {
      // Manager has super privileges, driver can only access driver-specific
      return res.status(403).json({ error: `Forbidden: requires ${role} role.` });
    }
    next();
  };
};
