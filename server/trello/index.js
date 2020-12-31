
module.exports = function (app) {
    require('./googleDocs')(app);
    require('./twitter')(app);
    require('./medium')(app);
}
