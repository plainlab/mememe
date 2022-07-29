require("dotenv").config();

const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL);

// Models
const Team = sequelize.define("Team", {
    teamId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Migrate
(async () => {
    await sequelize.sync();
})();

module.exports = {
    Team,
};
