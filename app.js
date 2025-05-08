var express = require('express');
var fs = require('fs');
var ejs = require('ejs');
var https = require('https');
var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var { Secrets } = require('./apikeys');

var client_id = Secrets.client_id;
var client_secret = Secrets.client_secret;

var stateKey = 'spotify_auth_state';
//var redirect_uri = 'https://192.168.1.11:8888/callback';
//var redirect_uri = 'https://192.168.1.87:8888/callback';
var redirect_uri = 'https://10.12.0.254:8888/callback'

const randomString = (length) => {
    return crypto
    .randomBytes(60) 
    .toString('hex')
    .slice(0, length);
}

var app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/views')).use(cors()).use(cookieParser());
// root path of site. currently empty
app.get('/', (req, res) => {
   res.redirect('/login'); 
});

//||||||||||||||||| OAuth Logic ||||||||||||||||||||||||||||||
// initates a request process to spotify for an auth token
app.get('/login', (req, res) => {
    var state = randomString(16);
    res.cookie(stateKey, state);

    var scope = 'user-read-private user-read-email user-top-read playlist-read-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

// the uri spotify redirects to with the token
// adds token to the cookie jar
app.get('/callback', (req, res) => {
    console.log(res.statusCode);
    var code = req.query.code;
    var state = req.query.state;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
	res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
    } else {
	res.clearCookie(stateKey);
	var authOptions = {
	  url: 'https://accounts.spotify.com/api/token',
	  form: {
	    code: code,
	    redirect_uri: redirect_uri,
	    grant_type: 'authorization_code'
	  },
	  headers: {
	    'content-type': 'application/x-www-form-urlencoded',
	    'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
	  },
	  json: true
	};
	// post request that passes required data to spotify 
	// the response body contains the tokens
	request.post(authOptions, (err, response, body) => {
	    if (!err && response.statusCode === 200) {
		var access_token = body.access_token,
		refresh_token = body.refresh_token;
	
		// pass token to browser cookie jar
		res.cookie('access_token', access_token, {httpOnly: true, secure: true, maxAge: 600 * 1000});
		res.redirect('/dashboard');
		
	    }
	});
    }
});
//||||||||||||| End point funcitons to get data ||||||||||||||||
const profileData = async (token) => {
    const response = await fetch('https://api.spotify.com/v1/me', {
	method: 'GET',
	headers: {'Authorization': `Bearer ${token}`}
    });
    if (!response.ok) {
	const errorBody = await response.text();
	throw new Error(`spotify API Error: ${errorBody}`);
    }
    
    const data = await response.json();
    return data;
}

const topArtist = async (token) => {
    const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
	method: 'GET',
	headers: {'Authorization': `Bearer ${token}`}
    });
    if (!response.ok) {
	const errorBody = await response.text();
	throw new Error(`spotify API Error: ${errorBody}`);
    }
    const data = await response.json();
    return data;
}

const listPlaylist = async (token) => {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=5&offset=1', {
	method: 'GET',
	headers: {'Authorization': `Bearer ${token}`}
	});
    if (!response.ok) {
	const errorBody = await response.text();
	throw new Error(`spotify API Errpr: ${errorBody}`);
    }
    const data = await response.json();
    return data;
}

// enpoint that displays profile info
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.access_token;
    try {
	const profile = await profileData(token); 
	res.render('dashboard', profile);
    } catch (err) {
	res.send(`internal server error: ${err}`)
    }
});

app.get('/top', async (req, res) => {
    const token = req.cookies.access_token;
    try {
	const top = await topArtist(token);
	res.render('artist', top);
    } catch (err) {
	res.send(`internal server error: ${err}`);
    }
});

app.get('/playlists', async (req, res) => {
    const token = req.cookies.access_token;
    try {
	const playlists = await listPlaylist(token);
	res.render('playlists', playlists);
    } catch (err) {
	res.send(`internal server error: ${err}`);
    }
});

var certificates = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
};

https.createServer(certificates, app).listen(8888);
