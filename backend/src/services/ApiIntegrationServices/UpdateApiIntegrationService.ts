import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface IntegrationData {
  name?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  instanceName?: string;
  isActive?: boolean;
  webhookUrl?: string;
  config?: object;
  credentials?: object;
}

interface Request {
  integrationData: IntegrationData;
  integrationId: string | number;
  companyId: number;
}

const isRecommendedBrazilianPhoneFormat = (instanceName: string): boolean => {
  const brazilianPhonePattern = /^55\d{10,11}$/;
  return brazilianPhonePattern.test(instanceName);
};

const UpdateApiIntegrationService = async ({
  integrationData,
  integrationId,
  companyId
}: Request): Promise<ApiIntegration> => {
  const integration = await ApiIntegration.findOne({
    where: { id: integrationId, companyId }
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  if (integrationData.instanceName && (integration.type === "evolution" || integrationData.type === "evolution")) {
    if (!isRecommendedBrazilianPhoneFormat(integrationData.instanceName)) {
      logger.warn(`[UpdateApiIntegration] instanceName '${integrationData.instanceName}' does not follow recommended Brazilian phone format (55+DDD+number). This may cause issues.`);
    }
  }

  await integration.update(integrationData);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-apiIntegration`, {
    action: "update",
    apiIntegration: integration
  });

  return integration;
};

export default UpdateApiIntegrationService;
