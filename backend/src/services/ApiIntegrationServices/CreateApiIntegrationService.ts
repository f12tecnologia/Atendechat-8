import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

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
