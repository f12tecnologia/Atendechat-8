import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import { lookup } from "mime-types";
import formatBody from "../../helpers/Mustache";
import ProviderFactory from "./providers/ProviderFactory";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ar 44100 -ac 2 -b:a 192k ${outputAudio}`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  body?: string
): Promise<any> => {
  const mimeType = lookup(pathMedia) || "";
  const typeMessage = mimeType.split("/")[0];

  try {
    if (!mimeType) {
      throw new Error("Invalid mimetype");
    }
    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body ? body : "",
        fileName: fileName
      };
    } else if (typeMessage === "audio") {
      const typeAudio = true;
      const convert = await processAudio(pathMedia);
      if (typeAudio) {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      } else {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      }
    } else if (typeMessage === "document") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body ? body : null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WAMessage | any> => {
  const provider = await ProviderFactory.getProvider(ticket);
  
  const sentMessage = await provider.sendMedia({
    media,
    ticket,
    body
  });

  // For Evolution provider, save the message to database
  if (provider.getProviderName() === "evolution") {
    const caption = formatBody(body || "", { contact: ticket.contact, user: ticket.user });
    const mimeType = media.mimetype || lookup(media.path) || "";
    const typeMessage = mimeType.split("/")[0];
    
    // Determine media type
    let mediaType = "document";
    if (typeMessage === "image") mediaType = "image";
    else if (typeMessage === "video") mediaType = "video";
    else if (typeMessage === "audio") mediaType = "audio";
    
    // Extract message ID from Evolution response or generate one
    let messageId = uuidv4();
    if (sentMessage?.key?.id) {
      messageId = sentMessage.key.id;
    } else if (sentMessage?.id) {
      messageId = sentMessage.id;
    }

    // Build message body
    const messageBody = caption || media.originalname || `[${mediaType}]`;

    // Get media URL - use /public/ path for frontend access
    const mediaFileName = path.basename(media.path);
    const mediaUrl = `/public/${mediaFileName}`;

    // Save message to database
    await CreateMessageService({
      messageData: {
        id: messageId,
        ticketId: ticket.id,
        body: messageBody,
        contactId: ticket.contactId,
        fromMe: true,
        read: true,
        mediaType,
        mediaUrl,
        ack: 2,
        queueId: ticket.queueId
      },
      companyId: ticket.companyId
    });
  }

  return sentMessage;
};

export default SendWhatsAppMedia;
