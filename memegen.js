const fetch = require('node-fetch');

const BASE_URL = 'https://api.memegen.link';

const getMemeTemplates = async () => {
    const templatesLink = `${BASE_URL}/templates`;
    try {
        const resp = await fetch(templatesLink);
        const list = await resp.json();
        const templates = {};
        const ids = [];
        list.forEach((temp) => {
            templates[temp.id] = temp;
            ids.push(temp.id);
        });
        return [ids, templates];
    } catch (err) {
        return [[], {}];
    }
};

const buildUrl = (key, texts, bg) => {
    const textPath = texts.map((t) => t || '_').join('/') || '_';
    return bg
        ? `${BASE_URL}/images/${key}/${textPath}.jpg?background=${bg}`
        : `${BASE_URL}/images/${key}/${textPath}.jpg`;
};

const buildAttachments = (key, texts, bg) => {
    const memeUrl = buildUrl(key, texts, bg);
    return [
        {
            image_url: memeUrl,
            fallback: texts.join(' | '),
        },
    ];
};

module.exports = {
    getMemeTemplates,
    buildAttachments,
};
