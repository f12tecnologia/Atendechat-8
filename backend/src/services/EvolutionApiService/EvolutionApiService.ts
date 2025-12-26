import axios, { AxiosInstance } from "axios";
import { logger } from "../../utils/logger";
import ApiIntegration from "../../models/ApiIntegration";
import AppError from "../../errors/AppError";

interface EvolutionApiConfig {
  baseUrl: string;
  apiKey: string;
}

interface CreateInstanceRequest {
  instanceName: string;
  qrcode?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
}

interface SendTextMessageRequest {
  instanceName: string;
  number: string;
  text: string;
}

interface SendMediaMessageRequest {
  instanceName: string;
  number: string;
  mediatype: "image" | "video" | "audio" | "document";
  media: string;
  caption?: string;
}

class EvolutionApiService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: EvolutionApiConfig) {
    this.apiKey = config.apiKey;

    // Auto-fix URL if missing protocol
    let baseUrl = config.baseUrl.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
      logger.info(`Evolution API - Auto-fixed URL to: ${baseUrl}`);
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey
      },
      timeout: 30000
    });
  }

  async getInfo(): Promise<any> {
    try {
      const response = await this.client.get("/");
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error getting info:", error);
      throw new AppError("ERR_EVOLUTION_API_INFO");
    }
  }

  async createInstance(data: CreateInstanceRequest): Promise<any> {
    try {
      const payload: any = {
        instanceName: data.instanceName,
        qrcode: data.qrcode !== false,
        integration: "WHATSAPP-BAILEYS"
      };

      if (data.webhookUrl) {
        payload.webhook = {
          enabled: true,
          url: data.webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: data.webhookEvents || [
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPDATE",
            "MESSAGES_UPSERT",
            "SEND_MESSAGE"
          ]
        };
      }

      logger.info(`Evolution API - Creating instance: ${data.instanceName}`, { payload });
      const response = await this.client.post("/instance/create", payload);
      logger.info(`Evolution API - Instance created: ${data.instanceName}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.response?.message || error.message || "Unknown error";
      const statusCode = error.response?.status || 0;
      logger.error(`Evolution API - Error creating instance (${statusCode}): ${errorMsg}`, {
        instanceName: data.instanceName,
        error: error.response?.data || error.message,
        stack: error.stack
      });

      if (statusCode === 401) {
        throw new AppError("ERR_EVOLUTION_API_UNAUTHORIZED", 401);
      }
      throw new AppError(`ERR_EVOLUTION_API_CREATE_INSTANCE: ${errorMsg}`, statusCode || 400);
    }
  }

  async connectInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/instance/connect/${instanceName}`
      );
      logger.info(`Evolution API - Instance connected: ${instanceName}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      const statusCode = error.response?.status || 0;
      logger.error(`Evolution API - Error connecting instance (${statusCode}): ${errorMsg}`, {
        instanceName,
        error: error.response?.data || error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getQrCode(instanceName: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/instance/qrcode/${instanceName}`
      );
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      const statusCode = error.response?.status || 0;
      logger.error(`Evolution API - Error getting QR code (${statusCode}): ${errorMsg}`, {
        instanceName,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  async getInstanceStatus(instanceName: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/instance/connectionState/${instanceName}`
      );
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error getting instance status:", error);
      throw new AppError("ERR_EVOLUTION_API_GET_STATUS");
    }
  }

  async fetchInstances(): Promise<any> {
    try {
      const response = await this.client.get("/instance/fetchInstances");
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error fetching instances:", error);
      throw new AppError("ERR_EVOLUTION_API_FETCH_INSTANCES");
    }
  }

  async deleteInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.delete(
        `/instance/delete/${instanceName}`
      );
      logger.info(`Evolution API - Instance deleted: ${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error deleting instance:", error);
      throw new AppError("ERR_EVOLUTION_API_DELETE_INSTANCE");
    }
  }

  async logoutInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.delete(
        `/instance/logout/${instanceName}`
      );
      logger.info(`Evolution API - Instance logged out: ${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error logging out instance:", error);
      throw new AppError("ERR_EVOLUTION_API_LOGOUT_INSTANCE");
    }
  }

  async sendTextMessage({
    instanceName,
    number,
    text
  }: SendTextMessageRequest): Promise<any> {
    try {
      logger.info(`Evolution API - Sending text to ${number} via instance ${instanceName}`);

      // Validar API Key antes de enviar
      if (!this.apiKey || this.apiKey.trim() === "") {
        throw new Error("API Key não configurada para Evolution API");
      }

      const response = await this.client.post(
        `/message/sendText/${instanceName}`,
        {
          number,
          text
        }
      );

      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;

      logger.error("Evolution API - Error sending text message:", {
        status,
        statusText: error?.response?.statusText,
        message: error?.message,
        instanceName,
        hasApiKey: !!this.apiKey
      });
      logger.error("Evolution API - Error data:", errorData);

      // Se for erro 404, a instância não existe
      if (status === 404) {
        throw new AppError(`Instância '${instanceName}' não encontrada na Evolution API. Verifique se o nome da instância está correto ou recrie a conexão.`, 404);
      }

      // Se for erro 401, lançar mensagem clara
      if (status === 401) {
        throw new AppError(`Erro de autenticação na Evolution API. Verifique a API Key da instância ${instanceName}`, 401);
      }

      throw new AppError("ERR_EVOLUTION_API_SEND_TEXT", status || 400);
    }
  }

  async sendMediaMessage(data: SendMediaMessageRequest): Promise<any> {
    try {
      const response = await this.client.post(
        `/message/sendMedia/${data.instanceName}`,
        {
          number: data.number,
          mediatype: data.mediatype,
          media: data.media,
          caption: data.caption || ""
        }
      );
      logger.info(
        `Evolution API - Media message sent to ${data.number} via ${data.instanceName}`
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      
      logger.error("Evolution API - Error sending media message:", {
        status,
        message: error?.message,
        instanceName: data.instanceName
      });
      
      if (status === 404) {
        throw new AppError(`Instância '${data.instanceName}' não encontrada na Evolution API. Verifique se o nome da instância está correto ou recrie a conexão.`, 404);
      }
      
      if (status === 401) {
        throw new AppError(`Erro de autenticação na Evolution API. Verifique a API Key da instância ${data.instanceName}`, 401);
      }
      
      throw new AppError("ERR_EVOLUTION_API_SEND_MEDIA", status || 400);
    }
  }

  async getProfilePicture(instanceName: string, contactNumber: string): Promise<string | null> {
    try {
      // Evolution API usa POST para fetchProfilePictureUrl com número no body
      const response = await this.client.post(
        `/chat/fetchProfilePictureUrl/${instanceName}`,
        {
          number: contactNumber
        }
      );

      const profileUrl = response.data?.profilePictureUrl || response.data?.url || null;

      if (profileUrl) {
        logger.info(`Evolution API - Profile picture fetched for ${contactNumber}: ${profileUrl.substring(0, 60)}...`);
      } else {
        logger.info(`Evolution API - No profile picture available for ${contactNumber}`);
      }

      return profileUrl;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        logger.info(`Evolution API - No profile picture found for ${contactNumber}`);
        return null;
      }

      logger.warn(`Evolution API - Error fetching profile picture for ${contactNumber}: ${error.message}`);
      return null;
    }
  }

  async getBase64FromMediaMessage(instanceName: string, messageId: string, convertToMp4: boolean = false): Promise<string | null> {
    try {
      const response = await this.client.post(
        `/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          message: {
            key: {
              id: messageId
            }
          },
          convertToMp4
        }
      );

      const base64Data = response.data?.base64 || null;

      if (base64Data) {
        logger.info(`Evolution API - Base64 media fetched for message ${messageId}`);
      }

      return base64Data;
    } catch (error: any) {
      logger.warn(`Evolution API - Error fetching base64 for message ${messageId}:`, error.message);
      return null;
    }
  }

  static async getInstanceFromIntegration(
    integrationId: number,
    companyId: number
  ): Promise<EvolutionApiService> {
    const integration = await ApiIntegration.findOne({
      where: { id: integrationId, companyId, type: "evolution" }
    });

    if (!integration) {
      throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
    }

    if (!integration.isActive) {
      throw new AppError("ERR_INTEGRATION_NOT_ACTIVE", 400);
    }

    return new EvolutionApiService({
      baseUrl: integration.baseUrl,
      apiKey: integration.apiKey
    });
  }
}

export default EvolutionApiService;