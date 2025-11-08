import { Op } from "sequelize";
import ApiIntegration from "../../models/ApiIntegration";

interface Request {
  companyId: number;
  type?: string;
  searchParam?: string;
  pageNumber?: number;
}

interface Response {
  integrations: ApiIntegration[];
  count: number;
  hasMore: boolean;
}

const ListApiIntegrationsService = async ({
  companyId,
  type,
  searchParam = "",
  pageNumber = 1
}: Request): Promise<Response> => {
  console.log(`[ListApiIntegrationsService] Params:`, { companyId, type, searchParam, pageNumber });
  
  const whereCondition: any = { companyId };
  
  if (type) {
    whereCondition.type = type;
  }

  if (searchParam) {
    whereCondition[Op.or] = [
      { name: { [Op.iLike]: `%${searchParam}%` } },
      { type: { [Op.iLike]: `%${searchParam}%` } },
      { baseUrl: { [Op.iLike]: `%${searchParam}%` } },
      { instanceName: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  console.log(`[ListApiIntegrationsService] WHERE condition:`, JSON.stringify(whereCondition));

  const limit = 20;
  const offset = limit * (pageNumber - 1);

  const { count, rows: integrations } = await ApiIntegration.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  console.log(`[ListApiIntegrationsService] Found ${integrations.length} integrations of ${count} total`);
  console.log(`[ListApiIntegrationsService] Integration IDs:`, integrations.map(i => i.id));

  const hasMore = count > offset + integrations.length;

  return {
    integrations,
    count,
    hasMore
  };
};

export default ListApiIntegrationsService;
