const LoginWithTwitter = require('login-with-twitter')
const Twitter = require('twitter');

const twitterLogin = new LoginWithTwitter({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackUrl: process.env.TWITTER_CALLBACK_URL,
})

module.exports = function (app) {
    app.get('/trello/output-twitter/add-account', async (req, res) => {
        twitterLogin.login((err, tokenSecret, url) => {
            res.json({url, tokenSecret})
        })
    });
    app.get('/trello/output-twitter/add-account-callback', async (req, res) => {
        return res.send(`<script>window.opener.callback(${JSON.stringify(req.query.oauth_token)}, ${JSON.stringify(req.query.oauth_verifier)})</script>`)
    });
    app.post('/trello/output-twitter/add-account-ready', async (req, res) => {
        const {oauthToken, oauthVerifier, tokenSecret} = req.body;
        twitterLogin.callback({
            oauth_token: oauthToken,
            oauth_verifier: oauthVerifier
        }, tokenSecret, (err, user) => {
            if (err) {
                console.error(err);
                res.sendStatus(500);
                res.end()
                return
            }
            res.json(user)
        });
    });
}
