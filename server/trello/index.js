
module.exports = function (app) {
    require('./twitter')(app);
    require('./medium')(app);
    require('./canva')(app);
}
