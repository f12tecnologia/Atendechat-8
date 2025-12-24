import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

const isAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // If no auth header and request accepts HTML (browser navigation), skip this route
  // This allows the frontend catch-all to handle browser navigation
  const acceptHeader = req.headers.accept || "";
  if (!authHeader && acceptHeader.includes("text/html")) {
    next("route");
    return;
  }

  if (!authHeader) {
    res.status(401).json({ error: "ERR_SESSION_EXPIRED" });
    return;
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    res.status(401).json({ error: "ERR_SESSION_EXPIRED" });
    return;
  }

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile, companyId } = decoded as TokenPayload;

    req.user = {
      id,
      profile,
      companyId
    };

    next();
  } catch (err) {
    res.status(401).json({ error: "ERR_SESSION_EXPIRED" });
  }
};

export default isAuth;