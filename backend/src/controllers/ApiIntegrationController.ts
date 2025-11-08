import { Request, Response } from "express";
import CreateApiIntegrationService from "../services/ApiIntegrationServices/CreateApiIntegrationService";
import ListApiIntegrationsService from "../services/ApiIntegrationServices/ListApiIntegrationsService";
import ShowApiIntegrationService from "../services/ApiIntegrationServices/ShowApiIntegrationService";
import UpdateApiIntegrationService from "../services/ApiIntegrationServices/UpdateApiIntegrationService";
import DeleteApiIntegrationService from "../services/ApiIntegrationServices/DeleteApiIntegrationService";
import ProcessEvolutionWebhookService from "../services/EvolutionApiService/ProcessEvolutionWebhookService";
import { logger } from "../utils/logger";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { type, searchParam, pageNumber } = req.query as {
    type?: string;
    searchParam?: string;
    pageNumber?: string;
  };

  logger.info(`[API Integration] GET /api-integrations - companyId: ${companyId}, type: ${type}`);

  const { integrations, count, hasMore } = await ListApiIntegrationsService({
    companyId,
    type,
    searchParam,
    pageNumber: pageNumber ? parseInt(pageNumber, 10) : 1
  });

  logger.info(`[API Integration] Found ${integrations.length} integrations for company ${companyId}`);

  return res.status(200).json({ apiIntegrations: integrations, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    type,
    baseUrl,
    apiKey,
    instanceName,
    isActive,
    webhookUrl,
    config,
    credentials
  } = req.body;

  const integration = await CreateApiIntegrationService({
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

  return res.status(200).json(integration);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;
  const { companyId } = req.user;

  const integration = await ShowApiIntegrationService({
    id: integrationId,
    companyId
  });

  return res.status(200).json(integration);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;
  const { companyId } = req.user;
  const integrationData = req.body;

  const integration = await UpdateApiIntegrationService({
    integrationData,
    integrationId,
    companyId
  });

  return res.status(200).json(integration);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;
  const { companyId } = req.user;

  await DeleteApiIntegrationService({
    id: integrationId,
    companyId
  });

  return res.status(200).json({ message: "Integration deleted" });
};

export const getQrCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { integrationId } = req.params;
    const { companyId } = req.user;

    const integration = await ShowApiIntegrationService({
      id: integrationId,
      companyId
    });

    if (integration.type !== "evolution") {
      return res.status(400).json({ error: "Integration is not Evolution API type" });
    }

    const EvolutionApiService = require("../services/EvolutionApiService/EvolutionApiService").default;
    const evolutionService = new EvolutionApiService({
      baseUrl: integration.baseUrl,
      apiKey: integration.apiKey
    });

    const qrcodeData = await evolutionService.connectInstance(integration.instanceName);

    return res.status(200).json({
      qrcode: qrcodeData.code,
      pairingCode: qrcodeData.pairingCode
    });
  } catch (error: any) {
    logger.error(`Error getting QR code for integration: ${error}`);
    return res.status(500).json({ 
      error: "Error getting QR code",
      message: error.message 
    });
  }
};

export const webhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const webhookData = req.body;
    const { companyId } = req.params;

    logger.info(`Evolution API webhook received: ${JSON.stringify(webhookData)}`);

    await ProcessEvolutionWebhookService(webhookData, parseInt(companyId, 10));

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error(`Error processing webhook: ${error}`);
    return res.status(500).json({ error: "Error processing webhook" });
  }
};
