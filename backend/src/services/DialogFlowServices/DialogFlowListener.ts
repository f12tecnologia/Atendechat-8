import { proto, WASocket, delay } from "baileys";

type Session = WASocket & {
  id?: number;
};
import { logger } from "../../utils/logger";
import Ticket from "../../models/Ticket";
import QueueIntegrations from "../../models/QueueIntegrations";
import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import { getBodyMessage } from "../WbotServices/wbotMessageListener";
import CreateMessageService from "../MessageServices/CreateMessageService";

const dialogflow = require("@google-cloud/dialogflow");

interface DialogFlowSession {
  ticket: Ticket;
  msg: proto.IWebMessageInfo;
  wbot: Session;
  queueIntegration: QueueIntegrations;
}

interface DialogFlowResponse {
  queryText: string;
  fulfillmentText: string;
  intent: string;
  confidence: number;
  languageCode: string;
}

const DialogFlowListener = async ({
  ticket,
  msg,
  wbot,
  queueIntegration
}: DialogFlowSession): Promise<void> => {
  try {
    const io = getIO();
    const { companyId, contactId } = ticket;
    const contact = await Contact.findByPk(contactId);

    if (!contact) {
      logger.error(`[DIALOGFLOW] Contact not found: ${contactId}`);
      return;
    }

    const userMessage = getBodyMessage(msg);
    
    if (!userMessage) {
      logger.warn("[DIALOGFLOW] Empty message received");
      return;
    }

    logger.info(`[DIALOGFLOW] Processing message from ${contact.number}: ${userMessage}`);

    const { projectName, jsonContent, language } = queueIntegration;

    if (!projectName || !jsonContent) {
      logger.error("[DIALOGFLOW] Missing projectName or jsonContent configuration");
      await sendMessage(
        wbot,
        contact,
        ticket,
        "Erro: Integração Dialogflow não configurada corretamente.",
        companyId
      );
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(jsonContent);
    } catch (error) {
      logger.error("[DIALOGFLOW] Invalid JSON credentials", error);
      await sendMessage(
        wbot,
        contact,
        ticket,
        "Erro: Credenciais Dialogflow inválidas.",
        companyId
      );
      return;
    }

    const sessionId = `${companyId}-${contactId}-${ticket.id}`;
    const sessionClient = new dialogflow.SessionsClient({
      credentials
    });

    const sessionPath = sessionClient.projectAgentSessionPath(
      projectName,
      sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: language || "pt-BR"
        }
      }
    };

    logger.info(`[DIALOGFLOW] Sending to Dialogflow: ${userMessage}`);
    
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    logger.info(`[DIALOGFLOW] Response from Dialogflow: ${result.fulfillmentText}`);

    const dialogFlowResponse: DialogFlowResponse = {
      queryText: result.queryText,
      fulfillmentText: result.fulfillmentText,
      intent: result.intent?.displayName || "Unknown",
      confidence: result.intentDetectionConfidence || 0,
      languageCode: result.languageCode
    };

    if (dialogFlowResponse.fulfillmentText) {
      await sendMessage(
        wbot,
        contact,
        ticket,
        dialogFlowResponse.fulfillmentText,
        companyId
      );
    } else {
      logger.warn("[DIALOGFLOW] Empty fulfillmentText received");
    }

    io.to(`company-${companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(ticket.uuid)
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        contact
      });

  } catch (error) {
    logger.error(`[DIALOGFLOW] Error processing message: ${error}`);
    console.error("[DIALOGFLOW] Full error:", error);
  }
};

const sendMessage = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  body: string,
  companyId: number
): Promise<void> => {
  try {
    const sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        text: body
      }
    );

    await CreateMessageService({
      messageData: {
        id: sentMessage.key.id,
        ticketId: ticket.id,
        body,
        contactId: contact.id,
        fromMe: true,
        read: true,
        mediaType: "chat",
        ack: 1
      },
      companyId
    });

    logger.info(`[DIALOGFLOW] Message sent: ${body.substring(0, 50)}...`);
  } catch (error) {
    logger.error("[DIALOGFLOW] Error sending message:", error);
    throw error;
  }
};

export default DialogFlowListener;
