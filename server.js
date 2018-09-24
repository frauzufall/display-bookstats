var httpPort = 8099;

log("--------------------- new session -----------------------");

//************************ HTTP INIT ************************//

var httpServer = require('http').createServer(handler);
httpServer.listen(httpPort);

// has the following structure: {"sslkwerh12", "asdflaij213", ..}
var http_clients = new Array();

var logjson = 0;
var logcontent = __dirname + '/data/logs.ndjson';
var logfiles = __dirname + '/data/logfiles.txt';

var aggregate = require('ndjson-aggregator')

function handler (request, response) {

    var filePath = '.' + request.url;
    if (filePath == './viewer')
        filePath = './index.html';

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    fs.exists(filePath, function(exists) {

        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    log("500 error");
                    log(error);
                    log(filePath);
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
}

//************************ WEB CLIENT STUFF ************************//

var fs = require('fs');
var path = require('path');

var ioParams = {'reconnection limit': 3000, 'max reconnection attempts': Number.MAX_VALUE, 'connect timeout':7000}
var io = require('socket.io')(httpServer, {pingTimeout: 3000});


var io_base = io.of('/viewer');
io_base.on('connection', function (socket) {

    socket.join(socket.id);

    //tell socket to initialize
    socket.emit('ready');

    log("new web client: " + socket.id);

    sendLogData(socket);

    socket.on('disconnect', function () {

        log("gone web client: " + socket.id);

    });

});

var io_upload = io.of('/upload');
io_upload.on('connection', function (socket) {

    socket.join(socket.id);

    //tell socket to initialize
    socket.emit('ready');

    log("new upload client: " + socket.id);

    socket.on('disconnect', function () {

        log("gone upload client: " + socket.id);

    });

    socket.on('data-image', function (data) {
        if(data.image){
            io_base.emit('image', {buffer: data.image.toString('base64')});
        }

    });

    socket.on('data-log', function (data) {
        data = JSON.parse(data);
        if(!fs.existsSync(logfiles)){
            fs.openSync(logfiles, 'w');
        }
        var buf = fs.readFileSync(logfiles, "utf8");
        if (buf.toString().indexOf(data.id)<0) {
            fs.appendFileSync(logfiles, data.id+"\n");
            fs.appendFile(logcontent, JSON.stringify(data.content)+"\n", function (err) {
                if (err) throw err;
                console.log('Saved ' + data.id);
                socket.emit("received", data.id);
                sendLogData(io_base);
            });
        }else{
            socket.emit("received", data.id);
        }
    });

});

function sendLogData(recipient){
    fs.readFile(logcontent, function(error, content) {
      if (error) log(error);
      if(content !== undefined) {
        var lines = content.toString().split("\n");
        //remove last empty line
        lines.pop();
        var logs = aggregate(lines);
        var logdata = {"log": logs};
        recipient.emit('log', JSON.stringify(logdata));
      }
    });
}

function log(text) {
    var n = (new Date()).toGMTString();
    console.log(n + ": " + text);
}
