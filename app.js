var express = require('express');
var app = express();

app.configure('development', function () {

});
app.configure('production', function () {

});

var http = require('http'),
    path = require('path'),
    passport = require('passport'),
    ensureLoggedIn = require('./server/ensureLoggedIn.js'),
    bcrypt = require('bcrypt'),
    db = require('./server/db.js')(bcrypt),
    pass = require('./server/passport.js')(db, passport, bcrypt),
    countries = require('./server/api/countries.json'),
    fieldGroup = require('./server/api/fieldGroup.json');

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'server/views'));
app.set('partials', path.join(app.get('views'), 'partials'));
app.engine('html', require('ejs').renderFile);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());


/**
 * Routes
 */
app.get('/api/countries', function (req, res) {
    res.json(countries);
});

app.get('/api/fieldGroup', function (req, res) {
    res.json(fieldGroup);
});

app.get('/api/get-adjuncts-profile/:idType/:id', function(req, res){
    var idType = req.params.idType;
    var id = encodeURIComponent(req.params.id);

    if (!id || !idType)
        return res.send("ID and ID Type required");

    var user = {'id': id, 'idType': idType};

    db.getUser(user, function(err, user) {
        if (err) {
            return res.send(500, "Error retrieving user");
        }
        if (!user) {
            return res.json({});
        }
        delete user.password;
        return res.json(user);
    });
});

app.get('/partial/adjuncts-profile',
    ensureLoggedIn({ redirectTo: path.join(app.get('partials'), 'signin-popover.html'), customReturnTo: '/profile' }),
    function (req, res) {
        res.cookie('id', req.user.id);
        res.cookie('idType', req.user.idType);
        res.render(path.join(app.get('partials'), 'adjuncts-profile.html'));
    });

app.get('/partial/:name',
    function (req, res) {
        var name = req.params.name;
        res.render(path.join(app.get('partials'), name + '.html'));
    });

app.get('/signout', function (req, res) {
    req.logout();
    res.clearCookie('id', { path: '/' });
    res.clearCookie('idType', { path: '/' });
    res.redirect('/');
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/signin' })
);

app.get('/auth/linkedin', passport.authenticate('linkedin'));

app.get('/auth/linkedin/callback',
    passport.authenticate('linkedin', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/signin' })
);

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/signin' })
);

app.post('/signin-post',
    passport.authenticate('local', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/signin' })
);

app.post('/signup', function (req, res) {
    db.insertUser(req.body.user);
    res.end();
});

app.post('/basic-profile', function (req, res) {
    db.updateUser(req.body.user);
    res.end();
});

app.post('/save-adjuncts-profile', function(req, res){
    db.updateUser(req.body.user);
    res.end();
 });

app.get('*', function (req, res) {
    if (req.user) {
        res.cookie('id', req.user.id);
        res.cookie('idType', req.user.idType);
    }
    res.render(path.join(app.get('views'), 'index.html'));
});


/**
 * Start Server
 */
db.connect(function () {
    console.log('Connected to mongodb.');
    http.createServer(app).listen(app.get('port'), function () {
        console.log('Express server listening on port ' + app.get('port'));
    });
});
