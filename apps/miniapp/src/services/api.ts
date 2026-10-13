import { authApi } from "./auth";
import { merchantApi } from "./merchant";
import { ordersApi } from "./orders";
import { session } from "./session";
import { shopsApi } from "./shops";

export { ApiError, getErrorMessage } from "./errors";

export const api = {
  get token() {
    return session.token;
  },
  get user() {
    return session.user;
  },
  get devAuthEnabled() {
    return authApi.devAuthEnabled;
  },
  restore: session.restore,
  logout: session.clear,
  isRole: authApi.isRole,
  login: authApi.login,
  loginWithWechat: authApi.loginWithWechat,
  ...shopsApi,
  ...ordersApi,
  ...merchantApi,
};
