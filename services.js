const { Team, User } = require('./models');

const getTeam = async (teamId) => {
    return Team.findByPk(teamId);
};

const saveTeam = async ({ teamId, token, userId }) => {
    return Team.upsert({ teamId, token, userId });
};

const getUser = async (bot, teamId, name) => {
    let user = await User.findOne({ where: { teamId, name } });
    if (user) {
        return user;
    }

    try {
        const { ok, members } = await bot.api.users.list();
        if (ok) {
            await Promise.all(
                members.map((mem) =>
                    User.upsert({
                        userId: mem.id,
                        teamId: mem.team_id,
                        name: mem.name,
                        realName: mem.real_name,
                        profileImage: mem.profile && mem.profile.image_512,
                    })
                )
            );
        }
        return await User.findOne({ where: { teamId, name } });
    } catch (err) {
        console.error('Get user err:', err);
        return null;
    }
};

module.exports = {
    getTeam,
    getUser,
    saveTeam,
};
