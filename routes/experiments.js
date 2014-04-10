var fs = require('fs.extra'),
    mongoose = require('mongoose'),
    unzip = require('unzip'),
    temp = require('temp');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
var Experiment = require('../models/Experiment');

exports.clearDatabase = function(req, res) {
    Experiment.remove({}, function(err) { 
        console.log('collection removed');
        res.redirect('/');
    });
}

exports.showAll = function(req, res) {
    Experiment.find(function(err, experiments) {
        console.log(experiments)
        res.render('experiments', { experiments: experiments });
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
                                        fs.copy(dirPath+'/paths.json', './public/data/'+req.body.experimentName+'/paths.json', function (err) {
                                        if (err) {
                                            throw err;
                                        }});
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