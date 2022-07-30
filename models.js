require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');

const dialectOptions =
    process.env.ENV === 'test'
        ? {}
        : {
              ssl: {
                  require: true,
                  rejectUnauthorized: false,
              },
          };

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialectOptions,
});

// Models
const Team = sequelize.define('Team', {
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
    license: {
        type: DataTypes.STRING,
    },
    active: {
        type: DataTypes.BOOLEAN,
    },
});

const User = sequelize.define('User', {
    userId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    teamId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    realName: {
        type: DataTypes.STRING,
    },
    profileImage: {
        type: DataTypes.TEXT,
    },
});

// Migrate
(async () => {
    await sequelize.sync();
})();

module.exports = {
    Team,
    User,
};
