import { Team } from './models'

const getTeam = async (teamId) => {
  return Team.findByPk(teamId)
}

const saveTeam = async({ teamId, token, userId }) => {
  return Team.upsert({ teamId, token, userId })
}


export default {
  getTeam,
  saveTeam,
}