import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import FindUserFromToken from "../services/AuthServices/FindUserFromToken";
import User from "../models/User";
import Company from "../models/Company";
import Plan from "../models/Plan";
import moment from "moment";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  const { token, serializedUser, refreshToken } = await AuthUserService({
    email,
    password
  });

  SendRefreshToken(res, refreshToken);

  const io = getIO();
  io.to(`user-${serializedUser.id}`).emit(`company-${serializedUser.companyId}-auth`, {
    action: "update",
    user: {
      id: serializedUser.id,
      email: serializedUser.email,
      companyId: serializedUser.companyId
    }
  });

  return res.status(200).json({
    token,
    refreshToken,
    user: serializedUser
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const token: string = req.cookies.jrt || req.body.refreshToken;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  const company = await Company.findByPk(user.companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (company && company.dueDate) {
    const dueDate = moment(company.dueDate, "YYYY-MM-DD");
    const today = moment().format("YYYY-MM-DD");

    if (dueDate.isBefore(today)) {
      throw new AppError(
        `Opss! Sua assinatura venceu em ${dueDate.format("DD/MM/YYYY")}.\nEntre em contato com o Suporte para mais informações!`,
        401
      );
    }
  }

  SendRefreshToken(res, refreshToken);

  return res.json({ token: newToken, refreshToken, user });
};

export const me = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const token: string = req.cookies.jrt;
  const user = await FindUserFromToken(token);
  const { id, profile, super: superAdmin } = user;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  return res.json({ id, profile, super: superAdmin });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { user } = req;

  const token = req.headers.authorization?.replace("Bearer ", "").trim();

  const userId = user.id;

  await User.update({ online: false }, { where: { id: userId } });

  SendRefreshToken(res, "");

  const io = getIO();
  io.emit(`company-${user.companyId}-user`, {
    action: "update",
    user
  });

  return res.json({ message: "USER_LOGOUT" });
};