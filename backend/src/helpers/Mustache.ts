import Mustache from "mustache";
import Contact from "../models/Contact";
import User from "../models/User";
import Ticket from "../models/Ticket"; // Import Ticket

export const greeting = (): string => {
  const greetings = ["Boa madrugada", "Bom dia", "Boa tarde", "Boa noite"];
  const h = new Date().getHours();
  // eslint-disable-next-line no-bitwise
  return greetings[(h / 6) >> 0];
};

export const firstName = (contact?: Contact): string => {
  if (contact && contact?.name) {
    const nameArr = contact?.name.split(' ');
    return nameArr[0];
  }
  return '';
};

interface FormatBodyOptions {
  contact: Contact;
  user?: User | null;
  ticket?: Ticket | null; // Added ticket to options
}

export default (body: string, contactOrOptions: Contact | FormatBodyOptions | Ticket): string => {
  let contact: Contact;
  let user: User | null | undefined = null;
  let ticket: Ticket | null | undefined = null; // Added ticket variable

  if (contactOrOptions && 'contact' in contactOrOptions) {
    contact = contactOrOptions.contact;
    user = contactOrOptions.user;
    ticket = contactOrOptions.ticket; // Assign ticket if present
  } else if (contactOrOptions instanceof Ticket) { // Handle Ticket directly
    ticket = contactOrOptions;
    contact = ticket.contact;
    user = ticket.user;
  }
  else {
    contact = contactOrOptions as Contact;
  }

  let ms = "";

  const Hr = new Date();

  const dd: string = `0${Hr.getDate()}`.slice(-2);
  const mm: string = `0${Hr.getMonth() + 1}`.slice(-2);
  const yy: string = Hr.getFullYear().toString();
  const hh: number = Hr.getHours();
  const min: string = `0${Hr.getMinutes()}`.slice(-2);
  const ss: string = `0${Hr.getSeconds()}`.slice(-2);

  if (hh >= 6) {
    ms = "Bom dia";
  }
  if (hh > 11) {
    ms = "Boa tarde";
  }
  if (hh > 17) {
    ms = "Boa noite";
  }
  if (hh > 23 || hh < 6) {
    ms = "Boa madrugada";
  }

  const protocol = yy + mm + dd + String(hh) + min + ss;

  const hora = `${hh}:${min}:${ss}`;

  const view = {
    firstName: firstName(contact),
    name: contact ? contact.name : "",
    gretting: greeting(),
    ms,
    protocol,
    hora,
    atendente: user?.name || "", // Use user?.name for attendant
    attendant: user?.name || "", // Use user?.name for attendant
    user: user?.name || "",     // Use user?.name for user
    userName: user?.name || ""  // Use user?.name for userName
  };
  return Mustache.render(body, view);
};