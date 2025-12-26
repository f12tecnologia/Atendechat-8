import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface Request {
  name: string;
  type: string;
  baseUrl: string;
  apiKey?: string;
  instanceName?: string;
  isActive?: boolean;
  webhookUrl?: string;
  config?: object;
  credentials?: object;
  companyId: number;
}

const isRecommendedBrazilianPhoneFormat = (instanceName: string): boolean => {
  const brazilianPhonePattern = /^55\d{10,11}$/;
  return brazilianPhonePattern.test(instanceName);
};

const CreateApiIntegrationService = async ({
  name,
  type,
  baseUrl,
  apiKey,
  instanceName,
  isActive = true,
  webhookUrl,
  config,
  credentials,
  companyId
}: Request): Promise<ApiIntegration> => {
  if (type === "evolution" && instanceName) {
    if (!isRecommendedBrazilianPhoneFormat(instanceName)) {
      logger.warn(`[CreateApiIntegration] instanceName '${instanceName}' does not follow recommended Brazilian phone format (55+DDD+number). This may cause issues.`);
    }
  }

  const existingIntegration = await ApiIntegration.findOne({
    where: { name, companyId }
  });

  if (existingIntegration) {
    throw new AppError("ERR_INTEGRATION_DUPLICATED");
  }

  const integration = await ApiIntegration.create({
    name,
    type,
    baseUrl,
    apiKey,
    instanceName,
    isActive,
    webhookUrl,
    config,
    credentials,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-apiIntegration`, {
    action: "create",
    apiIntegration: integration
  });

  return integration;
};

export default CreateApiIntegrationService;
