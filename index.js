require('dotenv').config()

const { SlackAdapter } = require('botbuilder-adapter-slack');
const { Botkit } = require('botkit');
const { saveTeam, getTeam } = require("./services");

const adapter = new SlackAdapter({
  clientSigningSecret: process.env.SLACK_SECRET,
  clientId: process.env.CLIENT_ID, // oauth client id
  clientSecret: process.env.CLIENT_SECRET, // oauth client secret
  scopes: ['commands', 'users.profile:read'], // oauth scopes requested, 'bot' deprecated by Slack in favor of granular permissions
  redirectUri: process.env.REDIRECT_URI, // url to redirect post-login
  oauthVersion: 'v2', // or use v2
  getTokenForTeam: async(team_id) => {
    const team = await getTeam(team_id)
    return team.token
  }, 
  getBotUserByTeam: async(team_id) => {
    const team = await getTeam(team_id)
    return team.userId
  }
});


const controller = new Botkit({
  adapter,
});

// Create a route for the install link.
// This will redirect the user to Slack's permission request page.
controller.webserver.get('/install', (req, res) => {
  res.redirect(adapter.getInstallLink());
});

// Create a route to capture the results of the oauth flow.
// this URL should match the value of the `redirectUri` passed to Botkit.
controller.webserver.get('/install/auth', async (req, res) => {
  try {
      const results = await controller.adapter.validateOauthCode(req.query.code);

      // Store token by team in bot state.
      let teamId = results.team.id;
      let token = results.access_token;
      let userId = results.bot_user_id;

      await saveTeam({ teamId, token, userId })

      // customize your post-install success page
      res.send('Success! Bot installed.');

  } catch (err) {
      console.error('OAUTH ERROR:', err);
      // customize your post-install failure page
      res.status(401);
      res.send(err.message);
  }
});

controller.on('slash_command', async(bot, message) => { 
  // the /<command> part
  let command = message.command;
  // the /command <parameters> part
  let parameter = message.text;

  await bot.replyPublic(message, `My response to your command is: ...${command} ${parameter}`);
});