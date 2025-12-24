import { useState, useEffect, useContext, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import moment from "moment";
const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  // Token interceptor is already handled in api.js - removed duplicate interceptor

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const companyId = localStorage.getItem("companyId");

    if (token && companyId) {
      try {
        let parsedToken = token;
        try {
          parsedToken = JSON.parse(token);
        } catch (e) {
          // Token já é string
        }
        
        api.defaults.headers.Authorization = `Bearer ${parsedToken}`;
        setIsAuth(true);
        setLoading(false);

        // Verificar se o token ainda é válido
        api.get("/auth/me")
          .then(({ data }) => {
            setUser(data);
            setIsAuth(true);
          })
          .catch((err) => {
            console.error("Auth check failed:", err);
            // O interceptor vai tentar renovar automaticamente
            // Se falhar, vai redirecionar para login
          });
      } catch (err) {
        console.error("Token validation failed:", err);
        handleLogout();
      }
    } else {
      console.log("No token or companyId found");
      setLoading(false);
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (companyId) {
      const socket = socketManager.getSocket(companyId);

      socket.on(`company-${companyId}-user`, (data) => {
        if (data.action === "update" && data.user.id === user.id) {
          setUser(data.user);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [socketManager, user]);

  const handleLogin = useCallback(async (userData) => {
        setLoading(true);

        try {
            const { data } = await api.post("/auth/login", userData);
            const {
                user,
                token,
            } = data;

            localStorage.setItem("token", JSON.stringify(token));
            localStorage.setItem("companyId", user.companyId);
            localStorage.setItem("userId", user.id);

            // Garantir que o token está no formato correto
            const authToken = token.replace(/^"(.*)"$/, '$1');
            api.defaults.headers.Authorization = `Bearer ${authToken}`;

            setUser(data.user);
            setLoading(false);
            setIsAuth(true);
            toast.success(i18n.t("auth.toasts.success"));
            history.push("/tickets");
        } catch (err) {
            toastError(err);
            setLoading(false);
        }
    }, [history]);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("companyId");
      localStorage.removeItem("userId");
      localStorage.removeItem("cshow");
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      history.push("/login");
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (err) {
      toastError(err);
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
  };
};

export default useAuth;