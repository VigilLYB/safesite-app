import { request } from "../client";
import { endpoints } from "../registry";
import { loginResponseSchema, userSchema } from "../schemas";

export const authApi = {
  /** `auth: false`: a 401 here is a wrong password, not an expired session. */
  login: (body: { email: string; password: string }) =>
    request({ endpoint: endpoints.login, body, schema: loginResponseSchema, auth: false }),
  /**
   * Exchanges the current token, even one that expired up to 7 days ago, for a fresh one.
   * `auth: false`: a 401 here means "sign in again", never another refresh.
   */
  refresh: (accessToken: string) =>
    request({
      endpoint: endpoints.refresh,
      body: { accessToken },
      schema: loginResponseSchema,
      auth: false,
    }),
  me: (signal?: AbortSignal) => request({ endpoint: endpoints.me, schema: userSchema, signal }),
};
