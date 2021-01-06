const graph = require('fbgraph');

module.exports = function (app) {
    app.post('/trello/output-facebook/list-pages', async (req, res) => {
        const {access_token} = req.body
        graph.setAccessToken(access_token);
        graph.get("/me/accounts", function(err, response) {
            if (err) {
                console.error(err)
                res.writeStatus(500);
                return
            }
            res.json(response.data)
        });
    })
    app.post('/trello/output-facebook/publish', async (req, res) => {
        const {id, access_token, message} = req.body
        graph.setAccessToken(access_token);
        graph.post(`/${id}/feed`, {message}, function(err, response) {
            if (err) {
                console.error(err)
                res.writeStatus(500);
                return
            }
            res.json(response.data)
        });
    })
};
