import Whatsapp from "../../models/Whatsapp";
import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";
import EvolutionApiService from "../EvolutionApiService/EvolutionApiService";
import CreateWhatsAppService from "./CreateWhatsAppService";
import { logger } from "../../utils/logger";

interface Request {
  name: string;
  companyId: number;
  apiIntegrationId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  isDefault?: boolean;
}

interface Response {
  whatsapp: Whatsapp;
  qrcode: string | null;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateEvolutionWhatsAppService = async ({
  name,
  companyId,
  apiIntegrationId,
  queueIds = [],
  greetingMessage = "",
  complationMessage = "",
  outOfHoursMessage = "",
  ratingMessage = "",
  isDefault = false
}: Request): Promise<Response> => {
  
  const apiIntegration = await ApiIntegration.findOne({
    where: {
      id: apiIntegrationId,
      companyId,
      type: "evolution",
      isActive: true
    }
  });

  if (!apiIntegration) {
    throw new AppError("ERR_NO_EVOLUTION_INTEGRATION_FOUND", 404);
  }

  const instanceName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");

  const existingWhatsapp = await Whatsapp.findOne({
    where: {
      name,
      companyId
    }
  });

  if (existingWhatsapp) {
    throw new AppError("ERR_WHATSAPP_NAME_ALREADY_EXISTS", 400);
  }

  const evolutionService = new EvolutionApiService({
    baseUrl: apiIntegration.baseUrl,
    apiKey: apiIntegration.apiKey
  });

  const webhookUrl = `${process.env.BACKEND_URL}/api-integrations/webhook/${companyId}`;

  let qrcode: string | null = null;
  let instanceExists = false;

  try {
    const instances = await evolutionService.fetchInstances();
    if (Array.isArray(instances)) {
      instanceExists = instances.some((inst: any) => 
        inst.instance?.instanceName === instanceName || 
        inst.instanceName === instanceName ||
        inst.name === instanceName
      );
    }
  } catch (e) {
    logger.warn(`Could not check existing instances: ${(e as Error).message}`);
  }

  try {
    if (!instanceExists) {
      logger.info(`Evolution API - Creating instance: ${instanceName}`);
      await evolutionService.createInstance({
        instanceName,
        qrcode: true,
        webhookUrl,
        webhookEvents: [
          "QRCODE_UPDATED",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE"
        ]
      });
      logger.info(`Evolution instance created: ${instanceName}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      logger.info(`Evolution instance already exists: ${instanceName}`);
    }

    try {
      logger.info(`Getting QR code via connect endpoint...`);
      const connectResponse = await evolutionService.connectInstance(instanceName);
      
      if (connectResponse) {
        qrcode = connectResponse.base64 || 
                 connectResponse.qrcode?.base64 || 
                 connectResponse.code || 
                 connectResponse.qrcode?.code || 
                 null;
        
        if (qrcode) {
          logger.info(`QR code obtained successfully`);
        }
      }
    } catch (connectError: any) {
      logger.warn(`Error getting QR code: ${connectError.message}`);
    }

    const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
      name,
      status: "PENDING",
      queueIds,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      isDefault,
      companyId,
      provider: "evolution",
      apiIntegrationId
    });

    await whatsapp.update({
      session: instanceName,
      qrcode: qrcode || ""
    });

    logger.info(`WhatsApp connection created: ${name}`);

    return {
      whatsapp,
      qrcode,
      oldDefaultWhatsapp
    };

  } catch (error: any) {
    logger.error("Error creating Evolution WhatsApp connection:", error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError("ERR_CREATING_EVOLUTION_WHATSAPP");
  }
};

export default CreateEvolutionWhatsAppService;
