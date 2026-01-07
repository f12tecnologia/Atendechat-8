import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import CreateEvolutionWhatsAppService from "../services/WhatsappService/CreateEvolutionWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import EvolutionApiService from "../services/EvolutionApiService/EvolutionApiService";
import ApiIntegration from "../models/ApiIntegration";
import { logger } from "../utils/logger";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  //sendIdQueue?: number;
  //timeSendQueue?: number;
  transferQueueId?: number;
  timeToTransfer?: number;  
  promptId?: number;
  maxUseBotQueues?: number;
  timeUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  integrationId?: number
}

interface QueryParams {
  session?: number | string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListWhatsAppsService({ companyId, session });

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    token,
    //timeSendQueue,
    //sendIdQueue,
          transferQueueId,
          timeToTransfer,
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    integrationId
  }: WhatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    companyId,
    token,
    //timeSendQueue,
    //sendIdQueue,
          transferQueueId,
          timeToTransfer,       
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    integrationId
  });

  StartWhatsAppSession(whatsapp, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const storeEvolution = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    queueIds,
    apiIntegrationId,
    connectionType,
    cloudApiToken,
    cloudApiNumberId,
    cloudApiBusinessId
  }: WhatsappData & { 
    apiIntegrationId: number; 
    connectionType?: "baileys" | "cloudapi" | "evolution";
    cloudApiToken?: string;
    cloudApiNumberId?: string;
    cloudApiBusinessId?: string;
  } = req.body;
  const { companyId } = req.user;

  const { whatsapp, qrcode, oldDefaultWhatsapp } = await CreateEvolutionWhatsAppService({
    name,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    queueIds,
    companyId,
    apiIntegrationId,
    connectionType,
    cloudApiToken,
    cloudApiNumberId,
    cloudApiBusinessId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json({ whatsapp, qrcode });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const { session } = req.query;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, session);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  await ShowWhatsAppService(whatsappId, companyId);

  await DeleteWhatsAppService(whatsappId);
  removeWbot(+whatsappId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};

export const reconfigureWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  try {
    const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

    if (!whatsapp) {
      return res.status(404).json({ error: "ERR_WHATSAPP_NOT_FOUND" });
    }

    if (whatsapp.provider !== "evolution") {
      return res.status(400).json({ error: "ERR_NOT_EVOLUTION_CONNECTION" });
    }

    if (!whatsapp.apiIntegrationId) {
      return res.status(400).json({ error: "ERR_NO_API_INTEGRATION" });
    }

    const apiIntegration = await ApiIntegration.findOne({
      where: { id: whatsapp.apiIntegrationId, companyId }
    });

    if (!apiIntegration) {
      return res.status(404).json({ error: "ERR_API_INTEGRATION_NOT_FOUND" });
    }

    const evolutionService = new EvolutionApiService({
      baseUrl: apiIntegration.baseUrl,
      apiKey: apiIntegration.apiKey
    });

    const instanceName = whatsapp.session || whatsapp.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const BACKEND_URL = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : (process.env.BACKEND_URL || "http://localhost:5000");

    const webhookUrl = `${BACKEND_URL}/api-integrations/webhook/${companyId}`;

    logger.info(`[reconfigureWebhook] Reconfiguring webhook for ${instanceName}`);
    logger.info(`[reconfigureWebhook] Webhook URL: ${webhookUrl}`);

    await evolutionService.setWebhook(instanceName, webhookUrl);

    return res.status(200).json({ 
      message: "Webhook reconfigured successfully",
      instanceName,
      webhookUrl,
      webhookBase64: true
    });
  } catch (error: any) {
    logger.error(`[reconfigureWebhook] Error: ${error.message}`);
    return res.status(500).json({ 
      error: "ERR_RECONFIGURE_WEBHOOK",
      message: error.message 
    });
  }
};
