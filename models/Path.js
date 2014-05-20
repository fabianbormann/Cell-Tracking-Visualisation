mongoose = require('mongoose');

var pathSchema = mongoose.Schema({
    id : Number,
    experimentId : String,
    cells: Array
});

module.exports = mongoose.model('Path', pathSchema);