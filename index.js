var fs = require('fs'),
http = require('http'),
request = require('request'),
path = require('path'),
parse = require('csv-parse');

var cons = require("consolidate"),
socketio = require('socket.io'),
socketCookieParser = require('socket.io-cookie'),
express = require('express');

var app = express();
app.use(express.static(path.resolve('./public')));
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views',__dirname + '/views');
app.use("/",function(req,res) {
    res.render('layout',{title:'salem'})
})

var server = http.createServer(app);
var io = socketio.listen(server);
//after this cookies are parsed
//io.use(socketCookieParser);
// Intercept Socket.io's handshake request
/*
io.use(function (socket, next) {
    var sessionId  = socket.request.headers.cookie.AuthSession;
    if (!sessionId) return next(new Error('sessionId was not found in socket.request'), false);
});
*/
var input = fs.createReadStream('points_test1.csv');
//var rDv = [];
var trajetNode = [];
var wpts = ''; 
var parser = parse({delimiter: ';',from:2, auto_parse: true},function (err,node) {
    for (var i = 0; i < node.length; i++) {
        //rDv.push(node[i][0])
        trajetNode.push({
            name:node[i][0],
            point:Math.PI * node[i][2]/180,
            coordinates:[node[i][1],node[i][2]]
        });
    }
    for (var i = 0; i < node.length -1 ; i++) {
        wpts += '|'+node[i][2]+","+node[i][1];
    }
});
input.pipe(parser)

io.on('connection', function (socket) {
	socket.on('coord',function (position) {
        var myPosition = position.geometry.coordinates;
        var startNode = myPosition[0]+","+myPosition[1];
        console.log(startNode)
        trajetNode.sort(function (a, b) {
            return a.point - b.point;
        });
        var end = trajetNode[trajetNode.length-1].coordinates;
        var endNode = end[0]+","+end[1];
        var googleService = 'https://maps.googleapis.com/maps/api/directions/json?origin='+startNode+'&destination='+endNode+'&waypoints=optimize:true'+wpts+'&mode=driving&key=AIzaSyA2IVLj8SOSmwsadvlxv63iufBkz1bbntY';
        console.log(googleService)
        request(googleService, function (err,res) {
            if(err){
                console.log(err)
            }
            var route = JSON.parse(res.body).routes[0];
            console.log(JSON.parse(res.body))
        });
    })
});
server.listen(8080,function() {
    console.log('--');
});
