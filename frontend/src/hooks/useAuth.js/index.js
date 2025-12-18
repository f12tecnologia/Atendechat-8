import { useState, useEffect, useContext } from "react";
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

  // Token interceptor is already handled in api.js

  let isRefreshing = false;
  let failedRequestsQueue = [];

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      if (error?.response?.status === 403 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          let storedRefreshToken = localStorage.getItem("refreshToken");
          try {
            storedRefreshToken = JSON.parse(storedRefreshToken);
          } catch (e) {
            // Already a plain string
          }

          const { data } = await api.post("/auth/refresh_token", { refreshToken: storedRefreshToken });

          if (data) {
            localStorage.setItem("token", data.token);
            if (data.refreshToken) {
              localStorage.setItem("refreshToken", data.refreshToken);
            }
            api.defaults.headers.Authorization = `Bearer ${data.token}`;

            failedRequestsQueue.forEach((request) => {
              request.resolve(data.token);
            });
            failedRequestsQueue = [];
          }

          return api(originalRequest);
        } catch (refreshError) {
          failedRequestsQueue.forEach((request) => {
            request.reject(refreshError);
          });
          failedRequestsQueue = [];

          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("companyId");
          localStorage.removeItem("userId");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (
        error?.response?.status === 401 ||
        (error?.response?.status === 403 && originalRequest._retry)
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("companyId");
        localStorage.removeItem("userId");
        api.defaults.headers.Authorization = undefined;
        setIsAuth(false);
      }

      return Promise.reject(error);
    }
  );

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const companyId = localStorage.getItem("companyId");

    if (token && companyId) {
      try {
        const parsedToken = JSON.parse(token);
        api.defaults.headers.Authorization = `Bearer ${parsedToken}`;
        setIsAuth(true);

        // Verificar se o token ainda é válido fazendo uma requisição simples
        api.get("/auth/me").catch((err) => {
          if (err?.response?.status === 401) {
            console.error("Token expired, attempting refresh");
            // O interceptor vai tentar renovar automaticamente
          }
        });
      } catch (err) {
        console.error("No refresh token available, redirecting to login");
        handleLogout();
      }
    } else {
      console.log("No token or companyId found");
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

  const handleLogin = async (credentials) => {
    setLoading(true);
    try {
      console.log("Login attempt for:", credentials.email);
      const { data } = await api.post("/auth/login", credentials);
      console.log("Login response:", data);

      const { token, refreshToken, user: userData } = data;

      // Store tokens
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      api.defaults.headers.Authorization = `Bearer ${token}`;

      // Ensure queues is always an array
      const userDataWithQueues = {
        ...userData,
        queues: Array.isArray(userData.queues) ? userData.queues : []
      };

      setUser(userDataWithQueues);
      localStorage.setItem("userId", JSON.stringify(userDataWithQueues.id));
      localStorage.setItem("companyId", JSON.stringify(userDataWithQueues.companyId));

      // Check subscription validity
      if (userData.company && userData.company.dueDate) {
        const dueDate = moment(userData.company.dueDate);
        const now = moment();
        if (dueDate.isBefore(now)) {
          toast.error(i18n.t("auth.toasts.expiredSubscription"));
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("companyId");
          localStorage.removeItem("userId");
          setLoading(false);
          return;
        }
        localStorage.setItem("cshow", JSON.stringify(userData.company.dueDate));
      }

      setLoading(false);
      setIsAuth(true);
      history.push("/tickets");
    } catch (err) {
      console.error("Login error:", err);
      toastError(err);
      setLoading(false);
    }
  };

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