import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

interface Request {
  id: string | number;
  companyId: number;
}

const DeleteApiIntegrationService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  const integration = await ApiIntegration.findOne({
    where: { id, companyId }
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  await integration.destroy();

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-apiIntegration`, {
    action: "delete",
    integrationId: id
  });
};

export default DeleteApiIntegrationService;
