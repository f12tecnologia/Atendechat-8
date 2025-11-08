import express from "express";
import isAuth from "../middleware/isAuth";

import * as ApiIntegrationController from "../controllers/ApiIntegrationController";

const apiIntegrationRoutes = express.Router();

apiIntegrationRoutes.get("/api-integrations", isAuth, ApiIntegrationController.index);
apiIntegrationRoutes.post("/api-integrations", isAuth, ApiIntegrationController.store);
apiIntegrationRoutes.get("/api-integrations/:integrationId", isAuth, ApiIntegrationController.show);
apiIntegrationRoutes.get("/api-integrations/:integrationId/qrcode", isAuth, ApiIntegrationController.getQrCode);
apiIntegrationRoutes.put("/api-integrations/:integrationId", isAuth, ApiIntegrationController.update);
apiIntegrationRoutes.delete("/api-integrations/:integrationId", isAuth, ApiIntegrationController.remove);

// Webhook endpoint (sem autenticação - chamado pela Evolution API)
apiIntegrationRoutes.post("/api-integrations/webhook/:companyId", ApiIntegrationController.webhook);

export default apiIntegrationRoutes;
