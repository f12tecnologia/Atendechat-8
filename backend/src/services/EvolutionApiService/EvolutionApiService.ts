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
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey
      }
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
          webhookBase64: false,
          events: data.webhookEvents || [
            "QRCODE_UPDATED",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CONNECTION_UPDATE"
          ]
        };
      }

      const response = await this.client.post("/instance/create", payload);
      logger.info(`Evolution API - Instance created: ${data.instanceName}`);
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error creating instance:", error);
      throw new AppError("ERR_EVOLUTION_API_CREATE_INSTANCE");
    }
  }

  async connectInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/instance/connect/${instanceName}`
      );
      logger.info(`Evolution API - Instance connected: ${instanceName}`);
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error connecting instance:", error);
      throw new AppError("ERR_EVOLUTION_API_CONNECT_INSTANCE");
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

  async sendTextMessage(data: SendTextMessageRequest): Promise<any> {
    try {
      const response = await this.client.post(
        `/message/sendText/${data.instanceName}`,
        {
          number: data.number,
          text: data.text
        }
      );
      logger.info(
        `Evolution API - Text message sent to ${data.number} via ${data.instanceName}`
      );
      return response.data;
    } catch (error) {
      logger.error("Evolution API - Error sending text message:", error);
      throw new AppError("ERR_EVOLUTION_API_SEND_TEXT");
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
    } catch (error) {
      logger.error("Evolution API - Error sending media message:", error);
      throw new AppError("ERR_EVOLUTION_API_SEND_MEDIA");
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
