const path = require("node:path");

module.exports = {
	development: {
		client: "pg",
		connection: process.env.DATABASE_URL ?? "postgres://uber:uber@localhost:5432/uber",
		migrations: { directory: path.join(__dirname, "migrations") },
	},
};
