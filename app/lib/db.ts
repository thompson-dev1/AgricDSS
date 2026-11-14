import "server-only";

import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";
import { existsSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Executor = Pick<Client, "execute"> | Pick<Transaction, "execute">;
type Params = unknown[];

function makeDatabase(executor: () => Executor) {
  return {
    prepare(sql: string) {
      return {
        async get(...args: Params) {
          const result = await executor().execute({ sql, args: args as InValue[] });
          return result.rows[0] as Record<string, unknown> | undefined;
        },
        async all(...args: Params) {
          const result = await executor().execute({ sql, args: args as InValue[] });
          return result.rows as unknown as Array<Record<string, unknown>>;
        },
        async run(...args: Params) {
          const result = await executor().execute({ sql, args: args as InValue[] });
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid === undefined ? undefined : Number(result.lastInsertRowid),
          };
        },
      };
    },
    async exec(sql: string) {
      return executor().execute(sql);
    },
  };
}

let client: Client | undefined;

function getClient(): Client {
  if (client) return client;
  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (remoteUrl && !authToken) throw new Error("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set.");
  if (remoteUrl) {
    client = createClient({ url: remoteUrl, authToken, intMode: "number" });
    return client;
  }
  if (process.env.NETLIFY || process.env.NODE_ENV === "production") {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to connect the deployed app to Turso.");
  }
  const configuredPath = process.env.AGRIC_DB_PATH || "../database.sqlite";
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configuredPath);
  if (!existsSync(databasePath)) throw new Error(`Local SQLite database not found at ${databasePath}.`);
  client = createClient({ url: pathToFileURL(databasePath).href, intMode: "number" });
  return client;
}

const transactionContext = new AsyncLocalStorage<Executor>();
const baseDatabase = makeDatabase(() => transactionContext.getStore() ?? getClient());

export const db = {
  ...baseDatabase,
  transaction<TArgs extends unknown[], TResult>(work: (...args: TArgs) => TResult | Promise<TResult>) {
    return async (...args: TArgs): Promise<TResult> => {
      const transaction = await getClient().transaction("write");
      try {
        const value = await transactionContext.run(transaction, () => Promise.resolve(work(...args)));
        await transaction.commit();
        return value;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    };
  },
};
export const writeDb = db;

export async function withWriteTransaction<T>(work: (tx: ReturnType<typeof makeDatabase>) => Promise<T>): Promise<T> {
  const transaction = await getClient().transaction("write");
  try {
    const value = await work(makeDatabase(() => transaction));
    await transaction.commit();
    return value;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
