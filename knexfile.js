require("dotenv").config();

module.exports = {
  client: "mysql2",
  connection: {
    host: "instockbackend.cdw8he38lb8c.us-east-2.rds.amazonaws.com",
    user: process.env.DB_LOCAL_USER,
    password: process.env.DB_LOCAL_PASSWORD,
    database: process.env.DB_LOCAL_DBNAME,
    charset: "utf8",
  },
};
