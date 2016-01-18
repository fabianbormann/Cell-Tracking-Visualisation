var express = require('express');
var experiments = require('./routes/experiments.js');
var index = require('./routes/index.js');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('view cache', false);
// NOTE: You should always cache templates in a production environment.
// Don't leave view cache `false` in production!

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(__dirname + '/public/'));

app.use('/', index);
app.use('/experiments', experiments);

app.listen(3000);
console.log('Listening on port 3000...');
