import "dotenv/config";
import { DataAPIClient } from "@datastax/astra-db-ts";

export function connectToDatabase() {
  const { ASTRA_DB_API_ENDPOINT: endpoint, ASTRA_DB_APPLICATION_TOKEN: token } = process.env;

  if (!token || !endpoint) {
    throw new Error("ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN must be set in .env");
  }

  const client = new DataAPIClient();
  return client.db(endpoint, { token });
}