import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/core/SearchIcon";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import Chip from "@material-ui/core/Chip";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ApiIntegrationModal from "../../components/ApiIntegrationModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_INTEGRATIONS") {
    const integrations = action.payload;
    const newIntegrations = [];

    integrations.forEach((integration) => {
      const integrationIndex = state.findIndex((s) => s.id === integration.id);
      if (integrationIndex !== -1) {
        state[integrationIndex] = integration;
      } else {
        newIntegrations.push(integration);
      }
    });

    return [...state, ...newIntegrations];
  }

  if (action.type === "UPDATE_INTEGRATION") {
    const integration = action.payload;
    const integrationIndex = state.findIndex((s) => s.id === integration.id);

    if (integrationIndex !== -1) {
      state[integrationIndex] = integration;
      return [...state];
    } else {
      return [integration, ...state];
    }
  }

  if (action.type === "DELETE_INTEGRATION") {
    const integrationId = action.payload;

    const integrationIndex = state.findIndex((s) => s.id === integrationId);
    if (integrationIndex !== -1) {
      state.splice(integrationIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const ApiIntegrations = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [deletingIntegration, setDeletingIntegration] = useState(null);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [integrations, dispatch] = useReducer(reducer, []);

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchIntegrations = async () => {
        try {
          const { data } = await api.get("/api-integrations");
          dispatch({ type: "LOAD_INTEGRATIONS", payload: data.integrations });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchIntegrations();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-apiIntegration`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_INTEGRATION", payload: data.apiIntegration });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_INTEGRATION", payload: +data.integrationId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  const handleOpenIntegrationModal = () => {
    setSelectedIntegration(null);
    setIntegrationModalOpen(true);
  };

  const handleCloseIntegrationModal = () => {
    setSelectedIntegration(null);
    setIntegrationModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditIntegration = (integration) => {
    setSelectedIntegration(integration);
    setIntegrationModalOpen(true);
  };

  const handleDeleteIntegration = async (integrationId) => {
    try {
      await api.delete(`/api-integrations/${integrationId}`);
      toast.success(i18n.t("apiIntegrations.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingIntegration(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const getIntegrationTypeColor = (type) => {
    switch (type) {
      case "evolution":
        return "#4caf50";
      case "telegram":
        return "#0088cc";
      case "instagram":
        return "#e4405f";
      case "email":
        return "#ea4335";
      default:
        return "#9e9e9e";
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingIntegration &&
          `${i18n.t("apiIntegrations.confirmationModal.deleteTitle")} ${
            deletingIntegration.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteIntegration(deletingIntegration.id)}
      >
        {i18n.t("apiIntegrations.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ApiIntegrationModal
        open={integrationModalOpen}
        onClose={handleCloseIntegrationModal}
        aria-labelledby="form-dialog-title"
        integrationId={selectedIntegration && selectedIntegration.id}
      />
      <MainHeader>
        <Title>{i18n.t("apiIntegrations.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("apiIntegrations.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenIntegrationModal}
          >
            {i18n.t("apiIntegrations.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.name")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.type")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.baseUrl")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.instanceName")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.status")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("apiIntegrations.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell align="center">{integration.name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={integration.type.toUpperCase()}
                      style={{
                        backgroundColor: getIntegrationTypeColor(integration.type),
                        color: "#fff",
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{integration.baseUrl}</TableCell>
                  <TableCell align="center">
                    {integration.instanceName || "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        integration.isActive
                          ? i18n.t("apiIntegrations.table.active")
                          : i18n.t("apiIntegrations.table.inactive")
                      }
                      color={integration.isActive ? "primary" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditIntegration(integration)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingIntegration(integration);
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={6} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default ApiIntegrations;
