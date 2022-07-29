const request = require('request');

const MEME = "https://api.memegen.link";

const getMemeTemplates = (callback) => {
    let baseLink = `${MEME}/templates`;
    request(baseLink, (err, resp, body) => {
        if (!err && !resp.body.err) {
            const list = JSON.parse(body);
            const templates = {};
            const ids = [];
            list.forEach(temp => {
                templates[temp.id] = temp;
                ids.push(temp.id);
            });
            if (callback) callback(null, ids, templates);
        } else {
            if (callback) callback(true);
        }
    });
}


const buildUrl = (template, top, bottom, bg) => {
    return bg ? `${MEME}/images/${template}/${top || '_'}/${bottom || '_'}.jpg?background=${bg}` :
        `${MEME}/images/${template}/${top || '_'}/${bottom || '_'}.jpg`;
}


module.exports = {
    getMemeTemplates,
    buildUrl
};