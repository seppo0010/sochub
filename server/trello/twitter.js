const https = require('https')
const animated = require('animated-gif-detector')
const LoginWithTwitter = require('login-with-twitter')
const Twitter = require('twitter');
const axios = require('axios')
const escapeHtml = require('escape-html')

const twitterLogin = new LoginWithTwitter({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackUrl: process.env.SOCHUB_BASE_URL + '/trello/output-twitter/add-account-callback',
})

module.exports = function (app) {
    app.get('/trello/output-twitter/preview-tweet', async (req, res) => {
        const url = req.query.url
        try {
            const api = await axios.get(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`, { accept: 'application/json' })
            res.send(`<style>html,body{overflow:hidden}</style>${api.data.html}<script src="https://p.trellocdn.com/power-up.min.js"></script><script>setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {}), 1000)</script>`)
            res.end()
        } catch (e) {
            res.send(`Unable to preview tweet: <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`)
            res.end()
        }
    })
    app.get('/trello/output-twitter/add-account', async (req, res) => {
        twitterLogin.login((err, tokenSecret, url) => res.json({url, tokenSecret}))
    });
    app.get('/trello/output-twitter/add-account-callback', async (req, res) => {
        return res.send(`<script>window.opener.callback(${JSON.stringify(req.query.oauth_token)}, ${JSON.stringify(req.query.oauth_verifier)})</script>`)
    });
    app.post('/trello/output-twitter/add-account-ready', async (req, res) => {
        const {oauthToken, oauthVerifier, tokenSecret} = req.body;
        twitterLogin.callback({
            oauth_token: oauthToken,
            oauth_verifier: oauthVerifier
        }, tokenSecret, (err, token) => {
            if (err) {
                console.error(err);
                res.sendStatus(500);
                res.end()
                return
            }
            const client = new Twitter({
                consumer_key: process.env.TWITTER_CONSUMER_KEY,
                consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                access_token_key: token.userToken,
                access_token_secret: token.userTokenSecret,
            });
            client.get('users/show', {user_id: token.userId}, (error, user, response) => {
                if (error) {
                    console.error(error);
                    res.status(400)
                } else {
                    res.json({token, user})
                }
            })
        });
    });

    app.post('/trello/output-twitter/twitter', async (req, res) => {
        const {from, tweets} = req.body;
        const client = new Twitter({
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token_key: from.userToken,
            access_token_secret: from.userTokenSecret,
        });
        let lastReply = undefined;
        let tweetPos = 0;

        const makePost = (endpoint, params) => {
            return new Promise((resolve, reject) => {
                client.post(endpoint, params, (error, data, response) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(data);
                    }
                });
            });
        }
        const initUpload = async (mediaSize, mediaType, mediaData) => {
            const d = {
                command        : 'INIT',
                total_bytes: mediaSize,
                media_type : mediaType,
            }
            if (mediaType === 'image/gif' && animated(mediaData)) d.media_category = 'tweet_gif'
            return (await makePost('media/upload', d)).media_id_string;
        }

        const appendUpload = async (mediaId, mediaData, index) => {
            await makePost('media/upload', {
                command            : 'APPEND',
                media_id         : mediaId,
                media                : mediaData,
                segment_index: index
            })
            return mediaId;
        }

        const finalizeUpload = async (mediaId) => {
            await makePost('media/upload', {
                command : 'FINALIZE',
                media_id: mediaId
            })
            return mediaId
        }

        const uploadAttachment = (url, alt) => new Promise((resolve, reject) => {
            https.get(url, (res) => {
                const data = [];
                res.on('data', (chunk) => {
                    data.push(chunk);
                }).on('end', async () => {
                    let body = Buffer.concat(data);
                    const chunkSize = 1024 * 1024
                    const mediaId = await initUpload(body.length, res.headers['content-type'], body)
                    const medias = await Promise.all([...Array(Math.ceil(body.length / chunkSize)).keys()].map((i) => appendUpload(mediaId, body.slice(i * chunkSize, (i + 1) * chunkSize), i)))
                    await finalizeUpload(medias[0])
                    /*
                    if (alt) {
                            client.post('media/metadata/create', {
                                media_id: mediaId,
                                alt_text: { text: alt },
                            }).then(() => resolve(mediaId));
                    }*/
                    resolve(mediaId)
                })
            });
        })

        const doTweet = async () => {
            const {text, attachments} = tweets[tweetPos];
            const media_ids = await Promise.all(attachments.map((url) => uploadAttachment(url)))
            const tweet = await client.post('statuses/update', {status: text.trim(), in_reply_to_status_id: lastReply, media_ids: media_ids.join(',')})
            lastReply = tweet.id_str;
        }

        const tweetNext = async () => {
            tweetPos++;
            if (!tweets[tweetPos]) return;
            await doTweet()
            return tweetNext()
        }
        try {
            await doTweet(tweets[0])
            let id = lastReply
            await tweetNext();
            res.json({id})
        } catch (e) {
            console.error(e)
            res.status(500)
            res.json({error: 'internal error'})
        }
    })
}
