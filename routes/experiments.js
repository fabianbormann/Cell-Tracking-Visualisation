var fs = require('fs-extra'),
    mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
var Experiment = require('../models/Experiment');
var Path = require('../models/Path');

exports.clearDatabase = function(req, res) {
    Experiment.remove({}, function(err) { 
        console.log('Experiments removed');
        Path.remove({}, function(err) { 
            console.log('Paths removed');
            res.redirect('/');
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
    var filters = req.body.filters;
    var completeQuery = "";

    for (var i = 0; i < filters.length; i++) {
        if(filters[i].inculde == "true")
            query[filters[i].option] = { $gt : filters[i].from, $lt : filters[i].to };  
        else 
            query[filters[i].option] = { $not : {$gt : filters[i].from, $lt : filters[i].to} };
    };

    console.log(query);

    Path.find({ $and : [query, { experiment_id : req.body.experiment }] }, function(err, paths) {
        if(err) {
            throw err;
        }
        else {
            var filterdCells = [];
            for(var i = 0; i < paths.length; i++) {
                filterdCells.push(JSON.parse(paths[i].cells));
            }
            res.send(filterdCells);
        }
    });
}