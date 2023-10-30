module.exports = {
  client: "mysql2",
  connection: {
    host: "instockbackend.cdw8he38lb8c.us-east-2.rds.amazonaws.com",
    user: DB_LOCAL_USER,
    password: DB_LOCAL_PASSWORD,
    database: DB_LOCAL_DBNAME,
    charset: "utf8",
  },
};
