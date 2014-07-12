var express = require('express'), // routes
	experiments = require('./routes/experiments'),
    upload = require('./routes/upload'),
    index = require('./routes/index'),
	multipart = require('connect-multiparty'); // upload

var app = express();
app.use(express.limit('500mb'));

app.configure(function () {

	app.set('view engine', 'jade');
	app.set('views', __dirname + '/views');

	app.use(express.json());
	app.use(express.urlencoded());
	app.use(multipart());
	
	app.use(express.logger('dev'));
	app.use(express.static(__dirname + '/public/'));
});

app.set('view cache', false);
// NOTE: You should always cache templates in a production environment.
// Don't leave both of these to `false` in production!

app.get('/', index.visit);
app.get('/dropAll', experiments.clearDatabase);
app.get('/experiments', experiments.showWorkspace);
app.get('/experiments/:id', experiments.findById);
app.get('/upload', upload.showForm);
app.get('/about', index.visit);
app.get('/path/:path/:experiment', experiments.getPath);

app.post('/path/filter', experiments.getMatchedPaths)
app.post('/upload', upload.uploadFile);

app.listen(3000);
console.log('Listening on port 3000...');
