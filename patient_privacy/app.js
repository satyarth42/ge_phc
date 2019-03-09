var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var mongoose = require('mongoose');
var passport = require('passport');
var expressSession = require('express-session');
var socket_io = require('socket.io');


var index = require('./routes/index');
var users = require('./routes/users');
var admin = require('./routes/dmnpnl');
var doctors = require('./routes/docroute');

var app = express();
var io = socket_io();
app.io = io;

mongoose.connect('mongodb://127.0.0.1:27017/ge_hackathon');
//mongoose.connect('mongodb://satyarth:satyarth_436@ds034797.mlab.com:34797/calamity_alert_system');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());
app.use(expressSession({
    secret: 'hY787897S2APCzSkjhgndFbsngMSd7dy',
    resave: true,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


app.use('/', index);
app.use('/users', users);
app.use('/admin',admin);
app.use('/doctor',doctors);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var onlineUsers = {};
io.on('connection',function(socket){

    socket.on('new_user',function(data){
        onlineUsers[data.username]=socket.id;
    });

    socket.on('send_request',function(data){
        let patient = data.patient;
        let doctor = data.doctor;
        let comments = data.comments;
    });

    socket.on('disconnect',function(data){
        delete onlineUsers[data.username];
    });
});

module.exports = app;
