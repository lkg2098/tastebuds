const { Sequelize } = require("@sequelize/core");
const { PostgresDialect } = require("@sequelize/postgres");

const db = new Sequelize({
  url: process.env.POSTGRES_CONFIG_LINK,
  ssl: { rejectUnauthorized: false },
  dialect: PostgresDialect, // Change to your database type
});

module.exports = db;
