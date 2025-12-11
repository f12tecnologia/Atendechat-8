import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import AppError from "../errors/AppError";
import authConfig from "../config/auth";
import Company from "../models/Company";
import moment from "moment";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

const isAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile, companyId } = decoded as TokenPayload;

    const user = { id, profile, companyId };
    req.user = user;

    const company = await Company.findByPk(companyId);

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    if (company.dueDate) {
      const dueDate = moment(company.dueDate, "YYYY-MM-DD");
      const today = moment().format("YYYY-MM-DD");

      if (dueDate.isBefore(today)) {
        throw new AppError(
          `Opss! Sua assinatura venceu em ${dueDate.format("DD/MM/YYYY")}.\nEntre em contato com o Suporte para mais informações!`,
          401
        );
      }
    }

  } catch (err) {
    throw new AppError("Invalid token. We'll try to assign a new one on next request", 403 );
  }

  return next();
};

export default isAuth;