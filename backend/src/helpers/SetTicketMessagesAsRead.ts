import { proto, WASocket } from "baileys";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import { logger } from "../utils/logger";
import { getWbot } from "../libs/wbot";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  await ticket.update({ unreadMessages: 0 });

  try {
    // Reload ticket with whatsapp association
    if (!ticket.whatsapp) {
      await ticket.reload({ include: [{ model: Whatsapp, as: "whatsapp" }] });
    }

    // Skip Baileys-specific read marking for Evolution connections
    if (ticket.whatsapp?.apiIntegrationId || ticket.whatsapp?.provider === "evolution") {
      // For Evolution, just update message read status in database
      await Message.update(
        { read: true },
        {
          where: {
            ticketId: ticket.id,
            read: false
          }
        }
      );
    } else if (ticket.whatsappId) {
      // Try Baileys only if connection exists and is not Evolution
      try {
        const wbot = getWbot(ticket.whatsappId);

        const getJsonMessage = await Message.findAll({
          where: {
            ticketId: ticket.id,
            fromMe: false,
            read: false
          },
          order: [["createdAt", "DESC"]]
        });

        if (getJsonMessage.length > 0) {
          const lastMessages: proto.IWebMessageInfo = JSON.parse(
            JSON.stringify(getJsonMessage[0].dataJson)
          );

          if (lastMessages.key && lastMessages.key.fromMe === false) {
            await (wbot as WASocket).chatModify(
              { markRead: true, lastMessages: [lastMessages] },
              `${ticket.contact.number}@${
                ticket.isGroup ? "g.us" : "s.whatsapp.net"
              }`
            );
          }
        }
      } catch (wbotErr) {
        // Baileys not available, just update database
      }

      await Message.update(
        { read: true },
        {
          where: {
            ticketId: ticket.id,
            read: false
          }
        }
      );
    }
  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
  }

  const io = getIO();
  io.to(`company-${ticket.companyId}-mainchannel`).emit(`company-${ticket.companyId}-ticket`, {
    action: "updateUnread",
    ticketId: ticket.id
  });
};

export default SetTicketMessagesAsRead;
