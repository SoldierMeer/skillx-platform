import axios from "axios";
import { getToken } from "./authStorage";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api/v1";

export const mobileApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

mobileApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to retrieve token from SecureStore", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);
