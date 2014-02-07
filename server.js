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

	app.use(express.bodyParser());
	app.use(express.logger('dev'));
	app.use(express.static(__dirname + '/public/'));
});

app.set('view cache', false);
swig.setDefaults({ cache: false });
// NOTE: You should always cache templates in a production environment.
// Don't leave both of these to `false` in production!

app.get('/', about.showAbout);

app.get('/dropAll', experiments.clearDatabase);

app.get('/experiments', experiments.findAll);
app.get('/experiments/:id', experiments.findById);

app.get('/upload', upload.showForm);
app.post('/upload', experiments.uploadFile);

app.get('/about', about.showAbout);

app.listen(3000);
console.log('Listening on port 3000...');
