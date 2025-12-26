import { Op } from "sequelize";
import QuickMessage from "../../models/QuickMessage";
import Company from "../../models/Company";

type Params = {
  companyId: string;
  userId: string;
};

const FindService = async ({ companyId, userId }: Params): Promise<QuickMessage[]> => {
  // Build where clause - only include userId if it's defined
  const whereClause: any = { companyId };
  if (userId !== undefined && userId !== null && userId !== 'undefined') {
    whereClause.userId = userId;
  }

  const notes: QuickMessage[] = await QuickMessage.findAll({
    where: whereClause,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["shortcode", "ASC"]]
  });

  return notes;
};

export default FindService;
