import React, { useState, useEffect, useContext, useRef } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  FormHelperText,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import ApiIntegrationModal from "../ApiIntegrationModal";
import { SocketContext } from "../../context/Socket/SocketContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },

  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, i18n.t("whatsappModal.formErrors.name.short"))
    .max(50, i18n.t("whatsappModal.formErrors.name.long"))
    .required(i18n.t("whatsappModal.formErrors.name.required")),
});

const WhatsAppModal = ({ open, onClose, whatsAppId }) => {

  const classes = useStyles();
  const socketManager = useContext(SocketContext);
  const initialState = {
    name: "",
    greetingMessage: "",
    complationMessage: "",
    outOfHoursMessage: "",
    ratingMessage: "",
    isDefault: false,
    token: "",
    provider: "beta",
    expiresInactiveMessage: "",
    expiresTicket: 0,
    timeUseBotQueues: 0,
    maxUseBotQueues: 3,
    integration: null
  };

  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState(null)
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [provider, setProvider] = useState("evolution");
  const [evolutionIntegrations, setEvolutionIntegrations] = useState([]);
  const [selectedEvolutionIntegration, setSelectedEvolutionIntegration] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [createdWhatsAppId, setCreatedWhatsAppId] = useState(null);
  const createdWhatsAppIdRef = useRef(null);
  
    useEffect(() => {
      const fetchSession = async () => {
        if (!whatsAppId) return;

        try {
          
          const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);

          setWhatsApp(data);
          setSelectedPrompt( data.promptId );
          setSelectedIntegration(data.integrationId)

          const whatsQueueIds = data.queues?.map((queue) => queue.id);
          setSelectedQueueIds(whatsQueueIds);
          setSelectedQueueId(data.transferQueueId);
        } catch (err) {
          toastError(err);
        }
      };
      fetchSession();
    }, [whatsAppId]);

  const fetchEvolutionIntegrations = async () => {
    try {
      console.log("=== fetchEvolutionIntegrations CHAMADO ===");
      const {data: evolutionData} = await api.get("/api-integrations", {
        params: { type: "evolution" }
      });
      console.log("Dados recebidos da API:", evolutionData);
      console.log("Array de integrações:", evolutionData.apiIntegrations);
      setEvolutionIntegrations(evolutionData.apiIntegrations || []);
      console.log("Estado atualizado com", evolutionData.apiIntegrations?.length || 0, "integrações");
    } catch (err) {
      console.error("Erro ao buscar integrações:", err);
      toastError(err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        console.log("🔄 useEffect principal executado - carregando dados iniciais");
        
        const { data } = await api.get("/prompt");
        console.log("✅ Prompts carregados:", data.prompts?.length || 0);
        setPrompts(data.prompts);

        const {data: dataIntegration} = await api.get("/queueIntegration");
        console.log("✅ Queue integrations carregadas:", dataIntegration.queueIntegrations?.length || 0);
        setIntegrations(dataIntegration.queueIntegrations);

        console.log("🔄 Chamando fetchEvolutionIntegrations...");
        await fetchEvolutionIntegrations();

      } catch (err) {
        console.error("❌ Erro no useEffect principal:", err);
        toastError(err);
      }
    })();
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  // Socket listener to auto-close modal when Evolution connection is established
  useEffect(() => {
    if (!open) return;
    
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    const handleWhatsAppUpdate = (data) => {
      const targetId = createdWhatsAppIdRef.current;
      if (targetId && data.whatsapp && data.whatsapp.id === targetId) {
        if (data.whatsapp.status === "CONNECTED") {
          toast.success("Conexão estabelecida com sucesso!");
          handleClose();
        }
      }
    };

    socket.on(`company-${companyId}-whatsapp`, handleWhatsAppUpdate);

    return () => {
      socket.off(`company-${companyId}-whatsapp`, handleWhatsAppUpdate);
    };
  }, [open, socketManager]);

  const handleSaveWhatsApp = async (values) => {
    const whatsappData = {
      ...values, queueIds: selectedQueueIds, transferQueueId: selectedQueueId,
      promptId: selectedPrompt ? selectedPrompt : null,
      integrationId: selectedIntegration
    };
    delete whatsappData["queues"];
    delete whatsappData["session"];

    try {
      if (whatsAppId) {
        // Editing existing connection - just save settings, don't create new
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
        toast.success(i18n.t("whatsappModal.success"));
        handleClose();
      } else {
        // Creating new connection - only Evolution API is supported
        if (!selectedEvolutionIntegration) {
          toast.error("Selecione uma integração Evolution API antes de continuar");
          return;
        }
        const evolutionData = {
          ...whatsappData,
          apiIntegrationId: selectedEvolutionIntegration
        };
        const { data } = await api.post("/whatsapp/evolution", evolutionData);
        
        // Store the created WhatsApp ID to track connection status
        if (data.whatsapp && data.whatsapp.id) {
          setCreatedWhatsAppId(data.whatsapp.id);
          createdWhatsAppIdRef.current = data.whatsapp.id;
        }
        
        if (data.qrcode) {
          setQrCode(data.qrcode);
        }
        toast.success("Conexão Evolution API criada! Escaneie o QR Code.");
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleChangeQueue = (e) => {
    setSelectedQueueIds(e);
    setSelectedPrompt(null);
  };

  const handleChangePrompt = (e) => {
    setSelectedPrompt(e.target.value);
    setSelectedQueueIds([]);
  };

  const handleChangeIntegration = (e) => {
    setSelectedIntegration(e.target.value);
  }

  const handleClose = () => {
    setQrCode(null);
    setCreatedWhatsAppId(null);
    createdWhatsAppIdRef.current = null;
    setProvider("evolution");
    setSelectedEvolutionIntegration(null);
    onClose();
    setWhatsApp(initialState);
    setSelectedQueueId(null);
    setSelectedQueueIds([]);
  };

  const handleOpenIntegrationModal = () => {
    setIntegrationModalOpen(true);
  };

  const handleCloseIntegrationModal = () => {
    setIntegrationModalOpen(false);
    fetchEvolutionIntegrations();
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {whatsAppId
            ? i18n.t("whatsappModal.title.edit")
            : i18n.t("whatsappModal.title.add")}
        </DialogTitle>
        <Formik
          initialValues={whatsApp}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveWhatsApp(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                <div className={classes.multFieldLine}>
                  <Grid spacing={2} container>
                    <Grid item>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.name")}
                        autoFocus
                        name="name"
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                        variant="outlined"
                        margin="dense"
                        className={classes.textField}
                      />
                    </Grid>
                    <Grid style={{ paddingTop: 15 }} item>
                      <FormControlLabel
                        control={
                          <Field
                            as={Switch}
                            color="primary"
                            name="isDefault"
                            checked={values.isDefault}
                          />
                        }
                        label={i18n.t("whatsappModal.form.default")}
                      />
                    </Grid>
                  </Grid>
                </div>
                
                {!whatsAppId && (
                  <>
                    <Grid container spacing={1} alignItems="flex-start">
                      <Grid item xs={11}>
                        <FormControl margin="dense" variant="outlined" fullWidth>
                          <InputLabel>Integração Evolution API</InputLabel>
                          <Select
                            value={selectedEvolutionIntegration || ""}
                            onChange={(e) => setSelectedEvolutionIntegration(e.target.value)}
                            label="Integração Evolution API"
                          >
                            {evolutionIntegrations.map((integration) => (
                              <MenuItem key={integration.id} value={integration.id}>
                                {integration.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {evolutionIntegrations.length === 0 && (
                            <FormHelperText>
                              Nenhuma integração Evolution API encontrada. Clique no botão "+" para criar uma.
                            </FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton
                          color="primary"
                          onClick={handleOpenIntegrationModal}
                          style={{ marginTop: "12px" }}
                          title="Criar nova integração Evolution API"
                        >
                          <AddIcon />
                        </IconButton>
                      </Grid>
                    </Grid>

                    {qrCode && (
                      <div style={{ textAlign: "center", margin: "20px 0" }}>
                        <h3>QR Code Evolution API</h3>
                        <img src={qrCode} alt="QR Code" style={{ maxWidth: "300px" }} />
                        <p>Escaneie este QR Code com o WhatsApp para conectar</p>
                      </div>
                    )}
                  </>
                )}
                
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.greetingMessage")}
                    type="greetingMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="greetingMessage"
                    error={
                      touched.greetingMessage && Boolean(errors.greetingMessage)
                    }
                    helperText={
                      touched.greetingMessage && errors.greetingMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.complationMessage")}
                    type="complationMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="complationMessage"
                    error={
                      touched.complationMessage &&
                      Boolean(errors.complationMessage)
                    }
                    helperText={
                      touched.complationMessage && errors.complationMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.outOfHoursMessage")}
                    type="outOfHoursMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="outOfHoursMessage"
                    error={
                      touched.outOfHoursMessage &&
                      Boolean(errors.outOfHoursMessage)
                    }
                    helperText={
                      touched.outOfHoursMessage && errors.outOfHoursMessage
                    }
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.ratingMessage")}
                    type="ratingMessage"
                    multiline
                    rows={4}
                    fullWidth
                    name="ratingMessage"
                    error={
                      touched.ratingMessage && Boolean(errors.ratingMessage)
                    }
                    helperText={touched.ratingMessage && errors.ratingMessage}
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.token")}
                    type="token"
                    fullWidth
                    name="token"
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <QueueSelect
                  selectedQueueIds={selectedQueueIds}
                  onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                />
                <FormControl
                  margin="dense"
                  variant="outlined"
                  fullWidth
                >
                  <InputLabel>
                    {i18n.t("whatsappModal.form.prompt")}
                  </InputLabel>
                  <Select
                    labelId="dialog-select-prompt-label"
                    id="dialog-select-prompt"
                    name="promptId"
                    value={selectedPrompt || ""}
                    onChange={handleChangePrompt}
                    label={i18n.t("whatsappModal.form.prompt")}
                    fullWidth
                    MenuProps={{
                      anchorOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                      },
                      transformOrigin: {
                        vertical: "top",
                        horizontal: "left",
                      },
                      getContentAnchorEl: null,
                    }}
                  >
                    {prompts.map((prompt) => (
                      <MenuItem
                        key={prompt.id}
                        value={prompt.id}
                      >
                        {prompt.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  margin="dense"
                  variant="outlined"
                  fullWidth
                >
                  <InputLabel>
                    {i18n.t("whatsappModal.form.integration")}
                  </InputLabel>
                  <Select
                    labelId="dialog-select-integration-label"
                    id="dialog-select-integration"
                    name="promptId"
                    value={selectedIntegration || ""}
                    onChange={handleChangeIntegration}
                    label={i18n.t("whatsappModal.form.integration")}
                    fullWidth
                    MenuProps={{
                      anchorOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                      },
                      transformOrigin: {
                        vertical: "top",
                        horizontal: "left",
                      },
                      getContentAnchorEl: null,
                    }}
                  >
                    {integrations.map((prompt) => (
                      <MenuItem
                        key={prompt.id}
                        value={prompt.id}
                      >
                        {prompt.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <div>
                  <h3>{i18n.t("whatsappModal.form.queueRedirection")}</h3>
                  <p>{i18n.t("whatsappModal.form.queueRedirectionDesc")}</p>
                                <Grid container spacing={2}>
                  <Grid item sm={6} >
                    <Field
                      fullWidth
                      type="number"
                      as={TextField}
                      label={i18n.t("whatsappModal.form.timeToTransfer")}
                      name="timeToTransfer"
                      error={touched.timeToTransfer && Boolean(errors.timeToTransfer)}
                      helperText={touched.timeToTransfer && errors.timeToTransfer}
                      variant="outlined"
                      margin="dense"
                      className={classes.textField}
                      InputLabelProps={{ shrink: values.timeToTransfer ? true : false }}
                    />

                  </Grid>

                  <Grid item sm={6}>
                    <QueueSelect
                      selectedQueueIds={selectedQueueId}
                      onChange={(selectedId) => {
                        setSelectedQueueId(selectedId)
                      }}
                      multiple={false}
                      title={i18n.t("whatsappModal.form.queue")}
                    />
                  </Grid>

                  </Grid>
                  <Grid spacing={2} container>
                    {/* ENCERRAR CHATS ABERTOS APÓS X HORAS */}
                    <Grid xs={12} md={12} item>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.expiresTicket")}
                        fullWidth
                        name="expiresTicket"
                        variant="outlined"
                        margin="dense"
                        error={touched.expiresTicket && Boolean(errors.expiresTicket)}
                        helperText={touched.expiresTicket && errors.expiresTicket}
                      />
                    </Grid>
                  </Grid>
                  {/* MENSAGEM POR INATIVIDADE*/}
                  <div>
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.expiresInactiveMessage")}
                      multiline
                      rows={4}
                      fullWidth
                      name="expiresInactiveMessage"
                      error={touched.expiresInactiveMessage && Boolean(errors.expiresInactiveMessage)}
                      helperText={touched.expiresInactiveMessage && errors.expiresInactiveMessage}
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
      
      <ApiIntegrationModal
        open={integrationModalOpen}
        onClose={handleCloseIntegrationModal}
        integrationId={null}
      />
    </div>
  );
};

export default React.memo(WhatsAppModal);
