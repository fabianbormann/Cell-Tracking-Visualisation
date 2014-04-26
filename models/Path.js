mongoose = require('mongoose');

var pathSchema = mongoose.Schema({
    id: Number, 
    length: Number, 
    edist: Number, 
    adist: Number, 
    msd: [Number],
    angle: Number, 
    speed: [Number],
    meanspeed: Number, 
    directness: Number, 
    fmi: [Number], 
    displacement: [Number], 
    flags: [Number], 
    predecessors: [Number], 
    successors: [Number], 
    coordinates: Array,
    cells: String
});

module.exports = mongoose.model('Path', pathSchema);