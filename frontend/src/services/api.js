
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL !== undefined ? process.env.REACT_APP_BACKEND_URL : "",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const openApi = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL !== undefined ? process.env.REACT_APP_BACKEND_URL : "",
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});


export default api;
