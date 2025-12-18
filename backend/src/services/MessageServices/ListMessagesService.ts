import { FindOptions } from "sequelize/types";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import Queue from "../../models/Queue";

interface Request {
  ticketId: string;
  companyId: number;
  pageNumber?: string;
  queues?: number[];
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  companyId,
  queues = []
}: Request): Promise<Response> => {
  try {
    const ticket = await ShowTicketService(ticketId, companyId);

    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }

    // Verificar se o ticket pertence à mesma empresa
    if (ticket.companyId !== companyId) {
      throw new AppError("ERR_FORBIDDEN_TICKET_ACCESS", 403);
    }

    const limit = 20;
    const offset = limit * (+pageNumber - 1);

    const whereConditions: any = {
      ticketId,
      companyId
    };

    if (queues.length > 0) {
      whereConditions.queueId = {
        [Op.or]: {
          [Op.in]: queues,
          [Op.eq]: null
        }
      };
    }

    const { count, rows: messages } = await Message.findAndCountAll({
      where: whereConditions,
      limit,
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        },
        {
          model: Queue,
          as: "queue"
        }
      ],
      offset,
      order: [["createdAt", "DESC"]]
    });

    const hasMore = count > offset + messages.length;

    return {
      messages: messages.reverse(),
      ticket,
      count,
      hasMore
    };
  } catch (error) {
    console.error("Error in ListMessagesService:", error);
    throw error;
  }
};

export default ListMessagesService;
