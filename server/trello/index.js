
module.exports = function (app) {
    require('./googleDocs')(app);
    require('./twitter')(app);
    require('./medium')(app);
    require('./canva')(app);
    require('./telegram')(app);
    require('./facebook')(app);
}
