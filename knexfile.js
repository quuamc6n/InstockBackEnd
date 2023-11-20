require("dotenv").config();

module.exports = {
  client: "mysql2",
  connection: {
    host: "4.tcp.us-cal-1.ngrok.io",
    user: process.env.DB_LOCAL_USER,
    password: process.env.DB_LOCAL_PASSWORD,
    database: process.env.DB_LOCAL_DBNAME,
    charset: "utf8",
  },
};
