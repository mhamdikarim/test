var angular = require('angular-last');
var ocLazyLoad = require('ocLazyLoad');
var modules = [require('angular-ui-router'),'oc.lazyLoad'];
var app = angular.module('app', modules);

/* VALUES */

app.value("map", {})
    .value("watchID", null)
;
app.config(function ($provide, $httpProvider,$locationProvider,$ocLazyLoadProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
  $ocLazyLoadProvider.config({
    debug:  false
  });
});

app.config(['$stateProvider','$urlRouterProvider',require('./configs').router]);
app.service('Socket', ['$state','$timeout',function ($state, $timeout) {
    // Connect to Socket.io server
    this.connect = function () {
    	this.socket = io();
    };
    this.connect();

    // Wrap the Socket.io 'on' method
    this.on = function (eventName, callback) {
      if (this.socket) {
        this.socket.on(eventName, function (data) {
          $timeout(function () {
            callback(data);
          });
        });
      }
    };

    // Wrap the Socket.io 'emit' method
    this.emit = function (eventName, data) {
      if (this.socket) {
        this.socket.emit(eventName, data);
      }
    };

    // Wrap the Socket.io 'removeListener' method
    this.removeListener = function (eventName) {
      if (this.socket) {
        this.socket.removeListener(eventName);
      }
    };
  }
]);
app.controller('HomeCtrl', ['$scope', 'watchID','Socket',require('./HomeCtrl.js')]);
angular.element(document).ready(function () {
  angular.bootstrap(document, ['app']);
});

