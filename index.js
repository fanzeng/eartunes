const http = require('http');
const fs = require('fs');
const path = require('path');     
const util = require('util');
const express = require('express');
const uuidv4 = require('uuid/v4');
const readFile = util.promisify(fs.readFile);

const port = process.env.PORT || 8081;

var app = express();
app.use(express.urlencoded({ extended: false }));
console.log(__dirname + '/public')
app.use(express.static(__dirname + '/public'));
app.get('/index.js', function (request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('Hello World\n');
})
// app.use('/public/vendor/', express.static(__dirname + '/../vendor'));

app.post('/index.js', function (request, response) {
  console.log(request.body);
});
const server = app.listen(port);

