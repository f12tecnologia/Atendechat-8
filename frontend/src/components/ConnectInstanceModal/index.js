import React, { useState } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Box
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  inputField: {
    marginBottom: theme.spacing(2),
    width: "100%"
  },
  button: {
    marginTop: theme.spacing(2)
  },
  qrcodeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: theme.spacing(2)
  },
  statusMessage: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.success.light,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.success.contrastText
  },
  instructions: {
    marginBottom: theme.spacing(2)
  }
}));

const ConnectInstanceModal = ({ open, onClose, apiIntegrationId, initialInstanceName }) => {
  const classes = useStyles();
  const [instanceName, setInstanceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionData, setConnectionData] = useState(null);

  React.useEffect(() => {
    if (open && initialInstanceName) {
      setInstanceName(initialInstanceName);
    }
  }, [open, initialInstanceName]);

  const handleConnect = async () => {
    if (!instanceName.trim()) {
      toast.error("Por favor, informe o nome da conexão");
      return;
    }

    try {
      setLoading(true);
      setConnectionData(null);

      const { data } = await api.post(
        `/api-integrations/${apiIntegrationId}/connection-status`,
        { instanceName: instanceName.trim() }
      );

      setConnectionData(data);

      if (data.connected) {
        toast.success(data.message || "Conexão já está ativa!");
      } else {
        toast.info(data.message || "QR Code gerado! Leia para conectar.");
      }
    } catch (err) {
      // Detecta erro específico de integração não encontrada
      if (err.response?.status === 404 && err.response?.data?.error === "ERR_INTEGRATION_NOT_FOUND") {
        toast.error(err.response.data.message || "Integração Evolution API não encontrada. Por favor, crie uma integração primeiro.");
        handleClose();
        // Aguarda um pouco antes de redirecionar para permitir visualizar o toast
        setTimeout(() => {
          window.location.href = "/#/evolution-integrations";
        }, 2000);
      } else {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInstanceName("");
    setConnectionData(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Conectar Instância WhatsApp</DialogTitle>
      <DialogContent className={classes.root}>
        <Typography variant="body2" className={classes.instructions}>
          Digite o nome da instância que você criou na Evolution API e clique em "Conectar" para
          visualizar o QR Code ou verificar o status da conexão.
        </Typography>

        <TextField
          className={classes.inputField}
          label="Nome da Conexão/Instância"
          variant="outlined"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          placeholder="Ex: minha-empresa-whatsapp"
          disabled={loading}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !loading) {
              handleConnect();
            }
          }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleConnect}
          disabled={loading || !instanceName.trim()}
          className={classes.button}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : "Conectar"}
        </Button>

        {connectionData && (
          <Box className={classes.qrcodeContainer}>
            {connectionData.connected ? (
              // Conexão já ativa
              <Paper elevation={3} className={classes.statusMessage}>
                <Typography variant="h6" align="center">
                  ✅ {connectionData.message}
                </Typography>
                {connectionData.status && (
                  <Typography variant="body2" align="center" style={{ marginTop: 8 }}>
                    Status: {connectionData.status.state || connectionData.status.instance?.state}
                  </Typography>
                )}
              </Paper>
            ) : (
              // Mostrar QR Code
              <div>
                <Typography variant="h6" align="center" gutterBottom>
                  📱 {connectionData.message}
                </Typography>
                {connectionData.base64 ? (
                  <img
                    src={connectionData.base64}
                    alt="QR Code"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                ) : connectionData.qrcode ? (
                  <QRCode value={connectionData.qrcode} size={300} />
                ) : (
                  <Typography>QR Code não disponível</Typography>
                )}
                {connectionData.pairingCode && (
                  <Typography variant="body2" align="center" style={{ marginTop: 16 }}>
                    Código de Pareamento: <strong>{connectionData.pairingCode}</strong>
                  </Typography>
                )}
              </div>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(ConnectInstanceModal);
