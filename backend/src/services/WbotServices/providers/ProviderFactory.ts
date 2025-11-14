import Ticket from "../../../models/Ticket";
import { WhatsAppProvider } from "./WhatsAppProvider";
import BaileysProvider from "./BaileysProvider";
import EvolutionProvider from "./EvolutionProvider";
import Whatsapp from "../../../models/Whatsapp";

class ProviderFactory {
  static async getProvider(ticket: Ticket): Promise<WhatsAppProvider> {
    // Recarregar ticket com whatsapp associado se necessário
    if (!ticket.whatsapp) {
      await ticket.reload({
        include: [{ model: Whatsapp, as: "whatsapp" }]
      });
    }

    // Se tem apiIntegrationId, usa Evolution API
    if (ticket.whatsapp?.apiIntegrationId) {
      return new EvolutionProvider();
    }

    // Caso contrário, usa Baileys
    return new BaileysProvider();
  }
}

export default ProviderFactory;
