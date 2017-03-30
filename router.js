var express = require('express');
var input = fs.createReadStream('points_test1.csv');
var rDv = [];
var parser = parse({delimiter: ';',from:2, auto_parse: true},function (err,node) {
    var trajetNode = []
    var wpts = '';   
    for (var i = 0; i < node.length; i++) {
        rDv.push(node[i][0])
        trajetNode.push({
            name:node[i][0],
            point:Math.PI * node[i][2]/180,
            coords:[node[i][2],node[i][1]]
        });
    }
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
    //console.log(rDv.length)
    //console.log(trajetNode)
    getRoute(startNode,endNode,wpts);
});
function getRoute(startNode,endNode,wpts) {
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
        console.log(trajet)
        
    });
}
module.exports = function () {
	var Router = express.Router;
	var router = new Router();
	router.route('/').get(function(req,res) {
		res.render('api', { title: 'Superhero API' });
	})

	return router;
}

/*
function distance(start, end) {
        //console.log(end)
    var radlat1 = Math.PI * start[2]/180
    var radlat2 = Math.PI * end[2]/180
    var theta = start[1]-end[1]
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    return dist
}
*/