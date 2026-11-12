import { request } from "../client";
import { endpoints } from "../registry";
import { loginResponseSchema, userSchema } from "../schemas";

export const authApi = {
  /** `auth: false`: a 401 here is a wrong password, not an expired session. */
  login: (body: { email: string; password: string }) =>
    request({ endpoint: endpoints.login, body, schema: loginResponseSchema, auth: false }),
  me: (signal?: AbortSignal) => request({ endpoint: endpoints.me, schema: userSchema, signal }),
};
