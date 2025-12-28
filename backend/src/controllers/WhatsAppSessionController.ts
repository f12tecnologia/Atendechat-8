import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import ApiIntegration from "../models/ApiIntegration";
import EvolutionApiService from "../services/EvolutionApiService/EvolutionApiService";
import { logger } from "../utils/logger";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    companyId,
    whatsappData: { session: "" }
  });

  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // Verificar se é conexão Evolution API
  if (whatsapp.provider === "evolution" && whatsapp.apiIntegrationId) {
    try {
      const apiIntegration = await ApiIntegration.findOne({
        where: {
          id: whatsapp.apiIntegrationId,
          type: "evolution",
          isActive: true
        }
      });

      if (apiIntegration && apiIntegration.baseUrl && apiIntegration.apiKey) {
        // O campo session contém o instanceName real para conexões Evolution
        // Só tenta logout se session estiver preenchido com o instanceName correto
        const instanceName = whatsapp.session;
        
        if (instanceName && instanceName.length > 0) {
          const evolutionService = new EvolutionApiService({
            baseUrl: apiIntegration.baseUrl,
            apiKey: apiIntegration.apiKey
          });

          logger.info(`Disconnecting Evolution instance: ${instanceName}`);
          
          try {
            await evolutionService.logoutInstance(instanceName);
            logger.info(`Evolution instance logged out: ${instanceName}`);
          } catch (logoutError: any) {
            // Ignorar erros de logout (instância pode já estar desconectada ou não existir)
            logger.warn(`Failed to logout Evolution instance: ${logoutError.message}`);
          }
        } else {
          logger.warn(`Evolution instance name (session) not set for whatsapp ${whatsapp.id}, skipping API logout`);
        }
      } else {
        logger.warn(`Evolution API integration not found or missing credentials for whatsapp ${whatsapp.id}`);
      }

      await whatsapp.update({ status: "DISCONNECTED", session: "" });
      return res.status(200).json({ message: "Session disconnected." });
    } catch (error: any) {
      logger.error(`Error disconnecting Evolution session: ${error.message}`);
      await whatsapp.update({ status: "DISCONNECTED", session: "" });
      return res.status(200).json({ message: "Session disconnected (local only)." });
    }
  }

  // Conexão Baileys local
  if (whatsapp.session) {
    try {
      await whatsapp.update({ status: "DISCONNECTED", session: "" });
      const wbot = getWbot(whatsapp.id);
      await wbot.logout();
    } catch (error: any) {
      logger.warn(`Failed to logout Baileys session: ${error.message}`);
      await whatsapp.update({ status: "DISCONNECTED", session: "" });
    }
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
