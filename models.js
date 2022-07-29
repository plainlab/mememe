import { Sequelize } from 'sequelize'
const sequelize = new Sequelize(process.env.DATABASE_URL)

// Models
const Team = sequelize.define('Team', {
  teamId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
});

// Migrate
(async () => {
  await sequelize.sync({ force: true });
})();

module.exports = {
  Team
}