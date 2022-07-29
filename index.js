import { SlackAdapter } from "botbuilder-adapter-slack";
import { saveTeam, getTeam } from "./services";


const adapter = new SlackAdapter({
  clientSigningSecret: process.env.SLACK_SECRET,
  clientId: process.env.CLIENT_ID, // oauth client id
  clientSecret: process.env.CLIENT_SECRET, // oauth client secret
  scopes: ['bot'], // oauth scopes requested, 'bot' deprecated by Slack in favor of granular permissions
  redirectUri: process.env.REDIRECT_URI, // url to redirect post-login
  oauthVersion: 'v1', // or use v2
  getTokenForTeam: async(team_id) => {
    const team = await getTeam(team_id)
    return team.token
  }, 
  getBotUserByTeam: async(team_id) => {
    const team = await getTeam(team_id)
    return team.userId
  }
});

// Create a route for the install link.
// This will redirect the user to Slack's permission request page.
controller.webserver.get('/install', (req, res) => {
  res.redirect(adapter.getInstallLink());
});

// Create a route to capture the results of the oauth flow.
// this URL should match the value of the `redirectUri` passed to Botkit.
controller.webserver.get('/install/auth', (req, res) => {
  try {
      const results = await controller.adapter.validateOauthCode(req.query.code);

      // Store token by team in bot state.
      let teamId = results.team_id; // results.team.id in oauth v2
      let token = results.bot.bot_access_token; // results.access_token in oauth v2
      let userId = results.bot.bot_user_id; // results.bot_user_id in oauth v2

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