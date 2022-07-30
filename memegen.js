const fetch = require('node-fetch');
const NodeCache = require('node-cache');

const BASE_URL = 'https://api.memegen.link';
const cache = new NodeCache();

const getMemeTemplatesNoCache = async () => {
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
        console.error('List meme err:', err);
        return [[], {}];
    }
};

const getMemeTemplates = async () => {
    const cacheKey = 'templatesCache';
    const result = cache.get(cacheKey);
    if (!result) {
        const data = await getMemeTemplatesNoCache();
        if (data[0].length) {
            cache.set(cacheKey, data);
        }
        return data;
    }

    return result;
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
