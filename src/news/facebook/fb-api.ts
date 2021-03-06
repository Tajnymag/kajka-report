import axios from 'axios';
import cheerio from 'cheerio';
import chrono from 'chrono-node/src/chrono';
import {subHours, subMinutes} from "date-fns";

const FACEBOOK_URL_DESKTOP = 'https://www.facebook.com/';
const FACEBOOK_URL_MOBILE = 'https://mobile.facebook.com/';

function parsePostContent(contentString: string): {title: string; content: string} {
    let title = '';
    let content = contentString;

    const matches = contentString.match(/\[(.*?)\]/);

    if (matches) {
        title = matches[1];
    }

    content = content.replace(`[${title}]`, '').trim();

    return { title, content }
}

function parseFacebookDate(dateString: string) {
    const extractedNumbers = dateString.match(/\d+/);

    if (dateString.includes('hrs') || dateString.includes('hours')) {
        if (!extractedNumbers || !extractedNumbers[0]) {
            throw new Error('Could not parse time from string: ' + dateString);
        }

        const parsedHours = extractedNumbers[0];

        return subHours(new Date(), Number(parsedHours));
    }

    if (dateString.includes('min')) {
        if (!extractedNumbers || !extractedNumbers[0]) {
            throw new Error('Could not parse time from string: ' + dateString);
        }

        const parsedMinutes = extractedNumbers[0];

        return subMinutes(new Date(), Number(parsedMinutes));
    }

    const parsedDate: Date = chrono.parseDate(dateString);

    return parsedDate;
}

async function getPageHTML(pageId: string) {
    const res = await axios.get(FACEBOOK_URL_MOBILE + pageId, {
        transformResponse: [(data) => { return data; }],
        headers: {
            'Accept-Language': 'en;q=0.5'
        }
    });

    return res.data;
}

function extractLink(document: Cheerio) {
    const href = document.find('a:contains("Full Story")').attr('href');

    return FACEBOOK_URL_DESKTOP + href;
}

export async function getPagePosts(pageId: string) {
    const pageHTML = await getPageHTML(pageId);
    const $ = cheerio.load(pageHTML);

    const posts: {title: string; content: string; link: string, date: Date}[] = [];

    const postEls = $('#recent > div:nth-child(1) > div:nth-child(1) > div');
    postEls.each((i, el) => {
        const content = $(el).find('div:nth-child(1) > div:nth-child(2) > span').text();
        const link = extractLink($(el));
        const date = $(el).find('div:nth-child(1) abbr').text();

        posts.push({ ...parsePostContent(content), link, date: parseFacebookDate(date) });
    });

    return posts;
}
