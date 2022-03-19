const express = require('express');
const app = express();
//const port = process.env.PORT || 5000;
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');

var debug = require('debug')('shorethang:server');

var port = normalizePort(process.env.PORT || '5000');
app.set('port', port);

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/shorethang.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/shorethang.com/fullchain.pem')
};

var server = https.createServer(options, app);

app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const opentok = require('./services/opentok-api');

const {base_url} = require('./config');

/*
 * Routes
 */
app.get('/', (req, res) => {
  res.redirect('/viewer');
});

app.get('/viewer', async (req, res) => {
  opentok.getCredentials('viewer')
    .then(credentials => res.render('pages/viewer', { credentials: JSON.stringify(credentials), base_url : base_url }))
    .catch(error => res.status(500).send(error));
})

// app.get('/host', (req, res) => {
//   opentok.getCredentials('host')
//     .then(credentials => res.render('pages/host', { credentials: JSON.stringify(credentials), base_url : base_url }))
//     .catch(error => res.status(500).send(error));
// });

app.get('/guest', (req, res) => {
  opentok.getCredentials('guest')
    .then(credentials => res.render('pages/guest', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/broadcast', (req, res) => {
  const url = req.query.url;
  const availableAt = req.query.availableAt;
  res.render('pages/broadcast', { broadcast: JSON.stringify({ url, availableAt }) });
});

app.get('*', (req, res) => {
  res.redirect('/viewer');
});


app.post('/host', (req, res) => {

  //Fetch user-id of the creator who wants to host the streaming process
  let uid = parseInt( req.body.uid );
  
  opentok.getCredentials('host')
    .then(credentials => res.render('pages/host', { credentials: JSON.stringify(credentials), uid: uid, base_url: base_url }))
    .catch(error => res.status(500).send(error));

});

/*
 * API Endpoints
 */
app.post('/broadcast/start', (req, res) => {
  const { streams, rtmp } = req.body;
  opentok.startBroadcast(streams, rtmp)
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/layout', (req, res) => {
  const { streams, type } = req.body;
  opentok.updateLayout(streams, type)
    .then(data => res.status(200).send({}))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/classes', (req, res) => {
  const { classList } = req.body;
  opentok.updateStreamClassList(classList)
    .then(data => res.status(200).send({}))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/end', (req, res) => {
  opentok.stopBroadcast()
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

/*
 * Listen
 */
//app.listen(port, () => console.log(`app listening on port ${port}`));
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);


function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Listening on port : ', addr.port);
}