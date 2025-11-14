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
    logger.error(`Error getting QR code for integration:`, {
      message: error.message,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: "Error getting QR code",
      message: error.message,
      details: error.response?.data || error.message
    });
  }
};

export const getConnectionStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { integrationId } = req.params;
    const { instanceName } = req.body;
    const { companyId } = req.user;

    if (!instanceName) {
      return res.status(400).json({ error: "Instance name is required" });
    }

    // Tenta buscar a integração
    let integration;
    try {
      integration = await ShowApiIntegrationService({
        id: integrationId,
        companyId
      });
    } catch (showError: any) {
      // Se a integração não existe (AppError ERR_NO_INTEGRATION_FOUND), retorna 404 específico
      if (showError.message === "ERR_NO_INTEGRATION_FOUND") {
        logger.warn(`[getConnectionStatus] Integration ${integrationId} not found for company ${companyId}`);
        return res.status(404).json({ 
          error: "ERR_INTEGRATION_NOT_FOUND",
          message: "Integração Evolution API não encontrada. Por favor, crie uma integração primeiro na página 'Integrações Evolution API'."
        });
      }
      // Outro erro, repropaga
      throw showError;
    }

    if (integration.type !== "evolution") {
      return res.status(400).json({ error: "Integration is not Evolution API type" });
    }

    const EvolutionApiService = require("../services/EvolutionApiService/EvolutionApiService").default;
    const evolutionService = new EvolutionApiService({
      baseUrl: integration.baseUrl,
      apiKey: integration.apiKey
    });

    logger.info(`[getConnectionStatus] Checking status for instance: ${instanceName}`);

    // Primeiro verifica o status da conexão
    try {
      const statusData = await evolutionService.getInstanceStatus(instanceName);
      
      logger.info(`[getConnectionStatus] Instance status:`, statusData);

      // Status válidos que indicam conexão ativa (em UPPERCASE)
      const connectedStates = ["OPEN", "CONNECTED", "CONNECTED_RESTORE"];
      const rawState = statusData.state || statusData.instance?.state;
      const state = rawState?.toString().toUpperCase();
      
      logger.info(`[getConnectionStatus] State normalized: ${rawState} → ${state}`);
      
      // Se já está conectada, retorna o status
      if (state && connectedStates.includes(state)) {
        return res.status(200).json({
          connected: true,
          status: statusData,
          message: "Conexão já está ativa",
          instanceName: instanceName
        });
      }
    } catch (statusError: any) {
      // Se não conseguir pegar o status, a instância pode não existir
      logger.warn(`[getConnectionStatus] Could not get status, instance may not exist: ${statusError.message}`);
    }

    // Se não está conectada, busca o QR code
    logger.info(`[getConnectionStatus] Instance not connected, fetching QR code...`);
    const qrcodeData = await evolutionService.getQrCode(instanceName);

    return res.status(200).json({
      connected: false,
      qrcode: qrcodeData.qrcode?.code || qrcodeData.code,
      base64: qrcodeData.qrcode?.base64 || qrcodeData.base64,
      pairingCode: qrcodeData.qrcode?.pairingCode || qrcodeData.pairingCode,
      message: "Leia o QR Code para conectar",
      instanceName: instanceName
    });
  } catch (error: any) {
    logger.error(`Error getting connection status:`, {
      message: error.message,
      statusCode: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: "Error getting connection status",
      message: error.response?.data?.message || error.message,
      details: error.response?.data || error.message
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
