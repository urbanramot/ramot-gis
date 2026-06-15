/**
 * JERGIS Proxy Worker v2 — Cloudflare Worker
 * עדכן את הקוד ב-Cloudflare ולחץ Deploy מחדש
 */

const ALLOWED_HOSTS = [
  'gisviewer.jerusalem.muni.il',
  'ags.iplan.gov.il',
  'www.govmap.gov.il',
];

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const incomingUrl = new URL(request.url);
    const target = incomingUrl.searchParams.get('target');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing target parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // אבטחה: רק שרתים מאושרים
    if (!ALLOWED_HOSTS.some(h => targetUrl.hostname === h)) {
      return new Response(JSON.stringify({ error: 'Host not allowed: ' + targetUrl.hostname }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // העבר את כל הפרמטרים מהבקשה המקורית (חוץ מ-target) לשרת היעד
    incomingUrl.searchParams.forEach((val, key) => {
      if (key !== 'target') {
        targetUrl.searchParams.set(key, val);
      }
    });

    try {
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://gisviewer.jerusalem.muni.il/',
          'Origin': 'https://gisviewer.jerusalem.muni.il',
        },
      });

      const body = await response.arrayBuffer();

      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  },
};
