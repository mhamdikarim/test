var fs = require('fs'),
http = require('http'),
https = require('https'),
request = require('request'),
path = require('path'),
parse = require('csv-parse');
var cons = require("consolidate");
var express = require('express')
var app = express();

var swig = require('swig');
app.use('/', express.static(path.resolve('./public')));
// Set swig as the template engine
app.engine('html', cons.swig);
// Set views path and view engine
app.set('view engine', 'html');
app.set('views',__dirname + '/api/views');

app.use("/",function(req,res) {
    res.render('layout',{title:'salem'})
})
app.use("/api", require('./api/router.js')());
// all other requests redirect to 404
//app.all("*", function (req, res, next) {});
 
// Serve static assets
//app.use(express.static(path.join(__dirname, 'public')));
var server = http.createServer(app);

var socketio = require('socket.io'),
socketCookieParser = require('socket.io-cookie');

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
var fs = require('fs'),
request = require('request'),
parse = require('csv-parse');
var input = fs.createReadStream('points_test1.csv');

var rDv = [];
var trajetNode = [];
var wpts = ''; 

var parser = parse({delimiter: ';',from:2, auto_parse: true},function (err,node) {
    for (var i = 0; i < node.length; i++) {
        rDv.push(node[i][0])
        trajetNode.push({
            name:node[i][0],
            point:Math.PI * node[i][2]/180,
            coords:[node[i][2],node[i][1]]
        });
    }
    /*
    trajetNode.sort(function (a, b) {
        return a.point - b.point;
    });
    var start = trajetNode[0].coords;
    var startNode = start[0]+","+start[1];
    var end = trajetNode[trajetNode.length-1].coords;
    var endNode = end[0]+","+end[1]; 
    for (var i = 1; i < node.length -1 ; i++) {
        wpts += '|'+node[i][2]+","+node[i][1];
    }
    getRoute(startNode,endNode,wpts);
    */
});
input.pipe(parser)


io.on('connection', function (socket) {
	console.log('ok')
	socket.on('coord',function (coord) {
		console.log(coord)
		getOptimalRoute(coord,wpts,trajetNode)

	})
});
function getOptimalRoute(coord,wpts,trajetNode) {
	console.log(coord)
}
server.listen(8080,function() {
    // Logging initialization
    console.log('--');
});

function getRoute(startNode,endNode,wpts,cb) {
    var googleService = 'https://maps.googleapis.com/maps/api/directions/json?origin='+startNode+'&destination='+endNode+'&waypoints=optimize:true'+wpts+'&mode=driving&key=AIzaSyA2IVLj8SOSmwsadvlxv63iufBkz1bbntY';
    request(googleService, function (err,res) {
        if(err){
            console.log(err)
        }
        var route = JSON.parse(res.body).routes[0];
        var waypoints = route.waypoint_order;
        var legs = route.legs;
        console.log(legs[0].steps)
        console.log(legs[1].steps)

        console.log(waypoints)

    
        var steps = [];
        for (var i = 1; i < waypoints.length; i++) {
            steps.push({name:rDv[i],point:waypoints[i]+1});
        } 
        steps.unshift({name:rDv[0],point:0})
        steps.push({name:rDv[rDv.length-1],point:9})
        
        var trajet = steps.sort(function (a, b) {
          return a.point - b.point;
        });
        cb() 
    });
}
