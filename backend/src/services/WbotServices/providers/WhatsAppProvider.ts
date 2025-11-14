import { WAMessage, AnyMessageContent } from "baileys";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";

export interface SendTextOptions {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

export interface SendMediaOptions {
  media: Express.Multer.File | {
    path: string;
    mimetype: string;
    originalname: string;
  };
  ticket: Ticket;
  body?: string;
}

export interface WhatsAppProvider {
  sendText(options: SendTextOptions): Promise<WAMessage | any>;
  sendMedia(options: SendMediaOptions): Promise<WAMessage | any>;
  getProviderName(): string;
}
