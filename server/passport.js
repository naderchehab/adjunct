
var LocalStrategy = require('passport-local').Strategy,
    LinkedInStrategy = require('passport-linkedin').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google').Strategy;

module.exports = function(db, passport, bcrypt, mongodb) {

    var ROOT_URL = "http://localhost:3000";
    switch(process.env.NODE_ENV) {
        case 'development':
            ROOT_URL = "http://adjuncts-dev.herokuapp.com";
            break;
        case 'production':
            ROOT_URL = "http://adjuncts.herokuapp.com";
            break;
    }

    passport.use(new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password'
        },
        function(email, password, done) {
            email = encodeURIComponent(email);
            db.getUser({'email': email}, function(err, user) {
                if (err)
                    return done(err, null);

                if (!user) {
                    return done(null, false, { message: 'Incorrect email.' });
                }

                bcrypt.compare(password, user.password, function(err, res) {
                    if (!res) {
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                    else {
                        return done(null, user);
                    }
                });
            });
        }
    ));

    passport.use(new LinkedInStrategy({
            consumerKey: 'mw29t6wc4cfa',
            consumerSecret: 'Chw82KgUKBgteXNh',
            callbackURL: ROOT_URL + '/auth/linkedin/callback'
        },
        function(accessToken, refreshToken, profile, done) {
            db.getUser({ 'linkedinId': profile.id }, function(err, user) {

                if (err) {
                    return done(err);
                }

                if (user) {
                    done(null, user);
                }
                else {
                    db.insertUser({'linkedinId': profile.id, 'firstName': profile.name.givenName, 'lastName': profile.name.familyName }, done);
                }
            });
        }
    ));

    passport.use(new FacebookStrategy({
            clientID: '573386006047842',
            clientSecret: 'dd82492ee233507c44937f3701d078b2',
            callbackURL: ROOT_URL + '/auth/facebook/callback'
        },
        function(accessToken, refreshToken, profile, done) {
            db.getUser({ 'facebookId': profile.id }, function(err, user) {
                if (err) {
                    return done(err);
                }

                if (user) {
                    done(null, user);
                }
                else {
                    db.insertUser({'facebookId': profile.id, 'firstName': profile.name.givenName, 'lastName': profile.name.familyName }, done);
                }
            });
        }
    ));

    passport.use(new GoogleStrategy({
        returnURL: ROOT_URL + '/auth/google/callback',
        realm: ROOT_URL
        },
        function(identifier, profile, done) {
            var googleId = encodeURIComponent(identifier);
            db.getUser({ 'googleId': googleId }, function(err, user) {
                if (err) {
                    return done(err);
                }
                if (user) {
                    done(null, user);
                }
                else {
                    db.insertUser({ 'googleId': googleId, 'firstName': profile.name.givenName, 'lastName': profile.name.familyName }, done);
                }
            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, {'_id': user._id});
    });

    passport.deserializeUser(function(user, done) {
        db.getUser({'_id': user._id}, function(err, u) {
            done(null, u);
        });
    });
}