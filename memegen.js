require('dotenv').config();

const fetch = require('node-fetch');
const NodeCache = require('node-cache');

const BASE_URL = process.env.MEMEGEN_URI || 'https://api.memegen.link';
const cache = new NodeCache();

// Mostly because of too heavy
const excludedTemplates = { ptj: true };

const getMemeTemplatesNoCache = async () => {
    const templatesLink = `${BASE_URL}/templates`;
    try {
        const resp = await fetch(templatesLink);
        const list = await resp.json();
        const templates = {};
        const ids = [];
        list.forEach((temp) => {
            if (!excludedTemplates[temp.id]) {
                templates[temp.id] = temp;
                ids.push(temp.id);
            }
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

const buildUrl = (key, texts, bg, height) => {
    const textPath = texts.map((t) => t || '_').join('/') || '_';
    const url = new URL(`${BASE_URL}/images/${key}/${textPath}.jpg`);
    const font = texts && texts.length ? 'notosans' : null;

    if (font) {
        url.searchParams.set('font', font);
    }

    if (bg) {
        url.searchParams.set('background', bg);
    }

    if (height) {
        url.searchParams.set('height', height);
    }

    return url.toString();
};

const buildAttachments = (from, key, texts, bg) => {
    const memeUrl = buildUrl(key, texts, bg);
    return [
        {
            text: `From @${from}`,
            image_url: memeUrl,
            fallback: texts.join(' | '),
        },
    ];
};

module.exports = {
    getMemeTemplates,
    buildAttachments,
    buildUrl,
};
