import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";

interface Request {
  id: string | number;
  companyId: number;
}

const ShowApiIntegrationService = async ({
  id,
  companyId
}: Request): Promise<ApiIntegration> => {
  const integration = await ApiIntegration.findOne({
    where: { id, companyId }
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  return integration;
};

export default ShowApiIntegrationService;
