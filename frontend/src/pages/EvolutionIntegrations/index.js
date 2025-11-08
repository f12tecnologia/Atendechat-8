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
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";
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

const EvolutionIntegrations = () => {
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
          const { data } = await api.get("/api-integrations", {
            params: {
              type: "evolution",
              searchParam,
              pageNumber
            }
          });
          dispatch({ type: "LOAD_INTEGRATIONS", payload: data.apiIntegrations });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
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
        if (data.apiIntegration.type === "evolution") {
          dispatch({ type: "UPDATE_INTEGRATION", payload: data.apiIntegration });
        }
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
      toast.success("Integração Evolution API deletada com sucesso!");
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

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingIntegration &&
          `Deletar integração ${deletingIntegration.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteIntegration(deletingIntegration.id)}
      >
        Tem certeza que deseja deletar esta integração Evolution API? Esta ação não pode ser desfeita.
      </ConfirmationModal>
      <ApiIntegrationModal
        open={integrationModalOpen}
        onClose={handleCloseIntegrationModal}
        aria-labelledby="form-dialog-title"
        integrationId={selectedIntegration && selectedIntegration.id}
        defaultType="evolution"
      />
      <MainHeader>
        <Title>Integrações Evolution API</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder="Buscar integrações..."
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
            Adicionar
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
              <TableCell align="center">Nome</TableCell>
              <TableCell align="center">URL Base</TableCell>
              <TableCell align="center">Nome da Instância</TableCell>
              <TableCell align="center">API Key</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell align="center">{integration.name}</TableCell>
                  <TableCell align="center">{integration.baseUrl}</TableCell>
                  <TableCell align="center">
                    {integration.instanceName || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {integration.apiKey ? `${integration.apiKey.substring(0, 10)}...` : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={integration.isActive ? "Ativo" : "Inativo"}
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

export default EvolutionIntegrations;
