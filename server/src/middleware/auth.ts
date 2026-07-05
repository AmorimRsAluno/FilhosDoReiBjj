import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type Role = "admin" | "teacher" | "student" | "finance";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";

if (process.env.NODE_ENV === "production" && (jwtSecret === "dev-secret" || jwtSecret.length < 32)) {
  throw new Error("JWT_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token ausente." });
  }

  try {
    req.user = jwt.verify(header.slice(7), jwtSecret) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso não autorizado." });
    }

    return next();
  };
}
