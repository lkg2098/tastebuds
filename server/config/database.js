import { Sequelize } from "sequelize";

const dbConfigs = {
  development: {
    user: null,
    host: "127.0.0.1",
    database: "api",
    password: null,
    port: 5432,
    dialect: "postgres",
  },
  test: {
    user: null,
    host: "127.0.0.1",
    database: "testApi",
    password: null,
    port: 5432,
    dialect: "postgres",
    logging: false,
  },
  production: {
    url: process.env.POSTGRES_CONFIG_LINK,
    ssl: { rejectUnauthorized: false },
    dialect: "postgres",
  },
};

const config = dbConfigs[process.env.NODE_ENV];

const db = new Sequelize(config);

export default db;
