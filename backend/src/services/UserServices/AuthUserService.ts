import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Setting from "../../models/Setting";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  companyId: number;
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  console.log(`[AUTH] Attempting login for email: ${email}`);
  
  const user = await User.findOne({
    where: { email },
    include: ["queues", { model: Company, include: [{ model: Setting }] }]
  });

  if (!user) {
    console.log(`[AUTH] User not found: ${email}`);
    throw new AppError("ERR_USER_DONT_EXISTS", 401);
  }

  console.log(`[AUTH] User found: ${user.name} (ID: ${user.id})`);
  
  const passwordValid = await user.checkPassword(password);
  console.log(`[AUTH] Password validation result: ${passwordValid}`);
  
  if (!passwordValid) {
    console.log(`[AUTH] Invalid password for user: ${email}`);
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = await SerializeUser(user);

  console.log(`[AUTH] Login successful for user: ${email}`);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
