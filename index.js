const http = require('http');
const express = require('express');

const port = process.env.PORT || 8081;

var app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.get('/index.js', function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('Success.\n');
})

app.post('/index.js', function (request, response) {
  console.log(request.body);
});
const server = app.listen(port);
