import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import { isNil } from "lodash";
interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup?: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  extraInfo?: ExtraInfo[];
  whatsappId?: number;
  remoteJid?: string;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  email = "",
  profilePicUrl = "",
  companyId,
  extraInfo = [],
  remoteJid = "",
  whatsappId,
  isGroup = false
}: Request): Promise<Contact> => {
  // Normalizar número removendo caracteres não numéricos
  let number = rawNumber.replace(/\D/g, '');

  // Garantir que número tenha código do país Brasil (55)
  // Se tiver menos de 12 dígitos ou não começar com 55, adiciona 55
  if (number.length < 12 || !number.startsWith('55')) {
    // Remove qualquer 55 existente no meio do número
    if (number.includes('55') && !number.startsWith('55')) {
      number = number.replace('55', '');
    }
    // Adiciona 55 no início
    number = '55' + number;
  }

  const numberExists = await Contact.findOne({
    where: { number, companyId }
  });

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({
    where: {
      number,
      companyId
    }
  });

  if (contact) {
    contact.update({ profilePicUrl });
    console.log(contact.whatsappId)
    if (isNil(contact.whatsappId === null)) {
      contact.update({
        whatsappId
      });
    }
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  } else {
    contact = await Contact.create({
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo,
      companyId,
      whatsappId
    });

    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;