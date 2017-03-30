function HomeCtrl($scope, watchID,Socket) {
	/* VARS */

    var last_lon = 0;
    var last_lat = 0;
    var watchID = {}; //geolocation object holder
    if (navigator.geolocation) {
        /* store geolocation in an object to */
        geoLoc = navigator.geolocation;

        var watchOptions = {
            maximumAge: 0,
            timeout: 10000,
            enableHighAccuracy: true
        };
        watchID = geoLoc.watchPosition(doWatch, watchError, watchOptions);
    } else {
        alert("Geolocation IS NOT available!");
    }

    /* geoLoc.watchPosition event handler */
    function doWatch(position) {
    	console.log(position)
        var lon = Number(Math.round(position.coords.longitude + 'e' + 4) + 'e-' + 4);
        var lat = Number(Math.round(position.coords.latitude + 'e' + 4) + 'e-' + 4);
        var coord = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "timestamp": position.timestamp
            }
        };
        // Make sure the Socket is connected
	    if (!Socket.socket) {
	      Socket.connect();
	    }
        console.log(coord)
        // Emit a message event
        Socket.emit('coord',coord);
    }

    /* geoLoc.watchPosition event error handler */
    function watchError(err) {
    	alert('Error' + err.code + ' msg: ' + err.message);
    }
};

module.exports = HomeCtrl;