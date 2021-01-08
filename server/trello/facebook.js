const graph = require('fbgraph');
const util = require('util');
const escapeHtml = require('escape-html')

module.exports = function (app) {
    app.get('/trello/output-facebook/preview-post', async (req, res) => {
        const {url, access_token} = req.query
        try {
            graph.setAccessToken(access_token);
            const api = await util.promisify(graph.get)(`/oembed_post?maxwidth=512&url=${encodeURIComponent(url)}`);
            res.send(`<style>html,body{overflow:hidden}</style>${api.html}<script src="https://p.trellocdn.com/power-up.min.js"></script><script>setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {}), 1000)</script>`)
            res.end()
        } catch (e) {
            res.send(`Unable to preview post: <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`)
            res.end()
        }
    })
    app.post('/trello/output-facebook/list-pages', async (req, res) => {
        const {access_token} = req.body
        graph.setAccessToken(access_token);
        try {
            const response = await util.promisify(graph.get)("/me/accounts")
            res.json(response.data)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.end()
        }
    })
    app.post('/trello/output-facebook/me', async (req, res) => {
        const {id, access_token} = req.body
        graph.setAccessToken(access_token);
        try {
            const [me, picture] = await Promise.all([
                util.promisify(graph.get)(`/${id}?fields=name,can_post`),
                util.promisify(graph.get)(`/${id}/picture`),
            ])
        res.json({me, picture})
        } catch (e) {
            console.error(e)
            res.status(500)
            res.end()
        }
    })
    app.post('/trello/output-facebook/publish', async (req, res) => {
        const {id, access_token, message} = req.body
        graph.setAccessToken(access_token);
        try {
            const response = await util.promisify(graph.post)(`/${id}/feed`, {message})
            res.json(response)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.end()
        }
    })
};
