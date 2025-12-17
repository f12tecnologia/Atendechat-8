import Whatsapp from "../../models/Whatsapp";
import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import EvolutionApiService from "../EvolutionApiService/EvolutionApiService";
import { logger } from "../../utils/logger";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  // Se for conexão Evolution, deletar também na Evolution API
  if (whatsapp.provider === "evolution" && whatsapp.apiIntegrationId) {
    try {
      const apiIntegration = await ApiIntegration.findOne({
        where: {
          id: whatsapp.apiIntegrationId,
          type: "evolution",
          isActive: true
        }
      });

      if (apiIntegration) {
        const evolutionService = new EvolutionApiService({
          baseUrl: apiIntegration.baseUrl,
          apiKey: apiIntegration.apiKey
        });

        // O instanceName está no campo session ou é o nome normalizado
        const instanceName = whatsapp.session || whatsapp.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        
        logger.info(`Deleting Evolution instance: ${instanceName}`);
        await evolutionService.deleteInstance(instanceName);
        logger.info(`Evolution instance deleted: ${instanceName}`);
      }
    } catch (error: any) {
      // Log o erro mas continua com a exclusão local
      logger.warn(`Failed to delete Evolution instance: ${error.message}`);
    }
  }

  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
