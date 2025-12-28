import Mustache from "mustache";
import Contact from "../models/Contact";
import User from "../models/User";

export const greeting = (): string => {
  const greetings = ["Bom dia", "Boa tarde", "Boa noite"];
  const h = new Date().getHours();
  // eslint-disable-next-line no-bitwise
  if (h >= 6 && h < 12) {
    return "Bom dia";
  } else if (h >= 12 && h < 18) {
    return "Boa tarde";
  } else {
    return "Boa noite";
  }
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

  if (contactOrOptions && 'contact' in contactOrOptions && 'user' in contactOrOptions) {
    // FormatBodyOptions object with contact and user
    contact = contactOrOptions.contact;
    user = contactOrOptions.user;
  } else if (contactOrOptions && 'contact' in contactOrOptions) {
    // FormatBodyOptions with only contact
    contact = (contactOrOptions as FormatBodyOptions).contact;
    user = (contactOrOptions as FormatBodyOptions).user;
  } else {
    // Direct Contact object
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
  // Removed "Boa madrugada" condition

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