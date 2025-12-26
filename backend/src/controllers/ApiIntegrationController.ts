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

    let integration;
    try {
      integration = await ShowApiIntegrationService({
        id: integrationId,
        companyId
      });
    } catch (showError: any) {
      if (showError.message === "ERR_NO_INTEGRATION_FOUND") {
        logger.warn(`[getConnectionStatus] Integration ${integrationId} not found for company ${companyId}`);
        return res.status(404).json({ 
          error: "ERR_INTEGRATION_NOT_FOUND",
          message: "Integração Evolution API não encontrada. Por favor, crie uma integração primeiro na página 'Integrações Evolution API'."
        });
      }
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

    let statusData = null;
    let state = null;

    try {
      statusData = await evolutionService.getInstanceStatus(instanceName);
      logger.info(`[getConnectionStatus] Instance status:`, statusData);

      const connectedStates = ["OPEN", "CONNECTED", "CONNECTED_RESTORE"];
      const connectingStates = ["CONNECTING", "CLOSE", "WAITING"];
      const rawState = statusData.state || statusData.instance?.state;
      state = rawState?.toString().toUpperCase();
      
      logger.info(`[getConnectionStatus] State normalized: ${rawState} → ${state}`);
      
      if (state && connectedStates.includes(state)) {
        return res.status(200).json({
          connected: true,
          status: statusData,
          message: "Conexão já está ativa",
          instanceName: instanceName
        });
      }

      if (state && connectingStates.includes(state)) {
        logger.info(`[getConnectionStatus] Instance is connecting, fetching QR code via connect endpoint...`);
        try {
          const connectData = await evolutionService.connectInstance(instanceName);
          logger.info(`[getConnectionStatus] Connect response:`, connectData);
          
          const qrBase64 = connectData.base64 || connectData.qrcode?.base64;
          const qrCode = connectData.code || connectData.qrcode?.code;
          const pairingCode = connectData.pairingCode || connectData.qrcode?.pairingCode;
          
          if (qrBase64 || qrCode) {
            return res.status(200).json({
              connected: false,
              qrcode: qrCode,
              base64: qrBase64,
              pairingCode: pairingCode,
              message: "Leia o QR Code para conectar",
              instanceName: instanceName,
              state: state
            });
          }
        } catch (connectError: any) {
          logger.warn(`[getConnectionStatus] Connect failed, trying QR code endpoint: ${connectError.message}`);
        }
      }
    } catch (statusError: any) {
      logger.warn(`[getConnectionStatus] Could not get status, trying connect: ${statusError.message}`);
    }

    logger.info(`[getConnectionStatus] Fetching QR code via connect endpoint...`);
    try {
      const connectData = await evolutionService.connectInstance(instanceName);
      logger.info(`[getConnectionStatus] Connect response:`, connectData);
      
      const qrBase64 = connectData.base64 || connectData.qrcode?.base64;
      const qrCode = connectData.code || connectData.qrcode?.code;
      const pairingCode = connectData.pairingCode || connectData.qrcode?.pairingCode;
      
      if (qrBase64 || qrCode) {
        return res.status(200).json({
          connected: false,
          qrcode: qrCode,
          base64: qrBase64,
          pairingCode: pairingCode,
          message: "Leia o QR Code para conectar",
          instanceName: instanceName,
          state: state || "CONNECTING"
        });
      }
    } catch (connectError: any) {
      logger.warn(`[getConnectionStatus] Connect endpoint failed: ${connectError.message}`);
    }

    try {
      const qrcodeData = await evolutionService.getQrCode(instanceName);
      logger.info(`[getConnectionStatus] QR code response:`, qrcodeData);
      
      return res.status(200).json({
        connected: false,
        qrcode: qrcodeData.qrcode?.code || qrcodeData.code,
        base64: qrcodeData.qrcode?.base64 || qrcodeData.base64,
        pairingCode: qrcodeData.qrcode?.pairingCode || qrcodeData.pairingCode,
        message: "Leia o QR Code para conectar",
        instanceName: instanceName,
        state: state || "WAITING"
      });
    } catch (qrError: any) {
      logger.error(`[getConnectionStatus] All methods failed:`, qrError.message);
      return res.status(500).json({ 
        error: "Error getting QR code",
        message: "Não foi possível obter o QR Code. Verifique se a instância existe na Evolution API.",
        details: qrError.response?.data || qrError.message
      });
    }
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

export const listEvolutionInstances = async (req: Request, res: Response): Promise<Response> => {
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

    const instances = await evolutionService.fetchInstances();
    
    logger.info(`[listEvolutionInstances] Found ${instances?.length || 0} instances`);

    return res.status(200).json({ 
      instances,
      currentInstanceName: integration.instanceName
    });
  } catch (error: any) {
    logger.error(`Error listing Evolution instances:`, error.message);
    return res.status(500).json({ 
      error: "Error listing instances",
      message: error.message
    });
  }
};

export const syncEvolutionInstance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { integrationId } = req.params;
    const { companyId } = req.user;
    const { newInstanceName, deleteOld } = req.body;

    const brazilianPhonePattern = /^55\d{10,11}$/;
    let formatWarning = null;
    if (!brazilianPhonePattern.test(newInstanceName)) {
      logger.warn(`[syncEvolutionInstance] instanceName '${newInstanceName}' does not follow recommended Brazilian phone format (55+DDD+number). This may cause issues.`);
      formatWarning = "Aviso: Nome da instância não segue o formato recomendado (55+DDD+número). Isso pode causar problemas.";
    }

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

    const oldInstanceName = integration.instanceName;

    if (deleteOld && oldInstanceName && oldInstanceName !== newInstanceName) {
      try {
        await evolutionService.deleteInstance(oldInstanceName);
        logger.info(`[syncEvolutionInstance] Deleted old instance: ${oldInstanceName}`);
      } catch (deleteError: any) {
        logger.warn(`[syncEvolutionInstance] Could not delete old instance: ${deleteError.message}`);
      }
    }

    await UpdateApiIntegrationService({
      integrationData: { instanceName: newInstanceName },
      integrationId,
      companyId
    });

    logger.info(`[syncEvolutionInstance] Updated instanceName from ${oldInstanceName} to ${newInstanceName}`);

    return res.status(200).json({ 
      success: true,
      message: `Nome da instância atualizado para ${newInstanceName}`,
      warning: formatWarning,
      oldInstanceName,
      newInstanceName
    });
  } catch (error: any) {
    logger.error(`Error syncing Evolution instance:`, error.message);
    return res.status(500).json({ 
      error: "Error syncing instance",
      message: error.message
    });
  }
};

export const deleteEvolutionInstance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { integrationId } = req.params;
    const { companyId } = req.user;
    const { instanceName } = req.body;

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

    await evolutionService.deleteInstance(instanceName);
    
    logger.info(`[deleteEvolutionInstance] Deleted instance: ${instanceName}`);

    return res.status(200).json({ 
      success: true,
      message: `Instância ${instanceName} excluída com sucesso`
    });
  } catch (error: any) {
    logger.error(`Error deleting Evolution instance:`, error.message);
    return res.status(500).json({ 
      error: "Error deleting instance",
      message: error.message
    });
  }
};
