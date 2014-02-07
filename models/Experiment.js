mongoose = require('mongoose');

var experimentSchema = mongoose.Schema({
    name: String,
    id: Number,
    image: String,
    authors: String,
    description: String,
    date: Date,
    tracks: Number,
    number_of_objects: Number,
    frames: Number,
    resolution: {
        y:  Number,
        x:  Number,
        z:  Number
    },
    framesize: {
        y: Number,
        x: Number,
        z: Number
    },
    flagnames: Array
});

module.exports = mongoose.model('Experiment', experimentSchema);