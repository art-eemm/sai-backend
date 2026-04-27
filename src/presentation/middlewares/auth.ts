import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: number;
  name: string;
  role: string;
  email: string;
  department?: string | null;
}

export interface CustomRequest extends Request {
  user?: TokenPayload;
}

export const validateToken = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header("Authorization");

  if (!header) {
    res.status(401).json({ error: "Acceso denegado" });
    return;
  }

  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  try {
    const verified = jwt.verify(
      token,
      process.env["JWT_SECRET"] as string,
    ) as TokenPayload;
    (req as CustomRequest).user = verified;
    next();
  } catch {
    res.status(400).json({ error: "Token inválido" });
  }
};
