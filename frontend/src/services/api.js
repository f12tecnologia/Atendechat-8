import axios from "axios";

const getBaseUrl = () => {
        if (process.env.REACT_APP_BACKEND_URL) {
                return process.env.REACT_APP_BACKEND_URL;
        }
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
        response => response,
        async error => {
                console.error("[API] Response error:", error.response?.data || error.message);

                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                        console.warn("[API] Unauthorized - Token may be invalid");
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

                        originalRequest._retry = true;
                        isRefreshing = true;

                        const refreshToken = localStorage.getItem("refreshToken");

                        if (!refreshToken) {
                                console.log("No refresh token available, redirecting to login");
                                isRefreshing = false;
                                processQueue(new Error("Session expired"), null);
                                localStorage.clear();
                                setTimeout(() => {
                                        window.location.href = "/login";
                                }, 100);
                                return Promise.reject(error);
                        }

                        try {
                                let parsedRefreshToken = refreshToken;
                                try {
                                        parsedRefreshToken = JSON.parse(refreshToken);
                                } catch (e) {
                                        // Already a plain string
                                }

                                const { data } = await openApi.post("/auth/refresh_token", {
                                        refreshToken: parsedRefreshToken
                                });

                                if (data.token) {
                                        localStorage.setItem("token", data.token);
                                        if (data.refreshToken) {
                                                localStorage.setItem("refreshToken", data.refreshToken);
                                        }
                                        api.defaults.headers.Authorization = `Bearer ${data.token}`;
                                        originalRequest.headers.Authorization = `Bearer ${data.token}`;
                                        processQueue(null, data.token);
                                        return api(originalRequest);
                                }
                        } catch (refreshError) {
                                console.error("Refresh token error:", refreshError);
                                processQueue(refreshError, null);
                                localStorage.clear();
                                isRefreshing = false;
                                window.location.href = "/login";
                                return Promise.reject(refreshError);
                        } finally {
                                isRefreshing = false;
                        }
                }

                return Promise.reject(error);
        }
);

export const openApi = axios.create({
	baseURL: getBaseUrl(),
	withCredentials: false,
});


export default api;