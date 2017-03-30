var express = require('express')

module.exports = function () {
	var Router = express.Router;
	var router = new Router();
	var api = require('./index');
	router.route('/').get(api.optimalRoute);
	
	return router;
}