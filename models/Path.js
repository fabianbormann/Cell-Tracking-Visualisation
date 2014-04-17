mongoose = require('mongoose');

var pathSchema = mongoose.Schema({
    id: Number, 
    length: Number, 
    edist: Number, 
    adist: Number, 
    msd: Array,
    angle: Number, 
    speed: Array,
    meanspeed: Number, 
    directness: Number, 
    fmi: Array, 
    cmd: Number, 
    flags: Array, 
    predecessors: Array, 
    successors: Array, 
    coordinates: Array,
    cells: Array,
});

module.exports = mongoose.model('Path', pathSchema);