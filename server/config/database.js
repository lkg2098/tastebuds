import { Sequelize } from "@sequelize/core";
import { PostgresDialect } from "@sequelize/postgres";

const dbConfigs = {
  development: {
    user: "lauren",
    host: "localhost",
    database: "api",
    password: process.env.POSTGRESQL_PASSWORD,
    port: 5432,
    dialect: PostgresDialect,
  },
  test: {
    user: "lauren",
    host: "localhost",
    database: "testApi",
    password: process.env.POSTGRESQL_PASSWORD,
    port: 5432,
    dialect: PostgresDialect,
  },
  production: {
    url: process.env.POSTGRES_CONFIG_LINK,
    ssl: { rejectUnauthorized: false },
    dialect: PostgresDialect,
  },
};

const config = dbConfigs[process.env.NODE_ENV];

const db = new Sequelize(config);

export default db;
