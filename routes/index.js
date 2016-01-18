
var express = require('express');
var router = express.Router();

var fs = require('fs-extra');
var mongoose = require('mongoose');
var unzip = require('unzip');
var temp = require('temp');

var Experiment = require('../models/Experiment');
var Property = require('../models/Property');
var Path = require('../models/Path');

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

router.get('/', function(req, res){
	res.render('index');
});

router.get('/upload', function(req, res){
	res.render('upload');
});

router.post('/upload', multipartMiddleware, function(req, res) {
	var temporary = temp.mkdirSync('./node-unzip-')
   	var unzipExtractor = unzip.Extract({ path: temporary });
    unzipExtractor.on('error', function(err) {
      throw err;
    });
    unzipExtractor.on('close', handleExperimentData);
	fs.createReadStream(req.files.image.path).pipe(unzipExtractor);

    function handleExperimentData() {
        var Experimentdata = JSON.parse(fs.readFileSync(temporary+"/experiment.json"));

        fs.mkdirsSync('./public/data/'+req.body.experimentName);
        fs.copy(temporary+'/images', './public/data/'+req.body.experimentName+'/images', function (err) {
            if (err) {
                console.log(err);
            }
            else{
                fs.copy(temporary+'/frames', './public/data/'+req.body.experimentName+'/frames', function (err) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        fs.copySync(temporary+'/adjacencylist.json', './public/data/'+req.body.experimentName+'/adjacencylist.json')
                        fs.copySync(temporary+'/experiment.json', './public/data/'+req.body.experimentName+'/experiment.json')
                        var imageNames = fs.readdirSync('./public/data/'+req.body.experimentName+'/images/contrast1/');
                        var experiment = new Experiment({ 
                        	name: req.body.experimentName,
                            image: {
                                extension : imageNames[0].split(".")[1],
                                preview : '/data/'+req.body.experimentName+'/images/contrast1/' + 'frame000.'+imageNames[0].split(".")[1]
                            },
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

                        var tree = JSON.parse(fs.readFileSync(temporary+"/paths.json"));
                        var properties = JSON.parse(fs.readFileSync(temporary+"/pathsProperties.json"));

                        for(var id = 0; id < tree.paths.length; id++) {
                            var path = new Path({
                            	id : id,
                                experimentId : experiment._id,
                                cells : tree.paths[id].cells
                            });
                            path.save();

                            var property = new Property({
                         		path_id : path._id,
                                experiment_id : experiment._id,
                                length : properties.paths[id].length, 
                                edist : properties.paths[id].edist, 
                                adist : properties.paths[id].adist, 
                                msd : properties.paths[id].msd,
                                angle : properties.paths[id].angle, 
                                speed : properties.paths[id].speed,
                                meanspeed : properties.paths[id].meanspeed, 
                                directness : properties.paths[id].directness, 
                                fmi : properties.paths[id].fmi, 
                                displacement : properties.paths[id].displacement, 
                                flags : properties.paths[id].flags, 
                                coordinates : properties.paths[id].coordinates	
                            });
                            property.save(); 
                        }

                        fs.removeSync(temporary);
                        var size = Math.round(req.files.image.size / 1024 || 0);
                        delete(req.files)

	                    res.render('info', {
	                        experimentId: experiment._id,
	                        name: req.body.experimentName,
	                        size: size
	                    });
                    }
                });
            }
        });
    }
});

module.exports = router;