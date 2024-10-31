import axios from "axios";
import * as SecureStorage from "expo-secure-store";

const axiosAuth = axios.create({
  baseURL: "https://tastebuds-4mr3.onrender.com/",
  headers: {},
});

// const axiosAuth = axios.create({
//   baseURL: "http://localhost:3000/",
//   headers: {},
// });

axiosAuth.interceptors.request.use(
  async (config) => {
    try {
      let accessToken;
      if (config.url == "/users/account/password") {
        accessToken = await SecureStorage.getItemAsync("passwordToken");
      } else {
        accessToken = await SecureStorage.getItemAsync("accessToken");
      }
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosAuth.interceptors.response.use(
  async (response) => {
    if (response.data?.accessToken) {
      console.log("setting access token...");
      await SecureStorage.setItemAsync(
        "accessToken",
        response.data.accessToken
      );
      await SecureStorage.setItemAsync(
        "refreshToken",
        response.data.refreshToken
      );
    }
    if (response.data?.passwordToken) {
      console.log("setting password token...");
      await SecureStorage.setItemAsync(
        "passwordToken",
        response.data.passwordToken
      );
    }
    return response;
  },
  async (error) => {
    console.log(error.response?.data.error);
    const originalRequest = error.config;

    if (
      error.response?.status == 401 &&
      error.response?.data.error == "Not authorized" &&
      !originalRequest._retry
    ) {
      // refresh access token when url is not password route
      if (originalRequest.url != "/users/account/password") {
        originalRequest._retry = true;
        const refreshToken = await SecureStorage.getItemAsync("refreshToken");
        if (refreshToken) {
          try {
            const response = await axios.post(
              // "https://tastebuds-4mr3.onrender.com/refresh",
              "http://localhost:3000/refresh",
              {},
              {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              }
            );
            const newAccessToken = response.data.accessToken;

            await SecureStorage.setItemAsync("accessToken", newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosAuth;
