import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import Message from "../../../models/Message";
import GetTicketWbot from "../../../helpers/GetTicketWbot";
import formatBody from "../../../helpers/Mustache";
import AppError from "../../../errors/AppError";
import { WhatsAppProvider, SendTextOptions, SendMediaOptions } from "./WhatsAppProvider";
import { logger } from "../../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "..", "public");

const getRemoteJidFromTicket = async (ticket: any): Promise<string | null> => {
  try {
    const lastMessage = await Message.findOne({
      where: {
        ticketId: ticket.id,
        fromMe: false
      },
      order: [["createdAt", "DESC"]]
    });
    
    if (lastMessage?.remoteJid) {
      logger.info(`Using original remoteJid: ${lastMessage.remoteJid}`);
      return lastMessage.remoteJid;
    }
  } catch (err) {
    logger.warn("Could not get remoteJid from message:", err);
  }
  return null;
};

const formatWhatsAppNumber = (number: string, isGroup: boolean): string => {
  if (isGroup) {
    return `${number}@g.us`;
  }
  
  let cleanNumber = number.replace(/\D/g, "");
  
  if (cleanNumber.startsWith("55") && cleanNumber.length === 12) {
    const ddd = cleanNumber.substring(2, 4);
    const dddNumber = parseInt(ddd, 10);
    if (dddNumber >= 11 && dddNumber <= 28) {
      cleanNumber = cleanNumber.substring(0, 4) + "9" + cleanNumber.substring(4);
      logger.info(`Added 9 digit for Brazilian number: ${cleanNumber}`);
    }
  }
  
  return `${cleanNumber}@s.whatsapp.net`;
};

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

class BaileysProvider implements WhatsAppProvider {
  getProviderName(): string {
    return "baileys";
  }

  async sendText({ body, ticket, quotedMsg }: SendTextOptions): Promise<WAMessage> {
    let options = {};
    const wbot = await GetTicketWbot(ticket);
    
    const originalJid = await getRemoteJidFromTicket(ticket);
    const number = originalJid || formatWhatsAppNumber(ticket.contact.number, ticket.isGroup);
    
    logger.info(`Sending message to: ${number} (contact.number: ${ticket.contact.number})`);

    if (quotedMsg) {
      const chatMessages = await Message.findOne({
        where: {
          id: quotedMsg.id
        }
      });

      if (chatMessages) {
        const msgFound = JSON.parse(chatMessages.dataJson);

        options = {
          quoted: {
            key: msgFound.key,
            message: {
              extendedTextMessage: msgFound.message.extendedTextMessage
            }
          }
        };
      }
    }

    try {
      const sentMessage = await wbot.sendMessage(
        number,
        {
          text: formatBody(body, ticket.contact)
        },
        {
          ...options
        }
      );

      await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
      return sentMessage;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  async sendMedia({ media, ticket, body }: SendMediaOptions): Promise<WAMessage> {
    try {
      const wbot = await GetTicketWbot(ticket);
      
      const originalJid = await getRemoteJidFromTicket(ticket);
      const number = originalJid || formatWhatsAppNumber(ticket.contact.number, ticket.isGroup);
      
      logger.info(`Sending media to: ${number} (contact.number: ${ticket.contact.number})`);

      const pathMedia = media.path;
      const typeMessage = media.mimetype.split("/")[0];
      let options: AnyMessageContent;
      const bodyMessage = formatBody(body || "", ticket.contact);

      if (typeMessage === "video") {
        options = {
          video: fs.readFileSync(pathMedia),
          caption: bodyMessage,
          fileName: media.originalname
        };
      } else if (typeMessage === "audio") {
        const typeAudio = media.originalname.includes("audio-record-site");
        if (typeAudio) {
          const convert = await processAudio(media.path);
          options = {
            audio: fs.readFileSync(convert),
            mimetype: typeAudio ? "audio/mp4" : media.mimetype,
            ptt: true
          };
        } else {
          const convert = await processAudioFile(media.path);
          options = {
            audio: fs.readFileSync(convert),
            mimetype: typeAudio ? "audio/mp4" : media.mimetype
          };
        }
      } else if (typeMessage === "document" || typeMessage === "text") {
        options = {
          document: fs.readFileSync(pathMedia),
          caption: bodyMessage,
          fileName: media.originalname,
          mimetype: media.mimetype
        };
      } else if (typeMessage === "application") {
        options = {
          document: fs.readFileSync(pathMedia),
          caption: bodyMessage,
          fileName: media.originalname,
          mimetype: media.mimetype
        };
      } else {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMessage
        };
      }

      const sentMessage = await wbot.sendMessage(
        number,
        {
          ...options
        }
      );

      await ticket.update({ lastMessage: bodyMessage });

      return sentMessage;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }
}

export default BaileysProvider;
