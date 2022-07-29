require('dotenv').config();

const { SlackAdapter } = require('botbuilder-adapter-slack');
const { Botkit } = require('botkit');
const svc = require('./services');
const meme = require('./meme');
const util = require('./util');

const adapter = new SlackAdapter({
    clientSigningSecret: process.env.SLACK_SECRET,
    clientId: process.env.CLIENT_ID, // oauth client id
    clientSecret: process.env.CLIENT_SECRET, // oauth client secret
    scopes: ['commands', 'users:read'], // oauth scopes requested, 'bot' deprecated by Slack in favor of granular permissions
    redirectUri: process.env.REDIRECT_URI, // url to redirect post-login
    oauthVersion: 'v2', // or use v2
    getTokenForTeam: async (team_id) => {
        const team = await svc.getTeam(team_id);
        return team.token;
    },
    getBotUserByTeam: async (team_id) => {
        const team = await svc.getTeam(team_id);
        return team.userId;
    },
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
        const results = await controller.adapter.validateOauthCode(
            req.query.code
        );

        // Store token by team in bot state.
        let teamId = results.team.id;
        let token = results.access_token;
        let userId = results.bot_user_id;

        await svc.saveTeam({ teamId, token, userId });

        // customize your post-install success page
        res.send('Success! Bot installed.');
    } catch (err) {
        console.error('OAUTH ERROR:', err);
        // customize your post-install failure page
        res.status(401);
        res.send(err.message);
    }
});

controller.on('slash_command', async (bot, message) => {
    if (message.text === '' || message.text === 'help') {
        bot.replyPrivate(
            message,
            'Post a meme: /meme template_name | top_row | bottom_row\nList meme templates: /meme list'
        );
    } else if (message.text === 'list') {
        meme.getMemeTemplates((err, list, templates) => {
            if (err) {
                bot.replyPrivate(
                    message,
                    'Get templates error, please try again later!'
                );
                return;
            }
            let helpText = [];
            list.forEach((key) => {
                helpText.push(`\`${key}\`: ${templates[key].name}`);
            });
            helpText.sort();
            bot.replyPrivate(message, helpText.join('\n'));
        });
    } else {
        let lines = message.text.split('|').map((it) => it.trim());
        let [template, top, bottom] = lines;
        [top, bottom] = [top, bottom].map(
            (x) => x && encodeURIComponent(x.split(' ').join('_'))
        );
        let alt;

        const templatePromise = new Promise(function (resolve, reject) {
            meme.getMemeTemplates((err, list, templates) => {
                if (err) {
                    reject();
                    return;
                }

                if (templates[template]) {
                    resolve(template);
                    return;
                }

                if (template.indexOf('http') === 0) {
                    alt = template;
                    template = 'custom';
                    resolve(template);
                    return;
                }

                if (template.indexOf('@') === 0) {
                    const name = template.slice(1);
                    return Promise.resolve(
                        svc.getUser(bot, message.team_id, name).then((user) => {
                            if (user) {
                                alt = user.profileImage;
                                template = 'custom';
                                resolve(template);
                            }
                        })
                    );
                }

                let random = util.randomInt(0, list.length);
                if (lines.length === 1) top = template;
                template = list[random];
                resolve(template);
                return;
            });
        });

        templatePromise
            .then((template) => {
                let meme_url = meme.buildUrl(template, top, bottom, alt);
                let attachments = [
                    {
                        image_url: meme_url,
                        fallback: [top, bottom].join(' | '),
                    },
                ];
                bot.replyPublic(message, {
                    attachments: attachments,
                });
            })
            .catch(() => {
                bot.replyPrivate(message, 'Something went wrong!');
            });
    }
});
