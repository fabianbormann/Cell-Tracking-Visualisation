mongoose = require('mongoose');

var experimentSchema = mongoose.Schema({
    name: String,
    id: Number,
    image: {
        extension : String,
        preview : String
    },
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
    flagnames: [String]
});

module.exports = mongoose.model('Experiment', experimentSchema);