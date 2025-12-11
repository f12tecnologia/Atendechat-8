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
    user: serializedUser
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const token: string = req.cookies.jrt;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const company = await Company.findByPk(req.user.companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (company && company.dueDate) {
    const dateToday = moment().format("YYYY-MM-DD");
    const dueDate = moment(company.dueDate).format("YYYY-MM-DD");

    if (moment(dueDate).isBefore(dateToday)) {
      throw new AppError(
        `Opss! Sua assinatura venceu ${dueDate}.\nEntre em contato com o Suporte para mais informações!`,
        401
      );
    }
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  SendRefreshToken(res, refreshToken);

  return res.json({ token: newToken, user });
};

export const me = async (req: Request, res: Response): Promise<Response> => {
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
  const { id } = req.user;
  const user = await User.findByPk(id);
  await user.update({ online: false });

  res.clearCookie("jrt");

  return res.send();
};