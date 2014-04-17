mongoose = require('mongoose');

var cellSchema = mongoose.Schema({
    frame: Number,
    id: Number,
    error: Number 
});

module.exports = mongoose.model('Cell', cellSchema);