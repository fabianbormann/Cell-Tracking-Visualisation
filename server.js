var express = require('express'),
	swig = require('swig'),
	experiments = require('./routes/experiments'),
    upload = require('./routes/upload'),
    about = require('./routes/about');

var app = express();
app.use(express.limit('500mb'));

app.configure(function () {
	app.engine('html', swig.renderFile);
	app.set('view engine', 'html');
	app.set('views', __dirname + '/views');

	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.multipart());
	
	app.use(express.logger('dev'));
	app.use(express.static(__dirname + '/public/'));
});

app.set('view cache', false);
swig.setDefaults({ cache: false });
// NOTE: You should always cache templates in a production environment.
// Don't leave both of these to `false` in production!

app.get('/', about.showAbout);
app.get('/dropAll', experiments.clearDatabase);
app.get('/experiments', experiments.showAll);
app.get('/experiments/:id', experiments.findById);
app.get('/upload', upload.showForm);
app.get('/about', about.showAbout);

app.get('/path/:path/:experiment', experiments.getPath);
app.get('/path/filter/:option/:from/:to/:inculde/:experiment', experiments.getMatchedPaths)

app.post('/upload', experiments.uploadFile);

app.listen(3000);
console.log('Listening on port 3000...');
