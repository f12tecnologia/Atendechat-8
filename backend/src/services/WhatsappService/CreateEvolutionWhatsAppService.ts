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
  connectionType?: "baileys" | "cloudapi" | "evolution";
  cloudApiToken?: string;
  cloudApiNumberId?: string;
  cloudApiBusinessId?: string;
}

interface Response {
  whatsapp: Whatsapp;
  qrcode: string | null;
  oldDefaultWhatsapp: Whatsapp | null;
}

const getWebhookEventsForConnectionType = (connectionType: string): string[] => {
  const baseEvents = [
    "QRCODE_UPDATED",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE"
  ];

  if (connectionType === "cloudapi") {
    return [
      ...baseEvents,
      "MESSAGES_SET",
      "SEND_MESSAGE",
      "MESSAGES_DELETE",
      "PRESENCE_UPDATE",
      "CHATS_SET",
      "CHATS_UPSERT",
      "CHATS_UPDATE",
      "CHATS_DELETE",
      "CONTACTS_SET",
      "CONTACTS_UPSERT",
      "CONTACTS_UPDATE"
    ];
  }

  if (connectionType === "baileys") {
    return [
      ...baseEvents,
      "MESSAGES_SET",
      "SEND_MESSAGE",
      "CONTACTS_SET",
      "CONTACTS_UPSERT",
      "CONTACTS_UPDATE",
      "PRESENCE_UPDATE",
      "CHATS_SET",
      "CHATS_UPSERT",
      "CHATS_UPDATE",
      "CHATS_DELETE",
      "GROUPS_UPSERT",
      "GROUP_UPDATE",
      "GROUP_PARTICIPANTS_UPDATE",
      "CALL"
    ];
  }

  return baseEvents;
};

const CreateEvolutionWhatsAppService = async ({
  name,
  companyId,
  apiIntegrationId,
  queueIds = [],
  greetingMessage = "",
  complationMessage = "",
  outOfHoursMessage = "",
  ratingMessage = "",
  isDefault = false,
  connectionType = "evolution",
  cloudApiToken,
  cloudApiNumberId,
  cloudApiBusinessId
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

  if (connectionType === "cloudapi") {
    if (!cloudApiToken || !cloudApiNumberId || !cloudApiBusinessId) {
      throw new AppError("ERR_CLOUDAPI_MISSING_CREDENTIALS", 400);
    }
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

  const BACKEND_URL = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : (process.env.BACKEND_URL || "http://localhost:5000");

    const webhookUrl = `${BACKEND_URL}/api-integrations/webhook/${companyId}`;

    logger.info(`[CreateEvolution] Configuring webhook: ${webhookUrl}`);

    const createInstanceParams: any = {
      instanceName,
      token: apiIntegration.apiKey,
      qrcode: true,
      webhookUrl,
      webhookEvents: [
        "MESSAGES_UPSERT",
        "CONNECTION_UPDATE",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE"
      ],
      webhookByEvents: true,
      webhookBase64: true
    };

    logger.info(`[CreateEvolution] Webhook events: ${JSON.stringify(createInstanceParams.webhookEvents)}`);

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

  const webhookEvents = getWebhookEventsForConnectionType(connectionType);
  logger.info(`Using connection type: ${connectionType} with ${webhookEvents.length} webhook events`);

  try {
    if (!instanceExists) {
      logger.info(`Evolution API - Creating instance: ${instanceName} (type: ${connectionType})`);

      const createInstanceParams: any = {
        instanceName,
        qrcode: connectionType !== "cloudapi",
        webhookUrl,
        webhookEvents,
        webhookByEvents: true,
        webhookBase64: true
      };

      if (connectionType === "cloudapi") {
        createInstanceParams.integration = "WHATSAPP-BUSINESS";
        createInstanceParams.token = cloudApiToken;
        createInstanceParams.number = cloudApiNumberId;
        createInstanceParams.businessId = cloudApiBusinessId;
        logger.info(`Cloud API params: token=${cloudApiToken ? "***" : "missing"}, number=${cloudApiNumberId}, businessId=${cloudApiBusinessId}`);
      } else {
        createInstanceParams.integration = "WHATSAPP-BAILEYS";
      }

      await evolutionService.createInstance(createInstanceParams);
      logger.info(`Evolution instance created: ${instanceName}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      logger.info(`Evolution instance already exists: ${instanceName}`);
    }

    if (connectionType !== "cloudapi") {
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
    }

    const initialStatus = connectionType === "cloudapi" ? "CONNECTED" : "PENDING";

    const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
      name,
      status: initialStatus,
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

    const updateData: any = {
      session: instanceName,
      qrcode: qrcode || "",
      connectionType
    };

    if (connectionType === "cloudapi") {
      updateData.cloudApiToken = cloudApiToken;
      updateData.cloudApiNumberId = cloudApiNumberId;
      updateData.cloudApiBusinessId = cloudApiBusinessId;
    }

    await whatsapp.update(updateData);

    logger.info(`WhatsApp connection created: ${name} (type: ${connectionType}, status: ${initialStatus})`);

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