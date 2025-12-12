import axios from "axios";

const api = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:8080",
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
});

api.interceptors.request.use(
	config => {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	error => {
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
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
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
				localStorage.clear();
				isRefreshing = false;
				processQueue(new Error("Session expired"), null);
				window.location.href = "/login";
				return Promise.reject(error);
			}

			try {
				const { data } = await openApi.post("/auth/refresh_token", {
					refreshToken
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
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:8080",
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});


export default api;