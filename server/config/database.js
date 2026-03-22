import { Sequelize } from "sequelize";

const dbConfigs = {
  development: {
    user: "lauren",
    host: "localhost",
    database: "api",
    password: process.env.POSTGRESQL_PASSWORD,
    port: 5432,
    dialect: "postgres",
  },
  test: {
    user: "lauren",
    host: "localhost",
    database: "testApi",
    password: process.env.POSTGRESQL_PASSWORD,
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
