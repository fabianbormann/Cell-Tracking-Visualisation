mongoose = require('mongoose');

var propertySchema = mongoose.Schema({
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
    coordinates: Array,
});

module.exports = mongoose.model('Property', propertySchema);