module.exports = function (app) {
    app.get('/trello/input-googledocs/:id', (req, res, next) => {
        if (req.params.id !== 'preview') {
            res.redirect(`https://docs.google.com/document/d/${encodeURIComponent(req.params.id)}/edit`)
        } else {
            next()
        }
    })
}
