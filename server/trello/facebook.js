const graph = require('fbgraph');
const util = require('util');

module.exports = function (app) {
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
