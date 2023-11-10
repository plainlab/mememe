require('dotenv').config();

const { SlackAdapter } = require('botbuilder-adapter-slack');
const { Botkit } = require('botkit');
const svc = require('./services');
const meme = require('./memegen');
const util = require('./util');
const fetch = require('node-fetch');

const memeListUrl = `${process.env.BASE_URL}/list`;
const redirectUri = `${process.env.BASE_URL}/install/auth`;

const adapter = new SlackAdapter({
    clientSigningSecret: process.env.SLACK_SECRET,
    clientId: process.env.CLIENT_ID, // oauth client id
    clientSecret: process.env.CLIENT_SECRET, // oauth client secret
    scopes: ['commands', 'users:read'], // oauth scopes requested, 'bot' deprecated by Slack in favor of granular permissions
    redirectUri, // url to redirect post-login
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

controller.webserver.set('view engine', 'ejs');

controller.webserver.get('/', (req, res) => {
    res.render('index');
});

controller.webserver.get('/list', async (req, res) => {
    const [ids, templates] = await meme.getMemeTemplates();
    const memes = ids.map((key) => ({
        key,
        name: templates[key].name,
        url: meme.buildUrl(key, [], null, null, 250),
    }));
    res.render('list', { memes });
});

controller.webserver.get('/meme', async (req, res) => {
    const message = req.query['m'] || req.query['msg'] || req.query['message'];
    if (!message) {
        res.send('Not found');
        return;
    }

    const lines = String(message)
        .normalize()
        .split('|')
        .map((it) => it.trim());
    let template = lines[0];
    let texts = lines
        .slice(1)
        .map((x) => x && encodeURIComponent(x.split(' ').join('_')));
    let url;

    const [ids, templates] = await meme.getMemeTemplates();
    if (!ids.length) {
        res.send('Internal server error');
        return;
    }

    if (templates[template]) {
        url = meme.buildUrl(template, texts);
    } else if (template.indexOf('http') === 0) {
        url = meme.buildUrl('custom', texts, template);
    } else {
        res.send('Invalid request');
        return;
    }

    fetch(url).then((actual) => {
        actual.headers.forEach((v, n) => res.setHeader(n, v));
        actual.body.pipe(res);
    });
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
        console.error('Oauth err:', err);
        // customize your post-install failure page
        res.status(401);
        res.send(err.message);
    }
});

controller.on('slash_command', async (bot, message) => {
    console.log(message);
    if (message.text === '' || message.text === 'help') {
        bot.replyPrivate(
            message,
            `Post a meme: /meme meme-key | top text | bottom text\n👉 Gallery: ${memeListUrl}`
        );
    } else if (message.text === 'list') {
        const [ids, templates] = await meme.getMemeTemplates();
        if (!ids.length) {
            bot.replyPrivate(
                message,
                'Failed to list templates, please try again!'
            );
            return;
        }
        let helpText = [];
        ids.forEach((key) => {
            helpText.push(`\`${key}\`: ${templates[key].name}`);
        });
        helpText.sort();
        helpText.push(`👉 Gallery: ${memeListUrl}`);
        bot.replyPrivate(message, helpText.join('\n'));
    } else {
        const lines = message.text.split('|').map((it) => it.trim());
        let template = lines[0];
        let texts = lines
            .slice(1)
            .map((x) => x && encodeURIComponent(x.split(' ').join('_')));
        let bg;

        const [ids, templates] = await meme.getMemeTemplates();
        if (!ids.length) {
            bot.replyPrivate(
                message,
                'Failed to get templates, please try again!'
            );
            return;
        }

        if (templates[template]) {
            bot.replyPublic(message, {
                attachments: meme.buildAttachments(
                    message.user_name,
                    template,
                    texts,
                    bg
                ),
            });
            return;
        }

        if (template.indexOf('http') === 0) {
            bot.replyPublic(message, {
                attachments: meme.buildAttachments(
                    message.user_name,
                    'custom',
                    texts,
                    template
                ),
            });
            return;
        }

        if (template.indexOf('@') === 0) {
            const name = template.slice(1);
            const user = await svc.getUser(bot, message.team_id, name);
            if (user) {
                bot.replyPublic(message, {
                    attachments: meme.buildAttachments(
                        message.user_name,
                        'custom',
                        texts,
                        user.profileImage
                    ),
                });
                return;
            }
        }

        // Randomize for now
        let random = util.randomInt(0, ids.length);
        if (lines.length === 1) texts = [template];
        template = ids[random];
        bot.replyPublic(message, {
            attachments: meme.buildAttachments(
                message.user_name,
                template,
                texts
            ),
        });
        return;
    }
});
