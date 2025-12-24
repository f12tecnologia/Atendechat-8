import axios from "axios";

const getBaseUrl = () => {
        if (process.env.REACT_APP_BACKEND_URL) {
                return process.env.REACT_APP_BACKEND_URL;
        }
        // Use same origin - backend runs on same port as frontend
        if (typeof window !== 'undefined' && window.location.origin) {
                return window.location.origin;
        }
        return '';
};

const api = axios.create({
        baseURL: getBaseUrl(),
        withCredentials: true,
        headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
        }
});

api.interceptors.request.use(
        config => {
                let token = localStorage.getItem("token");
                if (token) {
                        // Remove JSON parsing if token is already a string
                        try {
                                token = JSON.parse(token);
                        } catch (e) {
                                // Token is already a plain string
                        }
                        config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
        },
        error => {
                console.error("[API] Request error:", error);
                return Promise.reject(error);
        }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
        failedQueue.forEach(prom => {
                if (error) {
                        prom.reject(error);
                } else {
                        prom.resolve(token);
                }
        });
        failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se não tem response ou não é erro 401, rejeita direto
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Evitar loop infinito: não tentar refresh em rotas de auth ou se já tentou
    if (originalRequest.url?.includes('/auth/') || originalRequest._retry) {
      localStorage.removeItem("token");
      localStorage.removeItem("companyId");
      localStorage.removeItem("userId");
      
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Se já está fazendo refresh, coloca na fila
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    // Tenta refresh do token
    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await api.post("/auth/refresh_token");
      
      if (data && data.token) {
        localStorage.setItem("token", JSON.stringify(data.token));
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        
        processQueue(null, data.token);
        
        // Retry original request com novo token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } else {
        throw new Error("Invalid refresh response");
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      
      localStorage.removeItem("token");
      localStorage.removeItem("companyId");
      localStorage.removeItem("userId");
      
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const openApi = axios.create({
        baseURL: getBaseUrl(),
        withCredentials: false,
});


export default api;