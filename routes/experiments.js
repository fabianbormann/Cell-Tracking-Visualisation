var fs = require('fs-extra'),
    mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
var Experiment = require('../models/Experiment');
var Path = require('../models/Path');
var Property = require('../models/Property');

exports.clearDatabase = function(req, res) {
    Experiment.remove({}, function(err) { 
        console.log('Experiments removed');
        Path.remove({}, function(err) { 
            console.log('Paths removed');
            Property.remove({}, function(err) { 
                console.log('Properties removed');
                res.redirect('/');
            });
        });
    });
}

exports.showWorkspace = function(req, res) {
    Experiment.find(function(err, experiments) {
        res.render('workspace', { 
            experiments : experiments 
        });
    });
};

exports.findById = function(req, res) {
    Experiment.findOne({'_id': req.params.id}, function(err, experiment) {
        if (experiment) {

            files = fs.readdir("./public/data/"+experiment.name+"/images", function(err, files){
                if(err){
                    throw err;
                }
                else {
                    settings = {
                        options : files, 
                        path : "/data/"+experiment.name+"/",
                        maximalFrames : experiment.frames
                    };

                    res.render('experiment', { 
                        experiment : experiment,
                        settings : settings
                   });
                }
            });
        } 
        else {
            res.redirect('/upload/');
        }
    });
};

exports.getPath = function(req, res) {
    Path.findOne( { id : parseInt(req.params.path), experimentId : req.params.experiment }, function(err, path) {
        res.send(path);
    })
}

exports.getMatchedPaths = function(req, res) {
    var query = {};
    var filter = req.body.filter;
    var completeQuery = "";

    if(filter.include == 'true')
        query[filter.option] = { $gt : filter.from, $lt : filter.to };  
    else 
        query[filter.option] = { $not : {$gt : filter.from, $lt : filter.to} };
    
    console.log(query);

    Property.find({ $and : [query, { experiment_id : req.body.filter.experiment }] }, function(err, properties) {
        if(err) {
            throw err;
        }
        else {
            var path_ids = [];
            for (var i = 0; i < properties.length; i++) {
                path_ids.push(properties[i].path_id);
            }

            console.log(path_ids)

            Path.find({'_id':{ $in: path_ids}}, function(err, paths) {
                if(err) {
                    throw err;
                }
                else {
                    res.send(paths);
                }
            });
        }
    });
}