import Mustache from "mustache";
import Contact from "../models/Contact";
import User from "../models/User";

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
}

export default (body: string, contactOrOptions: Contact | FormatBodyOptions): string => {
  let contact: Contact;
  let user: User | null | undefined = null;

  if (contactOrOptions && 'contact' in contactOrOptions) {
    contact = contactOrOptions.contact;
    user = contactOrOptions.user;
  } else {
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
    atendente: user?.name || "",
    attendant: user?.name || "",
    user: user?.name || "",
    userName: user?.name || ""
  };
  return Mustache.render(body, view);
};