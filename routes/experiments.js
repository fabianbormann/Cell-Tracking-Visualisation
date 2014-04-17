var fs = require('fs.extra'),
    mongoose = require('mongoose'),
    unzip = require('unzip'),
    temp = require('temp');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
var Experiment = require('../models/Experiment');
var Path = require('../models/Path');
var Cell = require('../models/Cell');

exports.clearDatabase = function(req, res) {
    Experiment.remove({}, function(err) { 
        console.log('collection removed');
        res.redirect('/');
    });
}

exports.showAll = function(req, res) {
    Experiment.find(function(err, experiments) {
        res.render('experiments', { 
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

exports.uploadFile = function(req, res) {

    temp.mkdir('node-unzip-', function (err, dirPath) {
        if (err) {
          throw err;
        }
        var unzipExtractor = unzip.Extract({ path: dirPath });
        unzipExtractor.on('error', function(err) {
          throw err;
        });
        unzipExtractor.on('close', handleExperimentData);

        fs.createReadStream(req.files.image.path).pipe(unzipExtractor);

        function handleExperimentData() {
            var Experimentdata = JSON.parse(fs.readFileSync(dirPath+"/experiment.json"));

            fs.mkdirp('./public/data/'+req.body.experimentName+'/images', function (err) {
                if (err) {
                    console.log(err);
                } else {
                    fs.copyRecursive(dirPath+'/images', './public/data/'+req.body.experimentName+'/images', function (err) {
                        if (err) {
                            console.log(err);
                        }
                        else{
                        fs.mkdirp('./public/data/'+req.body.experimentName+'/frames', function (err) {
                            if (err) {
                                console.log(err);
                            } 
                            else {
                                fs.copyRecursive(dirPath+'/frames', './public/data/'+req.body.experimentName+'/frames', function (err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    else {
                                        fs.copy(dirPath+'/am.json', './public/data/'+req.body.experimentName+'/am.json', function (err) {
                                        if (err) {
                                            throw err;
                                        }});
                                        
                                        /*
                                        fs.copy(dirPath+'/paths.json', './public/data/'+req.body.experimentName+'/paths.json', function (err) {
                                        if (err) {
                                            throw err;
                                        }});
                                        */

                                        var pathData = fs.readFileSync(dirPath+"/paths.json");

                                        pathData += " ";
                                        pathData = pathData.replace(/\bNaN\b/g, "null");
                                        pathData = JSON.parse(pathData);

                                        for(var path_id = 0; path_id < pathData.paths.length; path_id++) {
                                        
                                            var path = new Path({
                                                    id: pathData.paths[path_id].id, 
                                                    length: pathData.paths[path_id].length, 
                                                    edist: pathData.paths[path_id].edist, 
                                                    adist: pathData.paths[path_id].adist, 
                                                    msd: pathData.paths[path_id].msd,
                                                    angle: pathData.paths[path_id].angle, 
                                                    speed: pathData.paths[path_id].speed,
                                                    meanspeed: pathData.paths[path_id].meanspeed, 
                                                    directness: pathData.paths[path_id].directness, 
                                                    fmi: pathData.paths[path_id].fmi, 
                                                    cmd: pathData.paths[path_id].cmd, 
                                                    flags: pathData.paths[path_id].flags, 
                                                    predecessors: pathData.paths[path_id].predecessors, 
                                                    successors: pathData.paths[path_id].successors, 
                                                    coordinates: pathData.paths[path_id].coordinates,
                                                    cells: [],
                                            });

                                            for(var cell_id = 0; cell_id < pathData.paths[path_id].cells[0].length; cell_id++) {
                                                var cell = new Cell({
                                                    frame: pathData.paths[path_id].cells[0][0],
                                                    id: pathData.paths[path_id].cells[0][1],
                                                    error: pathData.paths[path_id].cells[0][2] 
                                                });
                                                cell.save();
                                                path.cells.push(cell._id);
                                            }
                                            path.save();
                                        }

                                        fs.copy(dirPath+'/experiment.json', './public/data/'+req.body.experimentName+'/experiment.json', function (err) {
                                        if (err) {
                                            throw err;
                                        }});

                                        var experiment = new Experiment({ name: req.body.experimentName,
                                            image: '/data/'+req.body.experimentName+'/images/contrast1/' + 'frame000.png',
                                            description: req.body.description,
                                            authors: req.body.authors,
                                            date: new Date(Experimentdata.experiment.date),
                                            tracks: Experimentdata.experiment.tracks,
                                            number_of_objects: Experimentdata.experiment.number_of_objects,
                                            frames: Experimentdata.experiment.frames,
                                            resolution: Experimentdata.experiment.resolution,
                                            framesize: Experimentdata.experiment.framesize,
                                            flagnames: Experimentdata.experiment.flagnames
                                        });

                                        experiment.save();

                                        res.render('upload_finished', {
                                            experimentId: experiment._id,
                                            name: req.body.experimentName,
                                            size: Math.round(req.files.image.size / 1024 || 0)
                                        });
                                    }
                                }); 
                            }
                        });
                        }
                    });
                }
            });
        };
    });
};

exports.getPath = function(req, res) {
    Path.find({}, function(err, paths) {
        res.send(paths[0]);
    })
}