import { app } from "../../../server.js";
import { generate_auth_tokens } from "../../auth.js";
import { request } from "chai-http";

export function createAuthenticatedTestServer({ user }) {
  const { accessToken } = generate_auth_tokens(user.id, user.username);

  const authToken = `Bearer ${accessToken}`;

  const server = request.execute(app);
  return {
    post: (url, body) =>
      server.post(url).send(body).set("Authorization", authToken),
    get: (url, query) =>
      server.get(url).query(query).set("Authorization", authToken),
    app,
  };
}
