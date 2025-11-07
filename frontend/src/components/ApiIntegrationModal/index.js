import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(2),
    flex: 1,
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
  formControl: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(2),
    minWidth: 120,
  },
}));

const ApiIntegrationModal = ({ open, onClose, integrationId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    type: "evolution",
    baseUrl: "",
    apiKey: "",
    instanceName: "",
    isActive: true,
    webhookUrl: "",
  };

  const [integration, setIntegration] = useState(initialState);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!integrationId) return;
      try {
        const { data } = await api.get(`/api-integrations/${integrationId}`);
        setIntegration((prevState) => {
          return { ...prevState, ...data };
        });
      } catch (err) {
        toastError(err);
      }
    };

    fetchIntegration();
  }, [integrationId, open]);

  const handleClose = () => {
    onClose();
    setIntegration(initialState);
  };

  const handleSaveIntegration = async (values) => {
    const integrationData = { ...values };
    try {
      if (integrationId) {
        await api.put(`/api-integrations/${integrationId}`, integrationData);
      } else {
        await api.post("/api-integrations", integrationData);
      }
      toast.success(i18n.t("apiIntegrationModal.toasts.success"));
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {integrationId
            ? `${i18n.t("apiIntegrationModal.title.edit")}`
            : `${i18n.t("apiIntegrationModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveIntegration(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <FormControl
                  variant="outlined"
                  className={classes.formControl}
                  fullWidth
                >
                  <InputLabel id="type-select-label">
                    {i18n.t("apiIntegrationModal.form.type")}
                  </InputLabel>
                  <Field
                    as={Select}
                    label={i18n.t("apiIntegrationModal.form.type")}
                    name="type"
                    labelId="type-select-label"
                    id="type-select"
                    required
                  >
                    <MenuItem value="evolution">Evolution API</MenuItem>
                    <MenuItem value="telegram">Telegram</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="other">Outro</MenuItem>
                  </Field>
                </FormControl>
                <Field
                  as={TextField}
                  label={i18n.t("apiIntegrationModal.form.name")}
                  autoFocus
                  name="name"
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
                <Field
                  as={TextField}
                  label={i18n.t("apiIntegrationModal.form.baseUrl")}
                  name="baseUrl"
                  error={touched.baseUrl && Boolean(errors.baseUrl)}
                  helperText={touched.baseUrl && errors.baseUrl}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
                <Field
                  as={TextField}
                  label={i18n.t("apiIntegrationModal.form.apiKey")}
                  type="password"
                  name="apiKey"
                  error={touched.apiKey && Boolean(errors.apiKey)}
                  helperText={touched.apiKey && errors.apiKey}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
                {values.type === "evolution" && (
                  <>
                    <Field
                      as={TextField}
                      label={i18n.t("apiIntegrationModal.form.instanceName")}
                      name="instanceName"
                      error={
                        touched.instanceName && Boolean(errors.instanceName)
                      }
                      helperText={touched.instanceName && errors.instanceName}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                    <Field
                      as={TextField}
                      label={i18n.t("apiIntegrationModal.form.webhookUrl")}
                      name="webhookUrl"
                      error={touched.webhookUrl && Boolean(errors.webhookUrl)}
                      helperText={touched.webhookUrl && errors.webhookUrl}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                  </>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.isActive}
                      onChange={(e) =>
                        setFieldValue("isActive", e.target.checked)
                      }
                      name="isActive"
                      color="primary"
                    />
                  }
                  label={i18n.t("apiIntegrationModal.form.isActive")}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("apiIntegrationModal.buttons.cancel")}
                </Button>
                <div className={classes.btnWrapper}>
                  <Button
                    type="submit"
                    color="primary"
                    disabled={isSubmitting}
                    variant="contained"
                    className={classes.buttonCollapse}
                  >
                    {integrationId
                      ? `${i18n.t("apiIntegrationModal.buttons.okEdit")}`
                      : `${i18n.t("apiIntegrationModal.buttons.okAdd")}`}
                    {isSubmitting && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )}
                  </Button>
                </div>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default ApiIntegrationModal;
