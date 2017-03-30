(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * State-based routing for AngularJS
 * @version v0.4.2
 * @link http://angular-ui.github.com/
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

/* commonjs package manager support (eg componentjs) */
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'ui.router';
}

(function (window, angular, undefined) {
/*jshint globalstrict:true*/
/*global angular:false*/
'use strict';

var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy,
    toJson = angular.toJson;

function inherit(parent, extra) {
  return extend(new (extend(function() {}, { prototype: parent }))(), extra);
}

function merge(dst) {
  forEach(arguments, function(obj) {
    if (obj !== dst) {
      forEach(obj, function(value, key) {
        if (!dst.hasOwnProperty(key)) dst[key] = value;
      });
    }
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  var path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * IE8-safe wrapper for `Object.keys()`.
 *
 * @param {Object} object A JavaScript object.
 * @return {Array} Returns the keys of the object as an array.
 */
function objectKeys(object) {
  if (Object.keys) {
    return Object.keys(object);
  }
  var result = [];

  forEach(object, function(val, key) {
    result.push(key);
  });
  return result;
}

/**
 * IE8-safe wrapper for `Array.prototype.indexOf()`.
 *
 * @param {Array} array A JavaScript array.
 * @param {*} value A value to search the array for.
 * @return {Number} Returns the array index value of `value`, or `-1` if not present.
 */
function indexOf(array, value) {
  if (Array.prototype.indexOf) {
    return array.indexOf(value, Number(arguments[2]) || 0);
  }
  var len = array.length >>> 0, from = Number(arguments[2]) || 0;
  from = (from < 0) ? Math.ceil(from) : Math.floor(from);

  if (from < 0) from += len;

  for (; from < len; from++) {
    if (from in array && array[from] === value) return from;
  }
  return -1;
}

/**
 * Merges a set of parameters with all parameters inherited between the common parents of the
 * current state and a given destination state.
 *
 * @param {Object} currentParams The value of the current state parameters ($stateParams).
 * @param {Object} newParams The set of parameters which will be composited with inherited params.
 * @param {Object} $current Internal definition of object representing the current state.
 * @param {Object} $to Internal definition of object representing state to transition to.
 */
function inheritParams(currentParams, newParams, $current, $to) {
  var parents = ancestors($current, $to), parentParams, inherited = {}, inheritList = [];

  for (var i in parents) {
    if (!parents[i] || !parents[i].params) continue;
    parentParams = objectKeys(parents[i].params);
    if (!parentParams.length) continue;

    for (var j in parentParams) {
      if (indexOf(inheritList, parentParams[j]) >= 0) continue;
      inheritList.push(parentParams[j]);
      inherited[parentParams[j]] = currentParams[parentParams[j]];
    }
  }
  return extend({}, inherited, newParams);
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
function equalForKeys(a, b, keys) {
  if (!keys) {
    keys = [];
    for (var n in a) keys.push(n); // Used instead of Object.keys() for IE8 compatibility
  }

  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

/**
 * Returns the subset of an object, based on a list of keys.
 *
 * @param {Array} keys
 * @param {Object} values
 * @return {Boolean} Returns a subset of `values`.
 */
function filterByKeys(keys, values) {
  var filtered = {};

  forEach(keys, function (name) {
    filtered[name] = values[name];
  });
  return filtered;
}

// like _.indexBy
// when you know that your index values will be unique, or you want last-one-in to win
function indexBy(array, propName) {
  var result = {};
  forEach(array, function(item) {
    result[item[propName]] = item;
  });
  return result;
}

// extracted from underscore.js
// Return a copy of the object only containing the whitelisted properties.
function pick(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  forEach(keys, function(key) {
    if (key in obj) copy[key] = obj[key];
  });
  return copy;
}

// extracted from underscore.js
// Return a copy of the object omitting the blacklisted properties.
function omit(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  for (var key in obj) {
    if (indexOf(keys, key) == -1) copy[key] = obj[key];
  }
  return copy;
}

function pluck(collection, key) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = isFunction(key) ? key(val) : val[key];
  });
  return result;
}

function filter(collection, callback) {
  var array = isArray(collection);
  var result = array ? [] : {};
  forEach(collection, function(val, i) {
    if (callback(val, i)) {
      result[array ? result.length : i] = val;
    }
  });
  return result;
}

function map(collection, callback) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = callback(val, i);
  });
  return result;
}

// issue #2676 #2889
function silenceUncaughtInPromise (promise) {
  return promise.then(undefined, function() {}) && promise;
}

/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 * # ui.router.util sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 * 
 * @requires ui.router.util
 *
 * @description
 * # ui.router.router sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.state
 * 
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 * # ui.router.state sub-module
 *
 * This module is a dependency of the main ui.router module. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 * 
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 * # ui.router
 * 
 * ## The main module for ui.router 
 * There are several sub-modules included with the ui.router module, however only this module is needed
 * as a dependency within your angular app. The other modules are for organization purposes. 
 *
 * The modules are:
 * * ui.router - the main "umbrella" module
 * * ui.router.router - 
 * 
 * *You'll need to include **only** this module as the dependency within your angular app.*
 * 
 * <pre>
 * <!doctype html>
 * <html ng-app="myApp">
 * <head>
 *   <script src="js/angular.js"></script>
 *   <!-- Include the ui-router script -->
 *   <script src="js/angular-ui-router.min.js"></script>
 *   <script>
 *     // ...and add 'ui.router' as a dependency
 *     var myApp = angular.module('myApp', ['ui.router']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */
angular.module('ui.router', ['ui.router.state']);

angular.module('ui.router.compat', ['ui.router']);

/**
 * @ngdoc object
 * @name ui.router.util.$resolve
 *
 * @requires $q
 * @requires $injector
 *
 * @description
 * Manages resolution of (acyclic) graphs of promises.
 */
$Resolve.$inject = ['$q', '$injector'];
function $Resolve(  $q,    $injector) {
  
  var VISIT_IN_PROGRESS = 1,
      VISIT_DONE = 2,
      NOTHING = {},
      NO_DEPENDENCIES = [],
      NO_LOCALS = NOTHING,
      NO_PARENT = extend($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });
  

  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#study
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Studies a set of invocables that are likely to be used multiple times.
   * <pre>
   * $resolve.study(invocables)(locals, parent, self)
   * </pre>
   * is equivalent to
   * <pre>
   * $resolve.resolve(invocables, locals, parent, self)
   * </pre>
   * but the former is more efficient (in fact `resolve` just calls `study` 
   * internally).
   *
   * @param {object} invocables Invocable objects
   * @return {function} a function to pass in locals, parent and self
   */
  this.study = function (invocables) {
    if (!isObject(invocables)) throw new Error("'invocables' must be an object");
    var invocableKeys = objectKeys(invocables || {});
    
    // Perform a topological sort of invocables to build an ordered plan
    var plan = [], cycle = [], visited = {};
    function visit(value, key) {
      if (visited[key] === VISIT_DONE) return;
      
      cycle.push(key);
      if (visited[key] === VISIT_IN_PROGRESS) {
        cycle.splice(0, indexOf(cycle, key));
        throw new Error("Cyclic dependency: " + cycle.join(" -> "));
      }
      visited[key] = VISIT_IN_PROGRESS;
      
      if (isString(value)) {
        plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
      } else {
        var params = $injector.annotate(value);
        forEach(params, function (param) {
          if (param !== key && invocables.hasOwnProperty(param)) visit(invocables[param], param);
        });
        plan.push(key, value, params);
      }
      
      cycle.pop();
      visited[key] = VISIT_DONE;
    }
    forEach(invocables, visit);
    invocables = cycle = visited = null; // plan is all that's required
    
    function isResolve(value) {
      return isObject(value) && value.then && value.$$promises;
    }
    
    return function (locals, parent, self) {
      if (isResolve(locals) && self === undefined) {
        self = parent; parent = locals; locals = null;
      }
      if (!locals) locals = NO_LOCALS;
      else if (!isObject(locals)) {
        throw new Error("'locals' must be an object");
      }       
      if (!parent) parent = NO_PARENT;
      else if (!isResolve(parent)) {
        throw new Error("'parent' must be a promise returned by $resolve.resolve()");
      }
      
      // To complete the overall resolution, we have to wait for the parent
      // promise and for the promise for each invokable in our plan.
      var resolution = $q.defer(),
          result = silenceUncaughtInPromise(resolution.promise),
          promises = result.$$promises = {},
          values = extend({}, locals),
          wait = 1 + plan.length/3,
          merged = false;

      silenceUncaughtInPromise(result);
          
      function done() {
        // Merge parent values we haven't got yet and publish our own $$values
        if (!--wait) {
          if (!merged) merge(values, parent.$$values); 
          result.$$values = values;
          result.$$promises = result.$$promises || true; // keep for isResolve()
          delete result.$$inheritedValues;
          resolution.resolve(values);
        }
      }
      
      function fail(reason) {
        result.$$failure = reason;
        resolution.reject(reason);
      }

      // Short-circuit if parent has already failed
      if (isDefined(parent.$$failure)) {
        fail(parent.$$failure);
        return result;
      }
      
      if (parent.$$inheritedValues) {
        merge(values, omit(parent.$$inheritedValues, invocableKeys));
      }

      // Merge parent values if the parent has already resolved, or merge
      // parent promises and wait if the parent resolve is still in progress.
      extend(promises, parent.$$promises);
      if (parent.$$values) {
        merged = merge(values, omit(parent.$$values, invocableKeys));
        result.$$inheritedValues = omit(parent.$$values, invocableKeys);
        done();
      } else {
        if (parent.$$inheritedValues) {
          result.$$inheritedValues = omit(parent.$$inheritedValues, invocableKeys);
        }        
        parent.then(done, fail);
      }
      
      // Process each invocable in the plan, but ignore any where a local of the same name exists.
      for (var i=0, ii=plan.length; i<ii; i+=3) {
        if (locals.hasOwnProperty(plan[i])) done();
        else invoke(plan[i], plan[i+1], plan[i+2]);
      }
      
      function invoke(key, invocable, params) {
        // Create a deferred for this invocation. Failures will propagate to the resolution as well.
        var invocation = $q.defer(), waitParams = 0;
        function onfailure(reason) {
          invocation.reject(reason);
          fail(reason);
        }
        // Wait for any parameter that we have a promise for (either from parent or from this
        // resolve; in that case study() will have made sure it's ordered before us in the plan).
        forEach(params, function (dep) {
          if (promises.hasOwnProperty(dep) && !locals.hasOwnProperty(dep)) {
            waitParams++;
            promises[dep].then(function (result) {
              values[dep] = result;
              if (!(--waitParams)) proceed();
            }, onfailure);
          }
        });
        if (!waitParams) proceed();
        function proceed() {
          if (isDefined(result.$$failure)) return;
          try {
            invocation.resolve($injector.invoke(invocable, self, values));
            invocation.promise.then(function (result) {
              values[key] = result;
              done();
            }, onfailure);
          } catch (e) {
            onfailure(e);
          }
        }
        // Publish promise synchronously; invocations further down in the plan may depend on it.
        promises[key] = silenceUncaughtInPromise(invocation.promise);
      }
      
      return result;
    };
  };
  
  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#resolve
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Resolves a set of invocables. An invocable is a function to be invoked via 
   * `$injector.invoke()`, and can have an arbitrary number of dependencies. 
   * An invocable can either return a value directly,
   * or a `$q` promise. If a promise is returned it will be resolved and the 
   * resulting value will be used instead. Dependencies of invocables are resolved 
   * (in this order of precedence)
   *
   * - from the specified `locals`
   * - from another invocable that is part of this `$resolve` call
   * - from an invocable that is inherited from a `parent` call to `$resolve` 
   *   (or recursively
   * - from any ancestor `$resolve` of that parent).
   *
   * The return value of `$resolve` is a promise for an object that contains 
   * (in this order of precedence)
   *
   * - any `locals` (if specified)
   * - the resolved return values of all injectables
   * - any values inherited from a `parent` call to `$resolve` (if specified)
   *
   * The promise will resolve after the `parent` promise (if any) and all promises 
   * returned by injectables have been resolved. If any invocable 
   * (or `$injector.invoke`) throws an exception, or if a promise returned by an 
   * invocable is rejected, the `$resolve` promise is immediately rejected with the 
   * same error. A rejection of a `parent` promise (if specified) will likewise be 
   * propagated immediately. Once the `$resolve` promise has been rejected, no 
   * further invocables will be called.
   * 
   * Cyclic dependencies between invocables are not permitted and will cause `$resolve`
   * to throw an error. As a special case, an injectable can depend on a parameter 
   * with the same name as the injectable, which will be fulfilled from the `parent` 
   * injectable of the same name. This allows inherited values to be decorated. 
   * Note that in this case any other injectable in the same `$resolve` with the same
   * dependency would see the decorated value, not the inherited value.
   *
   * Note that missing dependencies -- unlike cyclic dependencies -- will cause an 
   * (asynchronous) rejection of the `$resolve` promise rather than a (synchronous) 
   * exception.
   *
   * Invocables are invoked eagerly as soon as all dependencies are available. 
   * This is true even for dependencies inherited from a `parent` call to `$resolve`.
   *
   * As a special case, an invocable can be a string, in which case it is taken to 
   * be a service name to be passed to `$injector.get()`. This is supported primarily 
   * for backwards-compatibility with the `resolve` property of `$routeProvider` 
   * routes.
   *
   * @param {object} invocables functions to invoke or 
   * `$injector` services to fetch.
   * @param {object} locals  values to make available to the injectables
   * @param {object} parent  a promise returned by another call to `$resolve`.
   * @param {object} self  the `this` for the invoked methods
   * @return {object} Promise for an object that contains the resolved return value
   * of all invocables, as well as any inherited and local values.
   */
  this.resolve = function (invocables, locals, parent, self) {
    return this.study(invocables)(locals, parent, self);
  };
}

angular.module('ui.router.util').service('$resolve', $Resolve);



/**
 * @ngdoc object
 * @name ui.router.util.$templateFactoryProvider
 *
 * @description
 * Provider for $templateFactory. Manages which template-loading mechanism to
 * use, and will default to the most recent one ($templateRequest on Angular
 * versions starting from 1.3, $http otherwise).
 */
function TemplateFactoryProvider() {
  var shouldUnsafelyUseHttp = angular.version.minor < 3;

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactoryProvider#shouldUnsafelyUseHttp
   * @methodOf ui.router.util.$templateFactoryProvider
   *
   * @description
   * Forces $templateFactory to use $http instead of $templateRequest. This
   * might cause XSS, as $http doesn't enforce the regular security checks for
   * templates that have been introduced in Angular 1.3. Note that setting this
   * to false on Angular older than 1.3.x will crash, as the $templateRequest
   * service (and the security checks) are not implemented on these versions.
   *
   * See the $sce documentation, section
   * <a href="https://docs.angularjs.org/api/ng/service/$sce#impact-on-loading-templates">
   * Impact on loading templates</a> for more details about this mechanism.
   *
   * @param {boolean} value
   */
  this.shouldUnsafelyUseHttp = function(value) {
    shouldUnsafelyUseHttp = !!value;
  };

  /**
   * @ngdoc object
   * @name ui.router.util.$templateFactory
   *
   * @requires $http
   * @requires $templateCache
   * @requires $injector
   *
   * @description
   * Service. Manages loading of templates.
   */
  this.$get = ['$http', '$templateCache', '$injector', function($http, $templateCache, $injector){
    return new TemplateFactory($http, $templateCache, $injector, shouldUnsafelyUseHttp);}];
}


/**
 * @ngdoc object
 * @name ui.router.util.$templateFactory
 *
 * @requires $http
 * @requires $templateCache
 * @requires $injector
 *
 * @description
 * Service. Manages loading of templates.
 */
function TemplateFactory($http, $templateCache, $injector, shouldUnsafelyUseHttp) {

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromConfig
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a configuration object. 
   *
   * @param {object} config Configuration object for which to load a template. 
   * The following properties are search in the specified order, and the first one 
   * that is defined is used to create the template:
   *
   * @param {string|object} config.template html string template or function to 
   * load via {@link ui.router.util.$templateFactory#fromString fromString}.
   * @param {string|object} config.templateUrl url to load or a function returning 
   * the url to load via {@link ui.router.util.$templateFactory#fromUrl fromUrl}.
   * @param {Function} config.templateProvider function to invoke via 
   * {@link ui.router.util.$templateFactory#fromProvider fromProvider}.
   * @param {object} params  Parameters to pass to the template function.
   * @param {object} locals Locals to pass to `invoke` if the template is loaded 
   * via a `templateProvider`. Defaults to `{ params: params }`.
   *
   * @return {string|object}  The template html as a string, or a promise for 
   * that string,or `null` if no template is configured.
   */
  this.fromConfig = function (config, params, locals) {
    return (
      isDefined(config.template) ? this.fromString(config.template, params) :
      isDefined(config.templateUrl) ? this.fromUrl(config.templateUrl, params) :
      isDefined(config.templateProvider) ? this.fromProvider(config.templateProvider, params, locals) :
      null
    );
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromString
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a string or a function returning a string.
   *
   * @param {string|object} template html template as a string or function that 
   * returns an html template as a string.
   * @param {object} params Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that 
   * string.
   */
  this.fromString = function (template, params) {
    return isFunction(template) ? template(params) : template;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   * 
   * @description
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function 
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromUrl = function (url, params) {
    if (isFunction(url)) url = url(params);
    if (url == null) return null;
    else {
      if(!shouldUnsafelyUseHttp) {
        return $injector.get('$templateRequest')(url);
      } else {
        return $http
          .get(url, { cache: $templateCache, headers: { Accept: 'text/html' }})
          .then(function(response) { return response.data; });
      }
    }
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromProvider
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template by invoking an injectable provider function.
   *
   * @param {Function} provider Function to invoke via `$injector.invoke`
   * @param {Object} params Parameters for the template.
   * @param {Object} locals Locals to pass to `invoke`. Defaults to 
   * `{ params: params }`.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromProvider = function (provider, params, locals) {
    return $injector.invoke(provider, null, locals || { params: params });
  };
}

angular.module('ui.router.util').provider('$templateFactory', TemplateFactoryProvider);

var $$UMFP; // reference to $UrlMatcherFactoryProvider

/**
 * @ngdoc object
 * @name ui.router.util.type:UrlMatcher
 *
 * @description
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL. A URL pattern consists of a path pattern, optionally followed by '?' and a list
 * of search parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by {@link ui.router.util.type:UrlMatcher#methods_exec exec}.
 *
 * Path parameter placeholders can be specified using simple colon/catch-all syntax or curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * * `':'` name - colon placeholder
 * * `'*'` name - catch-all placeholder
 * * `'{' name '}'` - curly placeholder
 * * `'{' name ':' regexp|type '}'` - curly placeholder with regexp or type name. Should the
 *   regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon
 * placeholders or curly placeholders without an explicit regexp, a path parameter matches any
 * number of characters other than '/'. For catch-all placeholders the path parameter matches
 * any number of characters.
 *
 * Examples:
 *
 * * `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * `'/user/:id'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * `'/user/{id}'` - Same as the previous example, but using curly brace syntax.
 * * `'/user/{id:[^/]*}'` - Same as the previous example.
 * * `'/user/{id:[0-9a-fA-F]{1,8}}'` - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * `'/files/*path'` - ditto.
 * * `'/calendar/{start:date}'` - Matches "/calendar/2014-11-12" (because the pattern defined
 *   in the built-in  `date` Type matches `2014-11-12`) and provides a Date object in $stateParams.start
 *
 * @param {string} pattern  The pattern to compile into a matcher.
 * @param {Object} config  A configuration object hash:
 * @param {Object=} parentMatcher Used to concatenate the pattern/config onto
 *   an existing UrlMatcher
 *
 * * `caseInsensitive` - `true` if URL matching should be case insensitive, otherwise `false`, the default value (for backward compatibility) is `false`.
 * * `strict` - `false` if matching against a URL with a trailing slash should be treated as equivalent to a URL without a trailing slash, the default value is `true`.
 *
 * @property {string} prefix  A static prefix of this pattern. The matcher guarantees that any
 *   URL matching this matcher (i.e. any string for which {@link ui.router.util.type:UrlMatcher#methods_exec exec()} returns
 *   non-null) will start with this prefix.
 *
 * @property {string} source  The pattern that was passed into the constructor
 *
 * @property {string} sourcePath  The path portion of the source property
 *
 * @property {string} sourceSearch  The search portion of the source property
 *
 * @property {string} regex  The constructed regex that will be used to match against the url when
 *   it is time to determine which url will match.
 *
 * @returns {Object}  New `UrlMatcher` object
 */
function UrlMatcher(pattern, config, parentMatcher) {
  config = extend({ params: {} }, isObject(config) ? config : {});

  // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
  //   '*' name
  //   ':' name
  //   '{' name '}'
  //   '{' name ':' regexp '}'
  // The regular expression is somewhat complicated due to the need to allow curly braces
  // inside the regular expression. The placeholder regexp breaks down as follows:
  //    ([:*])([\w\[\]]+)              - classic placeholder ($1 / $2) (search version has - for snake-case)
  //    \{([\w\[\]]+)(?:\:\s*( ... ))?\}  - curly brace placeholder ($3) with optional regexp/type ... ($4) (search version has - for snake-case
  //    (?: ... | ... | ... )+         - the regexp consists of any number of atoms, an atom being either
  //    [^{}\\]+                       - anything other than curly braces or backslash
  //    \\.                            - a backslash escape
  //    \{(?:[^{}\\]+|\\.)*\}          - a matched set of curly braces containing other atoms
  var placeholder       = /([:*])([\w\[\]]+)|\{([\w\[\]]+)(?:\:\s*((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      searchPlaceholder = /([:]?)([\w\[\].-]+)|\{([\w\[\].-]+)(?:\:\s*((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      compiled = '^', last = 0, m,
      segments = this.segments = [],
      parentParams = parentMatcher ? parentMatcher.params : {},
      params = this.params = parentMatcher ? parentMatcher.params.$$new() : new $$UMFP.ParamSet(),
      paramNames = [];

  function addParameter(id, type, config, location) {
    paramNames.push(id);
    if (parentParams[id]) return parentParams[id];
    if (!/^\w+([-.]+\w+)*(?:\[\])?$/.test(id)) throw new Error("Invalid parameter name '" + id + "' in pattern '" + pattern + "'");
    if (params[id]) throw new Error("Duplicate parameter name '" + id + "' in pattern '" + pattern + "'");
    params[id] = new $$UMFP.Param(id, type, config, location);
    return params[id];
  }

  function quoteRegExp(string, pattern, squash, optional) {
    var surroundPattern = ['',''], result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
    if (!pattern) return result;
    switch(squash) {
      case false: surroundPattern = ['(', ')' + (optional ? "?" : "")]; break;
      case true:
        result = result.replace(/\/$/, '');
        surroundPattern = ['(?:\/(', ')|\/)?'];
      break;
      default:    surroundPattern = ['(' + squash + "|", ')?']; break;
    }
    return result + surroundPattern[0] + pattern + surroundPattern[1];
  }

  this.source = pattern;

  // Split into static segments separated by path parameter placeholders.
  // The number of segments is always 1 more than the number of parameters.
  function matchDetails(m, isSearch) {
    var id, regexp, segment, type, cfg, arrayMode;
    id          = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
    cfg         = config.params[id];
    segment     = pattern.substring(last, m.index);
    regexp      = isSearch ? m[4] : m[4] || (m[1] == '*' ? '.*' : null);

    if (regexp) {
      type      = $$UMFP.type(regexp) || inherit($$UMFP.type("string"), { pattern: new RegExp(regexp, config.caseInsensitive ? 'i' : undefined) });
    }

    return {
      id: id, regexp: regexp, segment: segment, type: type, cfg: cfg
    };
  }

  var p, param, segment;
  while ((m = placeholder.exec(pattern))) {
    p = matchDetails(m, false);
    if (p.segment.indexOf('?') >= 0) break; // we're into the search part

    param = addParameter(p.id, p.type, p.cfg, "path");
    compiled += quoteRegExp(p.segment, param.type.pattern.source, param.squash, param.isOptional);
    segments.push(p.segment);
    last = placeholder.lastIndex;
  }
  segment = pattern.substring(last);

  // Find any search parameter names and remove them from the last segment
  var i = segment.indexOf('?');

  if (i >= 0) {
    var search = this.sourceSearch = segment.substring(i);
    segment = segment.substring(0, i);
    this.sourcePath = pattern.substring(0, last + i);

    if (search.length > 0) {
      last = 0;
      while ((m = searchPlaceholder.exec(search))) {
        p = matchDetails(m, true);
        param = addParameter(p.id, p.type, p.cfg, "search");
        last = placeholder.lastIndex;
        // check if ?&
      }
    }
  } else {
    this.sourcePath = pattern;
    this.sourceSearch = '';
  }

  compiled += quoteRegExp(segment) + (config.strict === false ? '\/?' : '') + '$';
  segments.push(segment);

  this.regexp = new RegExp(compiled, config.caseInsensitive ? 'i' : undefined);
  this.prefix = segments[0];
  this.$$paramNames = paramNames;
}

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#concat
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns a new matcher for a pattern constructed by appending the path part and adding the
 * search parameters of the specified pattern to this pattern. The current pattern is not
 * modified. This can be understood as creating a pattern for URLs that are relative to (or
 * suffixes of) the current pattern.
 *
 * @example
 * The following two matchers are equivalent:
 * <pre>
 * new UrlMatcher('/user/{id}?q').concat('/details?date');
 * new UrlMatcher('/user/{id}/details?q&date');
 * </pre>
 *
 * @param {string} pattern  The pattern to append.
 * @param {Object} config  An object hash of the configuration for the matcher.
 * @returns {UrlMatcher}  A matcher for the concatenated pattern.
 */
UrlMatcher.prototype.concat = function (pattern, config) {
  // Because order of search parameters is irrelevant, we can add our own search
  // parameters to the end of the new pattern. Parse the new pattern by itself
  // and then join the bits together, but it's much easier to do this on a string level.
  var defaultConfig = {
    caseInsensitive: $$UMFP.caseInsensitive(),
    strict: $$UMFP.strictMode(),
    squash: $$UMFP.defaultSquashPolicy()
  };
  return new UrlMatcher(this.sourcePath + pattern + this.sourceSearch, extend(defaultConfig, config), this);
};

UrlMatcher.prototype.toString = function () {
  return this.source;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#exec
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Tests the specified path against this matcher, and returns an object containing the captured
 * parameter values, or null if the path does not match. The returned object contains the values
 * of any search parameters that are mentioned in the pattern, but their value may be null if
 * they are not present in `searchParams`. This means that search parameters are always treated
 * as optional.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', {
 *   x: '1', q: 'hello'
 * });
 * // returns { id: 'bob', q: 'hello', r: null }
 * </pre>
 *
 * @param {string} path  The URL path to match, e.g. `$location.path()`.
 * @param {Object} searchParams  URL search parameters, e.g. `$location.search()`.
 * @returns {Object}  The captured parameter values.
 */
UrlMatcher.prototype.exec = function (path, searchParams) {
  var m = this.regexp.exec(path);
  if (!m) return null;
  searchParams = searchParams || {};

  var paramNames = this.parameters(), nTotal = paramNames.length,
    nPath = this.segments.length - 1,
    values = {}, i, j, cfg, paramName;

  if (nPath !== m.length - 1) throw new Error("Unbalanced capture group in route '" + this.source + "'");

  function decodePathArray(string) {
    function reverseString(str) { return str.split("").reverse().join(""); }
    function unquoteDashes(str) { return str.replace(/\\-/g, "-"); }

    var split = reverseString(string).split(/-(?!\\)/);
    var allReversed = map(split, reverseString);
    return map(allReversed, unquoteDashes).reverse();
  }

  var param, paramVal;
  for (i = 0; i < nPath; i++) {
    paramName = paramNames[i];
    param = this.params[paramName];
    paramVal = m[i+1];
    // if the param value matches a pre-replace pair, replace the value before decoding.
    for (j = 0; j < param.replace.length; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (paramVal && param.array === true) paramVal = decodePathArray(paramVal);
    if (isDefined(paramVal)) paramVal = param.type.decode(paramVal);
    values[paramName] = param.value(paramVal);
  }
  for (/**/; i < nTotal; i++) {
    paramName = paramNames[i];
    values[paramName] = this.params[paramName].value(searchParams[paramName]);
    param = this.params[paramName];
    paramVal = searchParams[paramName];
    for (j = 0; j < param.replace.length; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (isDefined(paramVal)) paramVal = param.type.decode(paramVal);
    values[paramName] = param.value(paramVal);
  }

  return values;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#parameters
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns the names of all path and search parameters of this pattern in an unspecified order.
 *
 * @returns {Array.<string>}  An array of parameter names. Must be treated as read-only. If the
 *    pattern has no parameters, an empty array is returned.
 */
UrlMatcher.prototype.parameters = function (param) {
  if (!isDefined(param)) return this.$$paramNames;
  return this.params[param] || null;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#validates
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Checks an object hash of parameters to validate their correctness according to the parameter
 * types of this `UrlMatcher`.
 *
 * @param {Object} params The object hash of parameters to validate.
 * @returns {boolean} Returns `true` if `params` validates, otherwise `false`.
 */
UrlMatcher.prototype.validates = function (params) {
  return this.params.$$validates(params);
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#format
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Creates a URL that matches this pattern by substituting the specified values
 * for the path and search parameters. Null values for path parameters are
 * treated as empty strings.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
 * // returns '/user/bob?q=yes'
 * </pre>
 *
 * @param {Object} values  the values to substitute for the parameters in this pattern.
 * @returns {string}  the formatted URL (path and optionally search part).
 */
UrlMatcher.prototype.format = function (values) {
  values = values || {};
  var segments = this.segments, params = this.parameters(), paramset = this.params;
  if (!this.validates(values)) return null;

  var i, search = false, nPath = segments.length - 1, nTotal = params.length, result = segments[0];

  function encodeDashes(str) { // Replace dashes with encoded "\-"
    return encodeURIComponent(str).replace(/-/g, function(c) { return '%5C%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }

  for (i = 0; i < nTotal; i++) {
    var isPathParam = i < nPath;
    var name = params[i], param = paramset[name], value = param.value(values[name]);
    var isDefaultValue = param.isOptional && param.type.equals(param.value(), value);
    var squash = isDefaultValue ? param.squash : false;
    var encoded = param.type.encode(value);

    if (isPathParam) {
      var nextSegment = segments[i + 1];
      var isFinalPathParam = i + 1 === nPath;

      if (squash === false) {
        if (encoded != null) {
          if (isArray(encoded)) {
            result += map(encoded, encodeDashes).join("-");
          } else {
            result += encodeURIComponent(encoded);
          }
        }
        result += nextSegment;
      } else if (squash === true) {
        var capture = result.match(/\/$/) ? /\/?(.*)/ : /(.*)/;
        result += nextSegment.match(capture)[1];
      } else if (isString(squash)) {
        result += squash + nextSegment;
      }

      if (isFinalPathParam && param.squash === true && result.slice(-1) === '/') result = result.slice(0, -1);
    } else {
      if (encoded == null || (isDefaultValue && squash !== false)) continue;
      if (!isArray(encoded)) encoded = [ encoded ];
      if (encoded.length === 0) continue;
      encoded = map(encoded, encodeURIComponent).join('&' + name + '=');
      result += (search ? '&' : '?') + (name + '=' + encoded);
      search = true;
    }
  }

  return result;
};

/**
 * @ngdoc object
 * @name ui.router.util.type:Type
 *
 * @description
 * Implements an interface to define custom parameter types that can be decoded from and encoded to
 * string parameters matched in a URL. Used by {@link ui.router.util.type:UrlMatcher `UrlMatcher`}
 * objects when matching or formatting URLs, or comparing or validating parameter values.
 *
 * See {@link ui.router.util.$urlMatcherFactory#methods_type `$urlMatcherFactory#type()`} for more
 * information on registering custom types.
 *
 * @param {Object} config  A configuration object which contains the custom type definition.  The object's
 *        properties will override the default methods and/or pattern in `Type`'s public interface.
 * @example
 * <pre>
 * {
 *   decode: function(val) { return parseInt(val, 10); },
 *   encode: function(val) { return val && val.toString(); },
 *   equals: function(a, b) { return this.is(a) && a === b; },
 *   is: function(val) { return angular.isNumber(val) isFinite(val) && val % 1 === 0; },
 *   pattern: /\d+/
 * }
 * </pre>
 *
 * @property {RegExp} pattern The regular expression pattern used to match values of this type when
 *           coming from a substring of a URL.
 *
 * @returns {Object}  Returns a new `Type` object.
 */
function Type(config) {
  extend(this, config);
}

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#is
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Detects whether a value is of a particular type. Accepts a native (decoded) value
 * and determines whether it matches the current `Type` object.
 *
 * @param {*} val  The value to check.
 * @param {string} key  Optional. If the type check is happening in the context of a specific
 *        {@link ui.router.util.type:UrlMatcher `UrlMatcher`} object, this is the name of the
 *        parameter in which `val` is stored. Can be used for meta-programming of `Type` objects.
 * @returns {Boolean}  Returns `true` if the value matches the type, otherwise `false`.
 */
Type.prototype.is = function(val, key) {
  return true;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#encode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Encodes a custom/native type value to a string that can be embedded in a URL. Note that the
 * return value does *not* need to be URL-safe (i.e. passed through `encodeURIComponent()`), it
 * only needs to be a representation of `val` that has been coerced to a string.
 *
 * @param {*} val  The value to encode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {string}  Returns a string representation of `val` that can be encoded in a URL.
 */
Type.prototype.encode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#decode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Converts a parameter value (from URL string or transition param) to a custom/native value.
 *
 * @param {string} val  The URL parameter value to decode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {*}  Returns a custom representation of the URL parameter value.
 */
Type.prototype.decode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#equals
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Determines whether two decoded values are equivalent.
 *
 * @param {*} a  A value to compare against.
 * @param {*} b  A value to compare against.
 * @returns {Boolean}  Returns `true` if the values are equivalent/equal, otherwise `false`.
 */
Type.prototype.equals = function(a, b) {
  return a == b;
};

Type.prototype.$subPattern = function() {
  var sub = this.pattern.toString();
  return sub.substr(1, sub.length - 2);
};

Type.prototype.pattern = /.*/;

Type.prototype.toString = function() { return "{Type:" + this.name + "}"; };

/** Given an encoded string, or a decoded object, returns a decoded object */
Type.prototype.$normalize = function(val) {
  return this.is(val) ? val : this.decode(val);
};

/*
 * Wraps an existing custom Type as an array of Type, depending on 'mode'.
 * e.g.:
 * - urlmatcher pattern "/path?{queryParam[]:int}"
 * - url: "/path?queryParam=1&queryParam=2
 * - $stateParams.queryParam will be [1, 2]
 * if `mode` is "auto", then
 * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
 * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
 */
Type.prototype.$asArray = function(mode, isSearch) {
  if (!mode) return this;
  if (mode === "auto" && !isSearch) throw new Error("'auto' array mode is for query parameters only");

  function ArrayType(type, mode) {
    function bindTo(type, callbackName) {
      return function() {
        return type[callbackName].apply(type, arguments);
      };
    }

    // Wrap non-array value as array
    function arrayWrap(val) { return isArray(val) ? val : (isDefined(val) ? [ val ] : []); }
    // Unwrap array value for "auto" mode. Return undefined for empty array.
    function arrayUnwrap(val) {
      switch(val.length) {
        case 0: return undefined;
        case 1: return mode === "auto" ? val[0] : val;
        default: return val;
      }
    }
    function falsey(val) { return !val; }

    // Wraps type (.is/.encode/.decode) functions to operate on each value of an array
    function arrayHandler(callback, allTruthyMode) {
      return function handleArray(val) {
        if (isArray(val) && val.length === 0) return val;
        val = arrayWrap(val);
        var result = map(val, callback);
        if (allTruthyMode === true)
          return filter(result, falsey).length === 0;
        return arrayUnwrap(result);
      };
    }

    // Wraps type (.equals) functions to operate on each value of an array
    function arrayEqualsHandler(callback) {
      return function handleArray(val1, val2) {
        var left = arrayWrap(val1), right = arrayWrap(val2);
        if (left.length !== right.length) return false;
        for (var i = 0; i < left.length; i++) {
          if (!callback(left[i], right[i])) return false;
        }
        return true;
      };
    }

    this.encode = arrayHandler(bindTo(type, 'encode'));
    this.decode = arrayHandler(bindTo(type, 'decode'));
    this.is     = arrayHandler(bindTo(type, 'is'), true);
    this.equals = arrayEqualsHandler(bindTo(type, 'equals'));
    this.pattern = type.pattern;
    this.$normalize = arrayHandler(bindTo(type, '$normalize'));
    this.name = type.name;
    this.$arrayMode = mode;
  }

  return new ArrayType(this, mode);
};



/**
 * @ngdoc object
 * @name ui.router.util.$urlMatcherFactory
 *
 * @description
 * Factory for {@link ui.router.util.type:UrlMatcher `UrlMatcher`} instances. The factory
 * is also available to providers under the name `$urlMatcherFactoryProvider`.
 */
function $UrlMatcherFactory() {
  $$UMFP = this;

  var isCaseInsensitive = false, isStrictMode = true, defaultSquashPolicy = false;

  // Use tildes to pre-encode slashes.
  // If the slashes are simply URLEncoded, the browser can choose to pre-decode them,
  // and bidirectional encoding/decoding fails.
  // Tilde was chosen because it's not a RFC 3986 section 2.2 Reserved Character
  function valToString(val) { return val != null ? val.toString().replace(/(~|\/)/g, function (m) { return {'~':'~~', '/':'~2F'}[m]; }) : val; }
  function valFromString(val) { return val != null ? val.toString().replace(/(~~|~2F)/g, function (m) { return {'~~':'~', '~2F':'/'}[m]; }) : val; }

  var $types = {}, enqueue = true, typeQueue = [], injector, defaultTypes = {
    "string": {
      encode: valToString,
      decode: valFromString,
      // TODO: in 1.0, make string .is() return false if value is undefined/null by default.
      // In 0.2.x, string params are optional by default for backwards compat
      is: function(val) { return val == null || !isDefined(val) || typeof val === "string"; },
      pattern: /[^/]*/
    },
    "int": {
      encode: valToString,
      decode: function(val) { return parseInt(val, 10); },
      is: function(val) { return val !== undefined && val !== null && this.decode(val.toString()) === val; },
      pattern: /\d+/
    },
    "bool": {
      encode: function(val) { return val ? 1 : 0; },
      decode: function(val) { return parseInt(val, 10) !== 0; },
      is: function(val) { return val === true || val === false; },
      pattern: /0|1/
    },
    "date": {
      encode: function (val) {
        if (!this.is(val))
          return undefined;
        return [ val.getFullYear(),
          ('0' + (val.getMonth() + 1)).slice(-2),
          ('0' + val.getDate()).slice(-2)
        ].join("-");
      },
      decode: function (val) {
        if (this.is(val)) return val;
        var match = this.capture.exec(val);
        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: function(val) { return val instanceof Date && !isNaN(val.valueOf()); },
      equals: function (a, b) { return this.is(a) && this.is(b) && a.toISOString() === b.toISOString(); },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/
    },
    "json": {
      encode: angular.toJson,
      decode: angular.fromJson,
      is: angular.isObject,
      equals: angular.equals,
      pattern: /[^/]*/
    },
    "any": { // does not encode/decode
      encode: angular.identity,
      decode: angular.identity,
      equals: angular.equals,
      pattern: /.*/
    }
  };

  function getDefaultConfig() {
    return {
      strict: isStrictMode,
      caseInsensitive: isCaseInsensitive
    };
  }

  function isInjectable(value) {
    return (isFunction(value) || (isArray(value) && isFunction(value[value.length - 1])));
  }

  /**
   * [Internal] Get the default value of a parameter, which may be an injectable function.
   */
  $UrlMatcherFactory.$$getDefaultValue = function(config) {
    if (!isInjectable(config.value)) return config.value;
    if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
    return injector.invoke(config.value);
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#caseInsensitive
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URL matching should be case sensitive (the default behavior), or not.
   *
   * @param {boolean} value `false` to match URL in a case sensitive manner; otherwise `true`;
   * @returns {boolean} the current value of caseInsensitive
   */
  this.caseInsensitive = function(value) {
    if (isDefined(value))
      isCaseInsensitive = value;
    return isCaseInsensitive;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#strictMode
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URLs should match trailing slashes, or not (the default behavior).
   *
   * @param {boolean=} value `false` to match trailing slashes in URLs, otherwise `true`.
   * @returns {boolean} the current value of strictMode
   */
  this.strictMode = function(value) {
    if (isDefined(value))
      isStrictMode = value;
    return isStrictMode;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#defaultSquashPolicy
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Sets the default behavior when generating or matching URLs with default parameter values.
   *
   * @param {string} value A string that defines the default parameter URL squashing behavior.
   *    `nosquash`: When generating an href with a default parameter value, do not squash the parameter value from the URL
   *    `slash`: When generating an href with a default parameter value, squash (remove) the parameter value, and, if the
   *             parameter is surrounded by slashes, squash (remove) one slash from the URL
   *    any other string, e.g. "~": When generating an href with a default parameter value, squash (remove)
   *             the parameter value from the URL and replace it with this string.
   */
  this.defaultSquashPolicy = function(value) {
    if (!isDefined(value)) return defaultSquashPolicy;
    if (value !== true && value !== false && !isString(value))
      throw new Error("Invalid squash policy: " + value + ". Valid policies: false, true, arbitrary-string");
    defaultSquashPolicy = value;
    return value;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#compile
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Creates a {@link ui.router.util.type:UrlMatcher `UrlMatcher`} for the specified pattern.
   *
   * @param {string} pattern  The URL pattern.
   * @param {Object} config  The config object hash.
   * @returns {UrlMatcher}  The UrlMatcher.
   */
  this.compile = function (pattern, config) {
    return new UrlMatcher(pattern, extend(getDefaultConfig(), config));
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#isMatcher
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Returns true if the specified object is a `UrlMatcher`, or false otherwise.
   *
   * @param {Object} object  The object to perform the type check against.
   * @returns {Boolean}  Returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  this.isMatcher = function (o) {
    if (!isObject(o)) return false;
    var result = true;

    forEach(UrlMatcher.prototype, function(val, name) {
      if (isFunction(val)) {
        result = result && (isDefined(o[name]) && isFunction(o[name]));
      }
    });
    return result;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#type
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Registers a custom {@link ui.router.util.type:Type `Type`} object that can be used to
   * generate URLs with typed parameters.
   *
   * @param {string} name  The type name.
   * @param {Object|Function} definition   The type definition. See
   *        {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   * @param {Object|Function} definitionFn (optional) A function that is injected before the app
   *        runtime starts.  The result of this function is merged into the existing `definition`.
   *        See {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   *
   * @returns {Object}  Returns `$urlMatcherFactoryProvider`.
   *
   * @example
   * This is a simple example of a custom type that encodes and decodes items from an
   * array, using the array index as the URL-encoded value:
   *
   * <pre>
   * var list = ['John', 'Paul', 'George', 'Ringo'];
   *
   * $urlMatcherFactoryProvider.type('listItem', {
   *   encode: function(item) {
   *     // Represent the list item in the URL using its corresponding index
   *     return list.indexOf(item);
   *   },
   *   decode: function(item) {
   *     // Look up the list item by index
   *     return list[parseInt(item, 10)];
   *   },
   *   is: function(item) {
   *     // Ensure the item is valid by checking to see that it appears
   *     // in the list
   *     return list.indexOf(item) > -1;
   *   }
   * });
   *
   * $stateProvider.state('list', {
   *   url: "/list/{item:listItem}",
   *   controller: function($scope, $stateParams) {
   *     console.log($stateParams.item);
   *   }
   * });
   *
   * // ...
   *
   * // Changes URL to '/list/3', logs "Ringo" to the console
   * $state.go('list', { item: "Ringo" });
   * </pre>
   *
   * This is a more complex example of a type that relies on dependency injection to
   * interact with services, and uses the parameter name from the URL to infer how to
   * handle encoding and decoding parameter values:
   *
   * <pre>
   * // Defines a custom type that gets a value from a service,
   * // where each service gets different types of values from
   * // a backend API:
   * $urlMatcherFactoryProvider.type('dbObject', {}, function(Users, Posts) {
   *
   *   // Matches up services to URL parameter names
   *   var services = {
   *     user: Users,
   *     post: Posts
   *   };
   *
   *   return {
   *     encode: function(object) {
   *       // Represent the object in the URL using its unique ID
   *       return object.id;
   *     },
   *     decode: function(value, key) {
   *       // Look up the object by ID, using the parameter
   *       // name (key) to call the correct service
   *       return services[key].findById(value);
   *     },
   *     is: function(object, key) {
   *       // Check that object is a valid dbObject
   *       return angular.isObject(object) && object.id && services[key];
   *     }
   *     equals: function(a, b) {
   *       // Check the equality of decoded objects by comparing
   *       // their unique IDs
   *       return a.id === b.id;
   *     }
   *   };
   * });
   *
   * // In a config() block, you can then attach URLs with
   * // type-annotated parameters:
   * $stateProvider.state('users', {
   *   url: "/users",
   *   // ...
   * }).state('users.item', {
   *   url: "/{user:dbObject}",
   *   controller: function($scope, $stateParams) {
   *     // $stateParams.user will now be an object returned from
   *     // the Users service
   *   },
   *   // ...
   * });
   * </pre>
   */
  this.type = function (name, definition, definitionFn) {
    if (!isDefined(definition)) return $types[name];
    if ($types.hasOwnProperty(name)) throw new Error("A type named '" + name + "' has already been defined.");

    $types[name] = new Type(extend({ name: name }, definition));
    if (definitionFn) {
      typeQueue.push({ name: name, def: definitionFn });
      if (!enqueue) flushTypeQueue();
    }
    return this;
  };

  // `flushTypeQueue()` waits until `$urlMatcherFactory` is injected before invoking the queued `definitionFn`s
  function flushTypeQueue() {
    while(typeQueue.length) {
      var type = typeQueue.shift();
      if (type.pattern) throw new Error("You cannot override a type's .pattern at runtime.");
      angular.extend($types[type.name], injector.invoke(type.def));
    }
  }

  // Register default types. Store them in the prototype of $types.
  forEach(defaultTypes, function(type, name) { $types[name] = new Type(extend({name: name}, type)); });
  $types = inherit($types, {});

  /* No need to document $get, since it returns this */
  this.$get = ['$injector', function ($injector) {
    injector = $injector;
    enqueue = false;
    flushTypeQueue();

    forEach(defaultTypes, function(type, name) {
      if (!$types[name]) $types[name] = new Type(type);
    });
    return this;
  }];

  this.Param = function Param(id, type, config, location) {
    var self = this;
    config = unwrapShorthand(config);
    type = getType(config, type, location);
    var arrayMode = getArrayMode();
    type = arrayMode ? type.$asArray(arrayMode, location === "search") : type;
    if (type.name === "string" && !arrayMode && location === "path" && config.value === undefined)
      config.value = ""; // for 0.2.x; in 0.3.0+ do not automatically default to ""
    var isOptional = config.value !== undefined;
    var squash = getSquashPolicy(config, isOptional);
    var replace = getReplace(config, arrayMode, isOptional, squash);

    function unwrapShorthand(config) {
      var keys = isObject(config) ? objectKeys(config) : [];
      var isShorthand = indexOf(keys, "value") === -1 && indexOf(keys, "type") === -1 &&
                        indexOf(keys, "squash") === -1 && indexOf(keys, "array") === -1;
      if (isShorthand) config = { value: config };
      config.$$fn = isInjectable(config.value) ? config.value : function () { return config.value; };
      return config;
    }

    function getType(config, urlType, location) {
      if (config.type && urlType) throw new Error("Param '"+id+"' has two type configurations.");
      if (urlType) return urlType;
      if (!config.type) return (location === "config" ? $types.any : $types.string);

      if (angular.isString(config.type))
        return $types[config.type];
      if (config.type instanceof Type)
        return config.type;
      return new Type(config.type);
    }

    // array config: param name (param[]) overrides default settings.  explicit config overrides param name.
    function getArrayMode() {
      var arrayDefaults = { array: (location === "search" ? "auto" : false) };
      var arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};
      return extend(arrayDefaults, arrayParamNomenclature, config).array;
    }

    /**
     * returns false, true, or the squash value to indicate the "default parameter url squash policy".
     */
    function getSquashPolicy(config, isOptional) {
      var squash = config.squash;
      if (!isOptional || squash === false) return false;
      if (!isDefined(squash) || squash == null) return defaultSquashPolicy;
      if (squash === true || isString(squash)) return squash;
      throw new Error("Invalid squash policy: '" + squash + "'. Valid policies: false, true, or arbitrary string");
    }

    function getReplace(config, arrayMode, isOptional, squash) {
      var replace, configuredKeys, defaultPolicy = [
        { from: "",   to: (isOptional || arrayMode ? undefined : "") },
        { from: null, to: (isOptional || arrayMode ? undefined : "") }
      ];
      replace = isArray(config.replace) ? config.replace : [];
      if (isString(squash))
        replace.push({ from: squash, to: undefined });
      configuredKeys = map(replace, function(item) { return item.from; } );
      return filter(defaultPolicy, function(item) { return indexOf(configuredKeys, item.from) === -1; }).concat(replace);
    }

    /**
     * [Internal] Get the default value of a parameter, which may be an injectable function.
     */
    function $$getDefaultValue() {
      if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
      var defaultValue = injector.invoke(config.$$fn);
      if (defaultValue !== null && defaultValue !== undefined && !self.type.is(defaultValue))
        throw new Error("Default value (" + defaultValue + ") for parameter '" + self.id + "' is not an instance of Type (" + self.type.name + ")");
      return defaultValue;
    }

    /**
     * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
     * default value, which may be the result of an injectable function.
     */
    function $value(value) {
      function hasReplaceVal(val) { return function(obj) { return obj.from === val; }; }
      function $replace(value) {
        var replacement = map(filter(self.replace, hasReplaceVal(value)), function(obj) { return obj.to; });
        return replacement.length ? replacement[0] : value;
      }
      value = $replace(value);
      return !isDefined(value) ? $$getDefaultValue() : self.type.$normalize(value);
    }

    function toString() { return "{Param:" + id + " " + type + " squash: '" + squash + "' optional: " + isOptional + "}"; }

    extend(this, {
      id: id,
      type: type,
      location: location,
      array: arrayMode,
      squash: squash,
      replace: replace,
      isOptional: isOptional,
      value: $value,
      dynamic: undefined,
      config: config,
      toString: toString
    });
  };

  function ParamSet(params) {
    extend(this, params || {});
  }

  ParamSet.prototype = {
    $$new: function() {
      return inherit(this, extend(new ParamSet(), { $$parent: this}));
    },
    $$keys: function () {
      var keys = [], chain = [], parent = this,
        ignore = objectKeys(ParamSet.prototype);
      while (parent) { chain.push(parent); parent = parent.$$parent; }
      chain.reverse();
      forEach(chain, function(paramset) {
        forEach(objectKeys(paramset), function(key) {
            if (indexOf(keys, key) === -1 && indexOf(ignore, key) === -1) keys.push(key);
        });
      });
      return keys;
    },
    $$values: function(paramValues) {
      var values = {}, self = this;
      forEach(self.$$keys(), function(key) {
        values[key] = self[key].value(paramValues && paramValues[key]);
      });
      return values;
    },
    $$equals: function(paramValues1, paramValues2) {
      var equal = true, self = this;
      forEach(self.$$keys(), function(key) {
        var left = paramValues1 && paramValues1[key], right = paramValues2 && paramValues2[key];
        if (!self[key].type.equals(left, right)) equal = false;
      });
      return equal;
    },
    $$validates: function $$validate(paramValues) {
      var keys = this.$$keys(), i, param, rawVal, normalized, encoded;
      for (i = 0; i < keys.length; i++) {
        param = this[keys[i]];
        rawVal = paramValues[keys[i]];
        if ((rawVal === undefined || rawVal === null) && param.isOptional)
          break; // There was no parameter value, but the param is optional
        normalized = param.type.$normalize(rawVal);
        if (!param.type.is(normalized))
          return false; // The value was not of the correct Type, and could not be decoded to the correct Type
        encoded = param.type.encode(normalized);
        if (angular.isString(encoded) && !param.type.pattern.exec(encoded))
          return false; // The value was of the correct type, but when encoded, did not match the Type's regexp
      }
      return true;
    },
    $$parent: undefined
  };

  this.ParamSet = ParamSet;
}

// Register as a provider so it's available to other providers
angular.module('ui.router.util').provider('$urlMatcherFactory', $UrlMatcherFactory);
angular.module('ui.router.util').run(['$urlMatcherFactory', function($urlMatcherFactory) { }]);

/**
 * @ngdoc object
 * @name ui.router.router.$urlRouterProvider
 *
 * @requires ui.router.util.$urlMatcherFactoryProvider
 * @requires $locationProvider
 *
 * @description
 * `$urlRouterProvider` has the responsibility of watching `$location`. 
 * When `$location` changes it runs through a list of rules one by one until a 
 * match is found. `$urlRouterProvider` is used behind the scenes anytime you specify 
 * a url in a state configuration. All urls are compiled into a UrlMatcher object.
 *
 * There are several methods on `$urlRouterProvider` that make it useful to use directly
 * in your module config.
 */
$UrlRouterProvider.$inject = ['$locationProvider', '$urlMatcherFactoryProvider'];
function $UrlRouterProvider(   $locationProvider,   $urlMatcherFactory) {
  var rules = [], otherwise = null, interceptDeferred = false, listener;

  // Returns a string that is a prefix of all strings matching the RegExp
  function regExpPrefix(re) {
    var prefix = /^\^((?:\\[^a-zA-Z0-9]|[^\\\[\]\^$*+?.()|{}]+)*)/.exec(re.source);
    return (prefix != null) ? prefix[1].replace(/\\(.)/g, "$1") : '';
  }

  // Interpolates matched values into a String.replace()-style pattern
  function interpolate(pattern, match) {
    return pattern.replace(/\$(\$|\d{1,2})/, function (m, what) {
      return match[what === '$' ? 0 : Number(what)];
    });
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#rule
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines rules that are used by `$urlRouterProvider` to find matches for
   * specific URLs.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // Here's an example of how you might allow case insensitive urls
   *   $urlRouterProvider.rule(function ($injector, $location) {
   *     var path = $location.path(),
   *         normalized = path.toLowerCase();
   *
   *     if (path !== normalized) {
   *       return normalized;
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {function} rule Handler function that takes `$injector` and `$location`
   * services as arguments. You can use them to return a valid path as a string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.rule = function (rule) {
    if (!isFunction(rule)) throw new Error("'rule' must be a function");
    rules.push(rule);
    return this;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouterProvider#otherwise
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines a path that is used when an invalid route is requested.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // if the path doesn't match any of the urls you configured
   *   // otherwise will take care of routing the user to the
   *   // specified url
   *   $urlRouterProvider.otherwise('/index');
   *
   *   // Example of using function rule as param
   *   $urlRouterProvider.otherwise(function ($injector, $location) {
   *     return '/a/valid/url';
   *   });
   * });
   * </pre>
   *
   * @param {string|function} rule The url path you want to redirect to or a function 
   * rule that returns the url path. The function version is passed two params: 
   * `$injector` and `$location` services, and must return a url string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.otherwise = function (rule) {
    if (isString(rule)) {
      var redirect = rule;
      rule = function () { return redirect; };
    }
    else if (!isFunction(rule)) throw new Error("'rule' must be a function");
    otherwise = rule;
    return this;
  };


  function handleIfMatch($injector, handler, match) {
    if (!match) return false;
    var result = $injector.invoke(handler, handler, { $match: match });
    return isDefined(result) ? result : true;
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#when
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Registers a handler for a given url matching. 
   * 
   * If the handler is a string, it is
   * treated as a redirect, and is interpolated according to the syntax of match
   * (i.e. like `String.replace()` for `RegExp`, or like a `UrlMatcher` pattern otherwise).
   *
   * If the handler is a function, it is injectable. It gets invoked if `$location`
   * matches. You have the option of inject the match object as `$match`.
   *
   * The handler can return
   *
   * - **falsy** to indicate that the rule didn't match after all, then `$urlRouter`
   *   will continue trying to find another one that matches.
   * - **string** which is treated as a redirect and passed to `$location.url()`
   * - **void** or any **truthy** value tells `$urlRouter` that the url was handled.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   $urlRouterProvider.when($state.url, function ($match, $stateParams) {
   *     if ($state.$current.navigable !== state ||
   *         !equalForKeys($match, $stateParams) {
   *      $state.transitionTo(state, $match, false);
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {string|object} what The incoming path that you want to redirect.
   * @param {string|function} handler The path you want to redirect your user to.
   */
  this.when = function (what, handler) {
    var redirect, handlerIsString = isString(handler);
    if (isString(what)) what = $urlMatcherFactory.compile(what);

    if (!handlerIsString && !isFunction(handler) && !isArray(handler))
      throw new Error("invalid 'handler' in when()");

    var strategies = {
      matcher: function (what, handler) {
        if (handlerIsString) {
          redirect = $urlMatcherFactory.compile(handler);
          handler = ['$match', function ($match) { return redirect.format($match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path(), $location.search()));
        }, {
          prefix: isString(what.prefix) ? what.prefix : ''
        });
      },
      regex: function (what, handler) {
        if (what.global || what.sticky) throw new Error("when() RegExp must not be global or sticky");

        if (handlerIsString) {
          redirect = handler;
          handler = ['$match', function ($match) { return interpolate(redirect, $match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path()));
        }, {
          prefix: regExpPrefix(what)
        });
      }
    };

    var check = { matcher: $urlMatcherFactory.isMatcher(what), regex: what instanceof RegExp };

    for (var n in check) {
      if (check[n]) return this.rule(strategies[n](what, handler));
    }

    throw new Error("invalid 'what' in when()");
  };

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#deferIntercept
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Disables (or enables) deferring location change interception.
   *
   * If you wish to customize the behavior of syncing the URL (for example, if you wish to
   * defer a transition but maintain the current URL), call this method at configuration time.
   * Then, at run time, call `$urlRouter.listen()` after you have configured your own
   * `$locationChangeSuccess` event handler.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *
   *   // Prevent $urlRouter from automatically intercepting URL changes;
   *   // this allows you to configure custom behavior in between
   *   // location changes and route synchronization:
   *   $urlRouterProvider.deferIntercept();
   *
   * }).run(function ($rootScope, $urlRouter, UserService) {
   *
   *   $rootScope.$on('$locationChangeSuccess', function(e) {
   *     // UserService is an example service for managing user state
   *     if (UserService.isLoggedIn()) return;
   *
   *     // Prevent $urlRouter's default handler from firing
   *     e.preventDefault();
   *
   *     UserService.handleLogin().then(function() {
   *       // Once the user has logged in, sync the current URL
   *       // to the router:
   *       $urlRouter.sync();
   *     });
   *   });
   *
   *   // Configures $urlRouter's listener *after* your custom listener
   *   $urlRouter.listen();
   * });
   * </pre>
   *
   * @param {boolean} defer Indicates whether to defer location change interception. Passing
            no parameter is equivalent to `true`.
   */
  this.deferIntercept = function (defer) {
    if (defer === undefined) defer = true;
    interceptDeferred = defer;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouter
   *
   * @requires $location
   * @requires $rootScope
   * @requires $injector
   * @requires $browser
   *
   * @description
   *
   */
  this.$get = $get;
  $get.$inject = ['$location', '$rootScope', '$injector', '$browser', '$sniffer'];
  function $get(   $location,   $rootScope,   $injector,   $browser,   $sniffer) {

    var baseHref = $browser.baseHref(), location = $location.url(), lastPushedUrl;

    function appendBasePath(url, isHtml5, absolute) {
      if (baseHref === '/') return url;
      if (isHtml5) return baseHref.slice(0, -1) + url;
      if (absolute) return baseHref.slice(1) + url;
      return url;
    }

    // TODO: Optimize groups of rules with non-empty prefix into some sort of decision tree
    function update(evt) {
      if (evt && evt.defaultPrevented) return;
      var ignoreUpdate = lastPushedUrl && $location.url() === lastPushedUrl;
      lastPushedUrl = undefined;
      // TODO: Re-implement this in 1.0 for https://github.com/angular-ui/ui-router/issues/1573
      //if (ignoreUpdate) return true;

      function check(rule) {
        var handled = rule($injector, $location);

        if (!handled) return false;
        if (isString(handled)) $location.replace().url(handled);
        return true;
      }
      var n = rules.length, i;

      for (i = 0; i < n; i++) {
        if (check(rules[i])) return;
      }
      // always check otherwise last to allow dynamic updates to the set of rules
      if (otherwise) check(otherwise);
    }

    function listen() {
      listener = listener || $rootScope.$on('$locationChangeSuccess', update);
      return listener;
    }

    if (!interceptDeferred) listen();

    return {
      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#sync
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * Triggers an update; the same update that happens when the address bar url changes, aka `$locationChangeSuccess`.
       * This method is useful when you need to use `preventDefault()` on the `$locationChangeSuccess` event,
       * perform some custom logic (route protection, auth, config, redirection, etc) and then finally proceed
       * with the transition by calling `$urlRouter.sync()`.
       *
       * @example
       * <pre>
       * angular.module('app', ['ui.router'])
       *   .run(function($rootScope, $urlRouter) {
       *     $rootScope.$on('$locationChangeSuccess', function(evt) {
       *       // Halt state change from even starting
       *       evt.preventDefault();
       *       // Perform custom logic
       *       var meetsRequirement = ...
       *       // Continue with the update and state transition if logic allows
       *       if (meetsRequirement) $urlRouter.sync();
       *     });
       * });
       * </pre>
       */
      sync: function() {
        update();
      },

      listen: function() {
        return listen();
      },

      update: function(read) {
        if (read) {
          location = $location.url();
          return;
        }
        if ($location.url() === location) return;

        $location.url(location);
        $location.replace();
      },

      push: function(urlMatcher, params, options) {
         var url = urlMatcher.format(params || {});

        // Handle the special hash param, if needed
        if (url !== null && params && params['#']) {
            url += '#' + params['#'];
        }

        $location.url(url);
        lastPushedUrl = options && options.$$avoidResync ? $location.url() : undefined;
        if (options && options.replace) $location.replace();
      },

      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#href
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * A URL generation method that returns the compiled URL for a given
       * {@link ui.router.util.type:UrlMatcher `UrlMatcher`}, populated with the provided parameters.
       *
       * @example
       * <pre>
       * $bob = $urlRouter.href(new UrlMatcher("/about/:person"), {
       *   person: "bob"
       * });
       * // $bob == "/about/bob";
       * </pre>
       *
       * @param {UrlMatcher} urlMatcher The `UrlMatcher` object which is used as the template of the URL to generate.
       * @param {object=} params An object of parameter values to fill the matcher's required parameters.
       * @param {object=} options Options object. The options are:
       *
       * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
       *
       * @returns {string} Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
       */
      href: function(urlMatcher, params, options) {
        if (!urlMatcher.validates(params)) return null;

        var isHtml5 = $locationProvider.html5Mode();
        if (angular.isObject(isHtml5)) {
          isHtml5 = isHtml5.enabled;
        }

        isHtml5 = isHtml5 && $sniffer.history;
        
        var url = urlMatcher.format(params);
        options = options || {};

        if (!isHtml5 && url !== null) {
          url = "#" + $locationProvider.hashPrefix() + url;
        }

        // Handle special hash param, if needed
        if (url !== null && params && params['#']) {
          url += '#' + params['#'];
        }

        url = appendBasePath(url, isHtml5, options.absolute);

        if (!options.absolute || !url) {
          return url;
        }

        var slash = (!isHtml5 && url ? '/' : ''), port = $location.port();
        port = (port === 80 || port === 443 ? '' : ':' + port);

        return [$location.protocol(), '://', $location.host(), port, slash, url].join('');
      }
    };
  }
}

angular.module('ui.router.router').provider('$urlRouter', $UrlRouterProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$stateProvider
 *
 * @requires ui.router.router.$urlRouterProvider
 * @requires ui.router.util.$urlMatcherFactoryProvider
 *
 * @description
 * The new `$stateProvider` works similar to Angular's v1 router, but it focuses purely
 * on state.
 *
 * A state corresponds to a "place" in the application in terms of the overall UI and
 * navigation. A state describes (via the controller / template / view properties) what
 * the UI looks like and does at that place.
 *
 * States often have things in common, and the primary way of factoring out these
 * commonalities in this model is via the state hierarchy, i.e. parent/child states aka
 * nested states.
 *
 * The `$stateProvider` provides interfaces to declare these states for your app.
 */
$StateProvider.$inject = ['$urlRouterProvider', '$urlMatcherFactoryProvider'];
function $StateProvider(   $urlRouterProvider,   $urlMatcherFactory) {

  var root, states = {}, $state, queue = {}, abstractKey = 'abstract';

  // Builds state properties from definition passed to registerState()
  var stateBuilder = {

    // Derive parent state from a hierarchical name only if 'parent' is not explicitly defined.
    // state.children = [];
    // if (parent) parent.children.push(state);
    parent: function(state) {
      if (isDefined(state.parent) && state.parent) return findState(state.parent);
      // regex matches any valid composite state name
      // would match "contact.list" but not "contacts"
      var compositeName = /^(.+)\.[^.]+$/.exec(state.name);
      return compositeName ? findState(compositeName[1]) : root;
    },

    // inherit 'data' from parent and override by own values (if any)
    data: function(state) {
      if (state.parent && state.parent.data) {
        state.data = state.self.data = inherit(state.parent.data, state.data);
      }
      return state.data;
    },

    // Build a URLMatcher if necessary, either via a relative or absolute URL
    url: function(state) {
      var url = state.url, config = { params: state.params || {} };

      if (isString(url)) {
        if (url.charAt(0) == '^') return $urlMatcherFactory.compile(url.substring(1), config);
        return (state.parent.navigable || root).url.concat(url, config);
      }

      if (!url || $urlMatcherFactory.isMatcher(url)) return url;
      throw new Error("Invalid url '" + url + "' in state '" + state + "'");
    },

    // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
    navigable: function(state) {
      return state.url ? state : (state.parent ? state.parent.navigable : null);
    },

    // Own parameters for this state. state.url.params is already built at this point. Create and add non-url params
    ownParams: function(state) {
      var params = state.url && state.url.params || new $$UMFP.ParamSet();
      forEach(state.params || {}, function(config, id) {
        if (!params[id]) params[id] = new $$UMFP.Param(id, null, config, "config");
      });
      return params;
    },

    // Derive parameters for this state and ensure they're a super-set of parent's parameters
    params: function(state) {
      var ownParams = pick(state.ownParams, state.ownParams.$$keys());
      return state.parent && state.parent.params ? extend(state.parent.params.$$new(), ownParams) : new $$UMFP.ParamSet();
    },

    // If there is no explicit multi-view configuration, make one up so we don't have
    // to handle both cases in the view directive later. Note that having an explicit
    // 'views' property will mean the default unnamed view properties are ignored. This
    // is also a good time to resolve view names to absolute names, so everything is a
    // straight lookup at link time.
    views: function(state) {
      var views = {};

      forEach(isDefined(state.views) ? state.views : { '': state }, function (view, name) {
        if (name.indexOf('@') < 0) name += '@' + state.parent.name;
        view.resolveAs = view.resolveAs || state.resolveAs || '$resolve';
        views[name] = view;
      });
      return views;
    },

    // Keep a full path from the root down to this state as this is needed for state activation.
    path: function(state) {
      return state.parent ? state.parent.path.concat(state) : []; // exclude root from path
    },

    // Speed up $state.contains() as it's used a lot
    includes: function(state) {
      var includes = state.parent ? extend({}, state.parent.includes) : {};
      includes[state.name] = true;
      return includes;
    },

    $delegates: {}
  };

  function isRelative(stateName) {
    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  function findState(stateOrName, base) {
    if (!stateOrName) return undefined;

    var isStr = isString(stateOrName),
        name  = isStr ? stateOrName : stateOrName.name,
        path  = isRelative(name);

    if (path) {
      if (!base) throw new Error("No reference point given for path '"  + name + "'");
      base = findState(base);
      
      var rel = name.split("."), i = 0, pathLength = rel.length, current = base;

      for (; i < pathLength; i++) {
        if (rel[i] === "" && i === 0) {
          current = base;
          continue;
        }
        if (rel[i] === "^") {
          if (!current.parent) throw new Error("Path '" + name + "' not valid for state '" + base.name + "'");
          current = current.parent;
          continue;
        }
        break;
      }
      rel = rel.slice(i).join(".");
      name = current.name + (current.name && rel ? "." : "") + rel;
    }
    var state = states[name];

    if (state && (isStr || (!isStr && (state === stateOrName || state.self === stateOrName)))) {
      return state;
    }
    return undefined;
  }

  function queueState(parentName, state) {
    if (!queue[parentName]) {
      queue[parentName] = [];
    }
    queue[parentName].push(state);
  }

  function flushQueuedChildren(parentName) {
    var queued = queue[parentName] || [];
    while(queued.length) {
      registerState(queued.shift());
    }
  }

  function registerState(state) {
    // Wrap a new object around the state so we can store our private details easily.
    state = inherit(state, {
      self: state,
      resolve: state.resolve || {},
      toString: function() { return this.name; }
    });

    var name = state.name;
    if (!isString(name) || name.indexOf('@') >= 0) throw new Error("State must have a valid name");
    if (states.hasOwnProperty(name)) throw new Error("State '" + name + "' is already defined");

    // Get parent name
    var parentName = (name.indexOf('.') !== -1) ? name.substring(0, name.lastIndexOf('.'))
        : (isString(state.parent)) ? state.parent
        : (isObject(state.parent) && isString(state.parent.name)) ? state.parent.name
        : '';

    // If parent is not registered yet, add state to queue and register later
    if (parentName && !states[parentName]) {
      return queueState(parentName, state.self);
    }

    for (var key in stateBuilder) {
      if (isFunction(stateBuilder[key])) state[key] = stateBuilder[key](state, stateBuilder.$delegates[key]);
    }
    states[name] = state;

    // Register the state in the global state list and with $urlRouter if necessary.
    if (!state[abstractKey] && state.url) {
      $urlRouterProvider.when(state.url, ['$match', '$stateParams', function ($match, $stateParams) {
        if ($state.$current.navigable != state || !equalForKeys($match, $stateParams)) {
          $state.transitionTo(state, $match, { inherit: true, location: false });
        }
      }]);
    }

    // Register any queued children
    flushQueuedChildren(name);

    return state;
  }

  // Checks text to see if it looks like a glob.
  function isGlob (text) {
    return text.indexOf('*') > -1;
  }

  // Returns true if glob matches current $state name.
  function doesStateMatchGlob (glob) {
    var globSegments = glob.split('.'),
        segments = $state.$current.name.split('.');

    //match single stars
    for (var i = 0, l = globSegments.length; i < l; i++) {
      if (globSegments[i] === '*') {
        segments[i] = '*';
      }
    }

    //match greedy starts
    if (globSegments[0] === '**') {
       segments = segments.slice(indexOf(segments, globSegments[1]));
       segments.unshift('**');
    }
    //match greedy ends
    if (globSegments[globSegments.length - 1] === '**') {
       segments.splice(indexOf(segments, globSegments[globSegments.length - 2]) + 1, Number.MAX_VALUE);
       segments.push('**');
    }

    if (globSegments.length != segments.length) {
      return false;
    }

    return segments.join('') === globSegments.join('');
  }


  // Implicit root state that is always active
  root = registerState({
    name: '',
    url: '^',
    views: null,
    'abstract': true
  });
  root.navigable = null;


  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#decorator
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Allows you to extend (carefully) or override (at your own peril) the 
   * `stateBuilder` object used internally by `$stateProvider`. This can be used 
   * to add custom functionality to ui-router, for example inferring templateUrl 
   * based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new 
   * properties within the state's internal definition. There is currently no clear 
   * use-case for this beyond accessing internal states (i.e. $state.$current), 
   * however, expect this to become increasingly relevant as we introduce additional 
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of 
   * execution of the builder functions in non-deterministic. Builder functions 
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is 
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to 
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view 
   *   name (i.e. "viewName@stateName") and each value is the config object 
   *   (template, controller) for the view. Even when you don't use the views object 
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template 
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state, 
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state. 
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that 
   *   would pass a `$state.includes()` test.
   *
   * @example
   * <pre>
   * // Override the internal 'views' builder with a function that takes the state
   * // definition, and a reference to the internal function being overridden:
   * $stateProvider.decorator('views', function (state, parent) {
   *   var result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (config, name) {
   *     var autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   *
   * // ...
   *
   * $state.go('home');
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * </pre>
   *
   * @param {string} name The name of the builder function to decorate. 
   * @param {object} func A function that is responsible for decorating the original 
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  this.decorator = decorator;
  function decorator(name, func) {
    /*jshint validthis: true */
    if (isString(name) && !isDefined(func)) {
      return stateBuilder[name];
    }
    if (!isFunction(func) || !isString(name)) {
      return this;
    }
    if (stateBuilder[name] && !stateBuilder.$delegates[name]) {
      stateBuilder.$delegates[name] = stateBuilder[name];
    }
    stateBuilder[name] = func;
    return this;
  }

  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#state
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Registers a state configuration under a given state name. The stateConfig object
   * has the following acceptable properties.
   *
   * @param {string} name A unique state name, e.g. "home", "about", "contacts".
   * To create a parent/child state use a dot, e.g. "about.sales", "home.newest".
   * @param {object} stateConfig State configuration object.
   * @param {string|function=} stateConfig.template
   * <a id='template'></a>
   *   html template as a string or a function that returns
   *   an html template as a string which should be used by the uiView directives. This property 
   *   takes precedence over templateUrl.
   *   
   *   If `template` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by
   *     applying the current state
   *
   * <pre>template:
   *   "<h1>inline template definition</h1>" +
   *   "<div ui-view></div>"</pre>
   * <pre>template: function(params) {
   *       return "<h1>generated template</h1>"; }</pre>
   * </div>
   *
   * @param {string|function=} stateConfig.templateUrl
   * <a id='templateUrl'></a>
   *
   *   path or function that returns a path to an html
   *   template that should be used by uiView.
   *   
   *   If `templateUrl` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by 
   *     applying the current state
   *
   * <pre>templateUrl: "home.html"</pre>
   * <pre>templateUrl: function(params) {
   *     return myTemplates[params.pageId]; }</pre>
   *
   * @param {function=} stateConfig.templateProvider
   * <a id='templateProvider'></a>
   *    Provider function that returns HTML content string.
   * <pre> templateProvider:
   *       function(MyTemplateService, params) {
   *         return MyTemplateService.getTemplate(params.pageId);
   *       }</pre>
   *
   * @param {string|function=} stateConfig.controller
   * <a id='controller'></a>
   *
   *  Controller fn that should be associated with newly
   *   related scope or the name of a registered controller if passed as a string.
   *   Optionally, the ControllerAs may be declared here.
   * <pre>controller: "MyRegisteredController"</pre>
   * <pre>controller:
   *     "MyRegisteredController as fooCtrl"}</pre>
   * <pre>controller: function($scope, MyService) {
   *     $scope.data = MyService.getData(); }</pre>
   *
   * @param {function=} stateConfig.controllerProvider
   * <a id='controllerProvider'></a>
   *
   * Injectable provider function that returns the actual controller or string.
   * <pre>controllerProvider:
   *   function(MyResolveData) {
   *     if (MyResolveData.foo)
   *       return "FooCtrl"
   *     else if (MyResolveData.bar)
   *       return "BarCtrl";
   *     else return function($scope) {
   *       $scope.baz = "Qux";
   *     }
   *   }</pre>
   *
   * @param {string=} stateConfig.controllerAs
   * <a id='controllerAs'></a>
   * 
   * A controller alias name. If present the controller will be
   *   published to scope under the controllerAs name.
   * <pre>controllerAs: "myCtrl"</pre>
   *
   * @param {string|object=} stateConfig.parent
   * <a id='parent'></a>
   * Optionally specifies the parent state of this state.
   *
   * <pre>parent: 'parentState'</pre>
   * <pre>parent: parentState // JS variable</pre>
   *
   * @param {object=} stateConfig.resolve
   * <a id='resolve'></a>
   *
   * An optional map&lt;string, function&gt; of dependencies which
   *   should be injected into the controller. If any of these dependencies are promises, 
   *   the router will wait for them all to be resolved before the controller is instantiated.
   *   If all the promises are resolved successfully, the $stateChangeSuccess event is fired
   *   and the values of the resolved promises are injected into any controllers that reference them.
   *   If any  of the promises are rejected the $stateChangeError event is fired.
   *
   *   The map object is:
   *   
   *   - key - {string}: name of dependency to be injected into controller
   *   - factory - {string|function}: If string then it is alias for service. Otherwise if function, 
   *     it is injected and return value it treated as dependency. If result is a promise, it is 
   *     resolved before its value is injected into controller.
   *
   * <pre>resolve: {
   *     myResolve1:
   *       function($http, $stateParams) {
   *         return $http.get("/api/foos/"+stateParams.fooID);
   *       }
   *     }</pre>
   *
   * @param {string=} stateConfig.url
   * <a id='url'></a>
   *
   *   A url fragment with optional parameters. When a state is navigated or
   *   transitioned to, the `$stateParams` service will be populated with any 
   *   parameters that were passed.
   *
   *   (See {@link ui.router.util.type:UrlMatcher UrlMatcher} `UrlMatcher`} for
   *   more details on acceptable patterns )
   *
   * examples:
   * <pre>url: "/home"
   * url: "/users/:userid"
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * url: "/books/{categoryid:int}"
   * url: "/books/{publishername:string}/{categoryid:int}"
   * url: "/messages?before&after"
   * url: "/messages?{before:date}&{after:date}"
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   * </pre>
   *
   * @param {object=} stateConfig.views
   * <a id='views'></a>
   * an optional map&lt;string, object&gt; which defined multiple views, or targets views
   * manually/explicitly.
   *
   * Examples:
   *
   * Targets three named `ui-view`s in the parent state's template
   * <pre>views: {
   *     header: {
   *       controller: "headerCtrl",
   *       templateUrl: "header.html"
   *     }, body: {
   *       controller: "bodyCtrl",
   *       templateUrl: "body.html"
   *     }, footer: {
   *       controller: "footCtrl",
   *       templateUrl: "footer.html"
   *     }
   *   }</pre>
   *
   * Targets named `ui-view="header"` from grandparent state 'top''s template, and named `ui-view="body" from parent state's template.
   * <pre>views: {
   *     'header@top': {
   *       controller: "msgHeaderCtrl",
   *       templateUrl: "msgHeader.html"
   *     }, 'body': {
   *       controller: "messagesCtrl",
   *       templateUrl: "messages.html"
   *     }
   *   }</pre>
   *
   * @param {boolean=} [stateConfig.abstract=false]
   * <a id='abstract'></a>
   * An abstract state will never be directly activated,
   *   but can provide inherited properties to its common children states.
   * <pre>abstract: true</pre>
   *
   * @param {function=} stateConfig.onEnter
   * <a id='onEnter'></a>
   *
   * Callback function for when a state is entered. Good way
   *   to trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explicitly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onEnter: function(MyService, $stateParams) {
   *     MyService.foo($stateParams.myParam);
   * }</pre>
   *
   * @param {function=} stateConfig.onExit
   * <a id='onExit'></a>
   *
   * Callback function for when a state is exited. Good way to
   *   trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explicitly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onExit: function(MyService, $stateParams) {
   *     MyService.cleanup($stateParams.myParam);
   * }</pre>
   *
   * @param {boolean=} [stateConfig.reloadOnSearch=true]
   * <a id='reloadOnSearch'></a>
   *
   * If `false`, will not retrigger the same state
   *   just because a search/query parameter has changed (via $location.search() or $location.hash()). 
   *   Useful for when you'd like to modify $location.search() without triggering a reload.
   * <pre>reloadOnSearch: false</pre>
   *
   * @param {object=} stateConfig.data
   * <a id='data'></a>
   *
   * Arbitrary data object, useful for custom configuration.  The parent state's `data` is
   *   prototypally inherited.  In other words, adding a data property to a state adds it to
   *   the entire subtree via prototypal inheritance.
   *
   * <pre>data: {
   *     requiredRole: 'foo'
   * } </pre>
   *
   * @param {object=} stateConfig.params
   * <a id='params'></a>
   *
   * A map which optionally configures parameters declared in the `url`, or
   *   defines additional non-url parameters.  For each parameter being
   *   configured, add a configuration object keyed to the name of the parameter.
   *
   *   Each parameter configuration object may contain the following properties:
   *
   *   - ** value ** - {object|function=}: specifies the default value for this
   *     parameter.  This implicitly sets this parameter as optional.
   *
   *     When UI-Router routes to a state and no value is
   *     specified for this parameter in the URL or transition, the
   *     default value will be used instead.  If `value` is a function,
   *     it will be injected and invoked, and the return value used.
   *
   *     *Note*: `undefined` is treated as "no default value" while `null`
   *     is treated as "the default value is `null`".
   *
   *     *Shorthand*: If you only need to configure the default value of the
   *     parameter, you may use a shorthand syntax.   In the **`params`**
   *     map, instead mapping the param name to a full parameter configuration
   *     object, simply set map it to the default parameter value, e.g.:
   *
   * <pre>// define a parameter's default value
   * params: {
   *     param1: { value: "defaultValue" }
   * }
   * // shorthand default values
   * params: {
   *     param1: "defaultValue",
   *     param2: "param2Default"
   * }</pre>
   *
   *   - ** array ** - {boolean=}: *(default: false)* If true, the param value will be
   *     treated as an array of values.  If you specified a Type, the value will be
   *     treated as an array of the specified Type.  Note: query parameter values
   *     default to a special `"auto"` mode.
   *
   *     For query parameters in `"auto"` mode, if multiple  values for a single parameter
   *     are present in the URL (e.g.: `/foo?bar=1&bar=2&bar=3`) then the values
   *     are mapped to an array (e.g.: `{ foo: [ '1', '2', '3' ] }`).  However, if
   *     only one value is present (e.g.: `/foo?bar=1`) then the value is treated as single
   *     value (e.g.: `{ foo: '1' }`).
   *
   * <pre>params: {
   *     param1: { array: true }
   * }</pre>
   *
   *   - ** squash ** - {bool|string=}: `squash` configures how a default parameter value is represented in the URL when
   *     the current parameter value is the same as the default value. If `squash` is not set, it uses the
   *     configured default squash policy.
   *     (See {@link ui.router.util.$urlMatcherFactory#methods_defaultSquashPolicy `defaultSquashPolicy()`})
   *
   *   There are three squash settings:
   *
   *     - false: The parameter's default value is not squashed.  It is encoded and included in the URL
   *     - true: The parameter's default value is omitted from the URL.  If the parameter is preceeded and followed
   *       by slashes in the state's `url` declaration, then one of those slashes are omitted.
   *       This can allow for cleaner looking URLs.
   *     - `"<arbitrary string>"`: The parameter's default value is replaced with an arbitrary placeholder of  your choice.
   *
   * <pre>params: {
   *     param1: {
   *       value: "defaultId",
   *       squash: true
   * } }
   * // squash "defaultValue" to "~"
   * params: {
   *     param1: {
   *       value: "defaultValue",
   *       squash: "~"
   * } }
   * </pre>
   *
   *
   * @example
   * <pre>
   * // Some state name examples
   *
   * // stateName can be a single top-level name (must be unique).
   * $stateProvider.state("home", {});
   *
   * // Or it can be a nested state name. This state is a child of the
   * // above "home" state.
   * $stateProvider.state("home.newest", {});
   *
   * // Nest states as deeply as needed.
   * $stateProvider.state("home.newest.abc.xyz.inception", {});
   *
   * // state() returns $stateProvider, so you can chain state declarations.
   * $stateProvider
   *   .state("home", {})
   *   .state("about", {})
   *   .state("contacts", {});
   * </pre>
   *
   */
  this.state = state;
  function state(name, definition) {
    /*jshint validthis: true */
    if (isObject(name)) definition = name;
    else definition.name = name;
    registerState(definition);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.state.$state
   *
   * @requires $rootScope
   * @requires $q
   * @requires ui.router.state.$view
   * @requires $injector
   * @requires ui.router.util.$resolve
   * @requires ui.router.state.$stateParams
   * @requires ui.router.router.$urlRouter
   *
   * @property {object} params A param object, e.g. {sectionId: section.id)}, that 
   * you'd like to test against the current active state.
   * @property {object} current A reference to the state's config object. However 
   * you passed it in. Useful for accessing custom data.
   * @property {object} transition Currently pending transition. A promise that'll 
   * resolve or reject.
   *
   * @description
   * `$state` service is responsible for representing states as well as transitioning
   * between them. It also provides interfaces to ask for current state or even states
   * you're coming from.
   */
  this.$get = $get;
  $get.$inject = ['$rootScope', '$q', '$view', '$injector', '$resolve', '$stateParams', '$urlRouter', '$location', '$urlMatcherFactory'];
  function $get(   $rootScope,   $q,   $view,   $injector,   $resolve,   $stateParams,   $urlRouter,   $location,   $urlMatcherFactory) {

    var TransitionSupersededError = new Error('transition superseded');

    var TransitionSuperseded = silenceUncaughtInPromise($q.reject(TransitionSupersededError));
    var TransitionPrevented = silenceUncaughtInPromise($q.reject(new Error('transition prevented')));
    var TransitionAborted = silenceUncaughtInPromise($q.reject(new Error('transition aborted')));
    var TransitionFailed = silenceUncaughtInPromise($q.reject(new Error('transition failed')));

    // Handles the case where a state which is the target of a transition is not found, and the user
    // can optionally retry or defer the transition
    function handleRedirect(redirect, state, params, options) {
      /**
       * @ngdoc event
       * @name ui.router.state.$state#$stateNotFound
       * @eventOf ui.router.state.$state
       * @eventType broadcast on root scope
       * @description
       * Fired when a requested state **cannot be found** using the provided state name during transition.
       * The event is broadcast allowing any handlers a single chance to deal with the error (usually by
       * lazy-loading the unfound state). A special `unfoundState` object is passed to the listener handler,
       * you can see its three properties in the example. You can use `event.preventDefault()` to abort the
       * transition and the promise returned from `go` will be rejected with a `'transition aborted'` value.
       *
       * @param {Object} event Event object.
       * @param {Object} unfoundState Unfound State information. Contains: `to, toParams, options` properties.
       * @param {State} fromState Current state object.
       * @param {Object} fromParams Current state params.
       *
       * @example
       *
       * <pre>
       * // somewhere, assume lazy.state has not been defined
       * $state.go("lazy.state", {a:1, b:2}, {inherit:false});
       *
       * // somewhere else
       * $scope.$on('$stateNotFound',
       * function(event, unfoundState, fromState, fromParams){
       *     console.log(unfoundState.to); // "lazy.state"
       *     console.log(unfoundState.toParams); // {a:1, b:2}
       *     console.log(unfoundState.options); // {inherit:false} + default options
       * })
       * </pre>
       */
      var evt = $rootScope.$broadcast('$stateNotFound', redirect, state, params);

      if (evt.defaultPrevented) {
        $urlRouter.update();
        return TransitionAborted;
      }

      if (!evt.retry) {
        return null;
      }

      // Allow the handler to return a promise to defer state lookup retry
      if (options.$retry) {
        $urlRouter.update();
        return TransitionFailed;
      }
      var retryTransition = $state.transition = $q.when(evt.retry);

      retryTransition.then(function() {
        if (retryTransition !== $state.transition) {
          $rootScope.$broadcast('$stateChangeCancel', redirect.to, redirect.toParams, state, params);
          return TransitionSuperseded;
        }
        redirect.options.$retry = true;
        return $state.transitionTo(redirect.to, redirect.toParams, redirect.options);
      }, function() {
        return TransitionAborted;
      });
      $urlRouter.update();

      return retryTransition;
    }

    root.locals = { resolve: null, globals: { $stateParams: {} } };

    $state = {
      params: {},
      current: root.self,
      $current: root,
      transition: null
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#reload
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method that force reloads the current state. All resolves are re-resolved,
     * controllers reinstantiated, and events re-fired.
     *
     * @example
     * <pre>
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     $state.reload();
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, { 
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>
     *
     * @param {string=|object=} state - A state name or a state object, which is the root of the resolves to be re-resolved.
     * @example
     * <pre>
     * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item' 
     * //and current state is 'contacts.detail.item'
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     //will reload 'contact.detail' and 'contact.detail.item' states
     *     $state.reload('contact.detail');
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, { 
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>

     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.reload = function reload(state) {
      return $state.transitionTo($state.current, $stateParams, { reload: state || true, inherit: false, notify: true});
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#go
     * @methodOf ui.router.state.$state
     *
     * @description
     * Convenience method for transitioning to a new state. `$state.go` calls 
     * `$state.transitionTo` internally but automatically sets options to 
     * `{ location: true, inherit: true, relative: $state.$current, notify: true }`. 
     * This allows you to easily use an absolute or relative to path and specify 
     * only the parameters you'd like to update (while letting unspecified parameters 
     * inherit from the currently active ancestor states).
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * </pre>
     * <img src='../ngdoc_assets/StateGoExamples.png'/>
     *
     * @param {string} to Absolute state name or relative state path. Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to a parent state
     * - `$state.go('^.sibling')` - will go to a sibling state
     * - `$state.go('.child.grandchild')` - will go to grandchild state
     *
     * @param {object=} params A map of the parameters that will be sent to the state, 
     * will populate $stateParams. Any parameters that are not specified will be inherited from currently 
     * defined parameters. Only parameters specified in the state definition can be overridden, new 
     * parameters will be ignored. This allows, for example, going to a sibling state that shares parameters
     * specified in a parent state. Parameter inheritance only works between common ancestor states, I.e.
     * transitioning to a sibling will get you the parameters for all parents, transitioning to a child
     * will get you all current parameters, etc.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false|string|object}, If `true` will force transition even if no state or params
     *    have changed.  It will reload the resolves and views of the current state and parent states.
     *    If `reload` is a string (or state object), the state object is fetched (by name, or object reference); and \
     *    the transition reloads the resolves and views for that matched state, and all its children states.
     *
     * @returns {promise} A promise representing the state of the new transition.
     *
     * Possible success values:
     *
     * - $state.current
     *
     * <br/>Possible rejection values:
     *
     * - 'transition superseded' - when a newer transition has been started after this one
     * - 'transition prevented' - when `event.preventDefault()` has been called in a `$stateChangeStart` listener
     * - 'transition aborted' - when `event.preventDefault()` has been called in a `$stateNotFound` listener or
     *   when a `$stateNotFound` `event.retry` promise errors.
     * - 'transition failed' - when a state has been unsuccessfully found after 2 tries.
     * - *resolve error* - when an error has occurred with a `resolve`
     *
     */
    $state.go = function go(to, params, options) {
      return $state.transitionTo(to, params, extend({ inherit: true, relative: $state.$current }, options));
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#transitionTo
     * @methodOf ui.router.state.$state
     *
     * @description
     * Low-level method for transitioning to a new state. {@link ui.router.state.$state#methods_go $state.go}
     * uses `transitionTo` internally. `$state.go` is recommended in most situations.
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.transitionTo('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to State name.
     * @param {object=} toParams A map of the parameters that will be sent to the state,
     * will populate $stateParams.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=false}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false|string=|object=}, If `true` will force transition even if the state or params 
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *    if String, then will reload the state with the name given in reload, and any children.
     *    if Object, then a stateObj is expected, will reload the state found in stateObj, and any children.
     *
     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.transitionTo = function transitionTo(to, toParams, options) {
      toParams = toParams || {};
      options = extend({
        location: true, inherit: false, relative: null, notify: true, reload: false, $retry: false
      }, options || {});

      var from = $state.$current, fromParams = $state.params, fromPath = from.path;
      var evt, toState = findState(to, options.relative);

      // Store the hash param for later (since it will be stripped out by various methods)
      var hash = toParams['#'];

      if (!isDefined(toState)) {
        var redirect = { to: to, toParams: toParams, options: options };
        var redirectResult = handleRedirect(redirect, from.self, fromParams, options);

        if (redirectResult) {
          return redirectResult;
        }

        // Always retry once if the $stateNotFound was not prevented
        // (handles either redirect changed or state lazy-definition)
        to = redirect.to;
        toParams = redirect.toParams;
        options = redirect.options;
        toState = findState(to, options.relative);

        if (!isDefined(toState)) {
          if (!options.relative) throw new Error("No such state '" + to + "'");
          throw new Error("Could not resolve '" + to + "' from state '" + options.relative + "'");
        }
      }
      if (toState[abstractKey]) throw new Error("Cannot transition to abstract state '" + to + "'");
      if (options.inherit) toParams = inheritParams($stateParams, toParams || {}, $state.$current, toState);
      if (!toState.params.$$validates(toParams)) return TransitionFailed;

      toParams = toState.params.$$values(toParams);
      to = toState;

      var toPath = to.path;

      // Starting from the root of the path, keep all levels that haven't changed
      var keep = 0, state = toPath[keep], locals = root.locals, toLocals = [];

      if (!options.reload) {
        while (state && state === fromPath[keep] && state.ownParams.$$equals(toParams, fromParams)) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      } else if (isString(options.reload) || isObject(options.reload)) {
        if (isObject(options.reload) && !options.reload.name) {
          throw new Error('Invalid reload state object');
        }
        
        var reloadState = options.reload === true ? fromPath[0] : findState(options.reload);
        if (options.reload && !reloadState) {
          throw new Error("No such reload state '" + (isString(options.reload) ? options.reload : options.reload.name) + "'");
        }

        while (state && state === fromPath[keep] && state !== reloadState) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      }

      // If we're going to the same state and all locals are kept, we've got nothing to do.
      // But clear 'transition', as we still want to cancel any other pending transitions.
      // TODO: We may not want to bump 'transition' if we're called from a location change
      // that we've initiated ourselves, because we might accidentally abort a legitimate
      // transition initiated from code?
      if (shouldSkipReload(to, toParams, from, fromParams, locals, options)) {
        if (hash) toParams['#'] = hash;
        $state.params = toParams;
        copy($state.params, $stateParams);
        copy(filterByKeys(to.params.$$keys(), $stateParams), to.locals.globals.$stateParams);
        if (options.location && to.navigable && to.navigable.url) {
          $urlRouter.push(to.navigable.url, toParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
          $urlRouter.update(true);
        }
        $state.transition = null;
        return $q.when($state.current);
      }

      // Filter parameters before we pass them to event handlers etc.
      toParams = filterByKeys(to.params.$$keys(), toParams || {});
      
      // Re-add the saved hash before we start returning things or broadcasting $stateChangeStart
      if (hash) toParams['#'] = hash;
      
      // Broadcast start event and cancel the transition if requested
      if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeStart
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when the state transition **begins**. You can use `event.preventDefault()`
         * to prevent the transition from happening and then the transition promise will be
         * rejected with a `'transition prevented'` value.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         *
         * @example
         *
         * <pre>
         * $rootScope.$on('$stateChangeStart',
         * function(event, toState, toParams, fromState, fromParams){
         *     event.preventDefault();
         *     // transitionTo() promise will be rejected with
         *     // a 'transition prevented' error
         * })
         * </pre>
         */
        if ($rootScope.$broadcast('$stateChangeStart', to.self, toParams, from.self, fromParams, options).defaultPrevented) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          //Don't update and resync url if there's been a new transition started. see issue #2238, #600
          if ($state.transition == null) $urlRouter.update();
          return TransitionPrevented;
        }
      }

      // Resolve locals for the remaining states, but don't update any global state just
      // yet -- if anything fails to resolve the current state needs to remain untouched.
      // We also set up an inheritance chain for the locals here. This allows the view directive
      // to quickly look up the correct definition for each view in the current state. Even
      // though we create the locals object itself outside resolveState(), it is initially
      // empty and gets filled asynchronously. We need to keep track of the promise for the
      // (fully resolved) current locals, and pass this down the chain.
      var resolved = $q.when(locals);

      for (var l = keep; l < toPath.length; l++, state = toPath[l]) {
        locals = toLocals[l] = inherit(locals);
        resolved = resolveState(state, toParams, state === to, resolved, locals, options);
      }

      // Once everything is resolved, we are ready to perform the actual transition
      // and return a promise for the new state. We also keep track of what the
      // current promise is, so that we can detect overlapping transitions and
      // keep only the outcome of the last transition.
      var transition = $state.transition = resolved.then(function () {
        var l, entering, exiting;

        if ($state.transition !== transition) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          return TransitionSuperseded;
        }

        // Exit 'from' states not kept
        for (l = fromPath.length - 1; l >= keep; l--) {
          exiting = fromPath[l];
          if (exiting.self.onExit) {
            $injector.invoke(exiting.self.onExit, exiting.self, exiting.locals.globals);
          }
          exiting.locals = null;
        }

        // Enter 'to' states not kept
        for (l = keep; l < toPath.length; l++) {
          entering = toPath[l];
          entering.locals = toLocals[l];
          if (entering.self.onEnter) {
            $injector.invoke(entering.self.onEnter, entering.self, entering.locals.globals);
          }
        }

        // Run it again, to catch any transitions in callbacks
        if ($state.transition !== transition) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          return TransitionSuperseded;
        }

        // Update globals in $state
        $state.$current = to;
        $state.current = to.self;
        $state.params = toParams;
        copy($state.params, $stateParams);
        $state.transition = null;

        if (options.location && to.navigable) {
          $urlRouter.push(to.navigable.url, to.navigable.locals.globals.$stateParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
        }

        if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeSuccess
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired once the state transition is **complete**.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         */
          $rootScope.$broadcast('$stateChangeSuccess', to.self, toParams, from.self, fromParams);
        }
        $urlRouter.update(true);

        return $state.current;
      }).then(null, function (error) {
        // propagate TransitionSuperseded error without emitting $stateChangeCancel
        // as it was already emitted in the success handler above
        if (error === TransitionSupersededError) return TransitionSuperseded;

        if ($state.transition !== transition) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          return TransitionSuperseded;
        }

        $state.transition = null;
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeError
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when an **error occurs** during transition. It's important to note that if you
         * have any errors in your resolve functions (javascript errors, non-existent services, etc)
         * they will not throw traditionally. You must listen for this $stateChangeError event to
         * catch **ALL** errors.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         * @param {Error} error The resolve error object.
         */
        evt = $rootScope.$broadcast('$stateChangeError', to.self, toParams, from.self, fromParams, error);

        if (!evt.defaultPrevented) {
          $urlRouter.update();
        }

        return $q.reject(error);
      });

      silenceUncaughtInPromise(transition);
      return transition;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#is
     * @methodOf ui.router.state.$state
     *
     * @description
     * Similar to {@link ui.router.state.$state#methods_includes $state.includes},
     * but only checks for the full state name. If params is supplied then it will be
     * tested for strict equality against the current active params object, so all params
     * must match with none missing and no extras.
     *
     * @example
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // absolute name
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     *
     * // relative name (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
     * </pre>
     *
     * @param {string|object} stateOrName The state name (absolute or relative) or state object you'd like to check.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`, that you'd like
     * to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object} -  If `stateOrName` is a relative state name and `options.relative` is set, .is will
     * test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it is the state.
     */
    $state.is = function is(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) { return undefined; }
      if ($state.$current !== state) { return false; }

      return !params || objectKeys(params).reduce(function(acc, key) {
        var paramDef = state.params[key];
        return acc && !paramDef || paramDef.type.equals($stateParams[key], params[key]);
      }, true);
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#includes
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method to determine if the current active state is equal to or is the child of the
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * @example
     * Partial and relative names
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // Using partial names
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     *
     * // Using relative names (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.includes('.item')}">Item</div>
     * </pre>
     *
     * Basic globbing patterns
     * <pre>
     * $state.$current.name = 'contacts.details.item.url';
     *
     * $state.includes("*.details.*.*"); // returns true
     * $state.includes("*.details.**"); // returns true
     * $state.includes("**.item.**"); // returns true
     * $state.includes("*.details.item.url"); // returns true
     * $state.includes("*.details.*.url"); // returns true
     * $state.includes("*.details.*"); // returns false
     * $state.includes("item.**"); // returns false
     * </pre>
     *
     * @param {string} stateOrName A partial name, relative name, or glob pattern
     * to be searched for within the current state name.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`,
     * that you'd like to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object=} -  If `stateOrName` is a relative state reference and `options.relative` is set,
     * .includes will test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it does include the state
     */
    $state.includes = function includes(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      if (isString(stateOrName) && isGlob(stateOrName)) {
        if (!doesStateMatchGlob(stateOrName)) {
          return false;
        }
        stateOrName = $state.$current.name;
      }

      var state = findState(stateOrName, options.relative);
      if (!isDefined(state)) { return undefined; }
      if (!isDefined($state.$current.includes[state.name])) { return false; }
      if (!params) { return true; }

      var keys = objectKeys(params);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i], paramDef = state.params[key];
        if (paramDef && !paramDef.type.equals($stateParams[key], params[key])) {
          return false;
        }
      }

      return objectKeys(params).reduce(function(acc, key) {
        var paramDef = state.params[key];
        return acc && !paramDef || paramDef.type.equals($stateParams[key], params[key]);
      }, true);
    };


    /**
     * @ngdoc function
     * @name ui.router.state.$state#href
     * @methodOf ui.router.state.$state
     *
     * @description
     * A url generation method that returns the compiled url for the given state populated with the given params.
     *
     * @example
     * <pre>
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * </pre>
     *
     * @param {string|object} stateOrName The state name or state object you'd like to generate a url from.
     * @param {object=} params An object of parameter values to fill the state's required parameters.
     * @param {object=} options Options object. The options are:
     *
     * - **`lossy`** - {boolean=true} -  If true, and if there is no url associated with the state provided in the
     *    first parameter, then the constructed href url will be built from the first navigable ancestor (aka
     *    ancestor with a valid url).
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     * 
     * @returns {string} compiled state url
     */
    $state.href = function href(stateOrName, params, options) {
      options = extend({
        lossy:    true,
        inherit:  true,
        absolute: false,
        relative: $state.$current
      }, options || {});

      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) return null;
      if (options.inherit) params = inheritParams($stateParams, params || {}, $state.$current, state);
      
      var nav = (state && options.lossy) ? state.navigable : state;

      if (!nav || nav.url === undefined || nav.url === null) {
        return null;
      }
      return $urlRouter.href(nav.url, filterByKeys(state.params.$$keys().concat('#'), params || {}), {
        absolute: options.absolute
      });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#get
     * @methodOf ui.router.state.$state
     *
     * @description
     * Returns the state configuration object for any specific state or all states.
     *
     * @param {string|object=} stateOrName (absolute or relative) If provided, will only get the config for
     * the requested state. If not provided, returns an array of ALL state configs.
     * @param {string|object=} context When stateOrName is a relative state reference, the state will be retrieved relative to context.
     * @returns {Object|Array} State configuration object or array of all objects.
     */
    $state.get = function (stateOrName, context) {
      if (arguments.length === 0) return map(objectKeys(states), function(name) { return states[name].self; });
      var state = findState(stateOrName, context || $state.$current);
      return (state && state.self) ? state.self : null;
    };

    function resolveState(state, params, paramsAreFiltered, inherited, dst, options) {
      // Make a restricted $stateParams with only the parameters that apply to this state if
      // necessary. In addition to being available to the controller and onEnter/onExit callbacks,
      // we also need $stateParams to be available for any $injector calls we make during the
      // dependency resolution process.
      var $stateParams = (paramsAreFiltered) ? params : filterByKeys(state.params.$$keys(), params);
      var locals = { $stateParams: $stateParams };

      // Resolve 'global' dependencies for the state, i.e. those not specific to a view.
      // We're also including $stateParams in this; that way the parameters are restricted
      // to the set that should be visible to the state, and are independent of when we update
      // the global $state and $stateParams values.
      dst.resolve = $resolve.resolve(state.resolve, locals, dst.resolve, state);
      var promises = [dst.resolve.then(function (globals) {
        dst.globals = globals;
      })];
      if (inherited) promises.push(inherited);

      function resolveViews() {
        var viewsPromises = [];

        // Resolve template and dependencies for all views.
        forEach(state.views, function (view, name) {
          var injectables = (view.resolve && view.resolve !== state.resolve ? view.resolve : {});
          injectables.$template = [ function () {
            return $view.load(name, { view: view, locals: dst.globals, params: $stateParams, notify: options.notify }) || '';
          }];

          viewsPromises.push($resolve.resolve(injectables, dst.globals, dst.resolve, state).then(function (result) {
            // References to the controller (only instantiated at link time)
            if (isFunction(view.controllerProvider) || isArray(view.controllerProvider)) {
              var injectLocals = angular.extend({}, injectables, dst.globals);
              result.$$controller = $injector.invoke(view.controllerProvider, null, injectLocals);
            } else {
              result.$$controller = view.controller;
            }
            // Provide access to the state itself for internal use
            result.$$state = state;
            result.$$controllerAs = view.controllerAs;
            result.$$resolveAs = view.resolveAs;
            dst[name] = result;
          }));
        });

        return $q.all(viewsPromises).then(function(){
          return dst.globals;
        });
      }

      // Wait for all the promises and then return the activation object
      return $q.all(promises).then(resolveViews).then(function (values) {
        return dst;
      });
    }

    return $state;
  }

  function shouldSkipReload(to, toParams, from, fromParams, locals, options) {
    // Return true if there are no differences in non-search (path/object) params, false if there are differences
    function nonSearchParamsEqual(fromAndToState, fromParams, toParams) {
      // Identify whether all the parameters that differ between `fromParams` and `toParams` were search params.
      function notSearchParam(key) {
        return fromAndToState.params[key].location != "search";
      }
      var nonQueryParamKeys = fromAndToState.params.$$keys().filter(notSearchParam);
      var nonQueryParams = pick.apply({}, [fromAndToState.params].concat(nonQueryParamKeys));
      var nonQueryParamSet = new $$UMFP.ParamSet(nonQueryParams);
      return nonQueryParamSet.$$equals(fromParams, toParams);
    }

    // If reload was not explicitly requested
    // and we're transitioning to the same state we're already in
    // and    the locals didn't change
    //     or they changed in a way that doesn't merit reloading
    //        (reloadOnParams:false, or reloadOnSearch.false and only search params changed)
    // Then return true.
    if (!options.reload && to === from &&
      (locals === from.locals || (to.self.reloadOnSearch === false && nonSearchParamsEqual(from, fromParams, toParams)))) {
      return true;
    }
  }
}

angular.module('ui.router.state')
  .factory('$stateParams', function () { return {}; })
  .constant("$state.runtime", { autoinject: true })
  .provider('$state', $StateProvider)
  // Inject $state to initialize when entering runtime. #2574
  .run(['$injector', function ($injector) {
    // Allow tests (stateSpec.js) to turn this off by defining this constant
    if ($injector.get("$state.runtime").autoinject) {
      $injector.get('$state');
    }
  }]);


$ViewProvider.$inject = [];
function $ViewProvider() {

  this.$get = $get;
  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {
    return {
      // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
      /**
       * @ngdoc function
       * @name ui.router.state.$view#load
       * @methodOf ui.router.state.$view
       *
       * @description
       *
       * @param {string} name name
       * @param {object} options option object.
       */
      load: function load(name, options) {
        var result, defaults = {
          template: null, controller: null, view: null, locals: null, notify: true, async: true, params: {}
        };
        options = extend(defaults, options);

        if (options.view) {
          result = $templateFactory.fromConfig(options.view, options.params, options.locals);
        }
        return result;
      }
    };
  }
}

angular.module('ui.router.state').provider('$view', $ViewProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScrollProvider
 *
 * @description
 * Provider that returns the {@link ui.router.state.$uiViewScroll} service function.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  /**
   * @ngdoc function
   * @name ui.router.state.$uiViewScrollProvider#useAnchorScroll
   * @methodOf ui.router.state.$uiViewScrollProvider
   *
   * @description
   * Reverts back to using the core [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll) service for
   * scrolling based on the url anchor.
   */
  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  /**
   * @ngdoc object
   * @name ui.router.state.$uiViewScroll
   *
   * @requires $anchorScroll
   * @requires $timeout
   *
   * @description
   * When called with a jqLite element, it scrolls the element into view (after a
   * `$timeout` so the DOM has time to refresh).
   *
   * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
   * this can be enabled by calling {@link ui.router.state.$uiViewScrollProvider#methods_useAnchorScroll `$uiViewScrollProvider.useAnchorScroll()`}.
   */
  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      return $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 * @requires ui.router.state.$uiViewScroll
 * @requires $document
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 *
 * @param {string=} name A view name. The name should be unique amongst the other views in the
 * same state. You can have views of the same name that live in different states.
 *
 * @param {string=} autoscroll It allows you to set the scroll behavior of the browser window
 * when a view is populated. By default, $anchorScroll is overridden by ui-router's custom scroll
 * service, {@link ui.router.state.$uiViewScroll}. This custom service let's you
 * scroll ui-view elements into view when they are populated during a state activation.
 *
 * *Note: To revert back to old [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll)
 * functionality, call `$uiViewScrollProvider.useAnchorScroll()`.*
 *
 * @param {string=} onload Expression to evaluate whenever the view updates.
 *
 * @example
 * A view can be unnamed or named.
 * <pre>
 * <!-- Unnamed -->
 * <div ui-view></div>
 *
 * <!-- Named -->
 * <div ui-view="viewName"></div>
 * </pre>
 *
 * You can only have one unnamed view within any template (or root html). If you are only using a
 * single view and it is unnamed then you can populate it like so:
 * <pre>
 * <div ui-view></div>
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 * </pre>
 *
 * The above is a convenient shortcut equivalent to specifying your view explicitly with the {@link ui.router.state.$stateProvider#methods_state `views`}
 * config property, by name, in this case an empty name:
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 *
 * But typically you'll only use the views property if you name your view or have more than one view
 * in the same template. There's not really a compelling reason to name a view if its the only one,
 * but you could if you wanted, like so:
 * <pre>
 * <div ui-view="main"></div>
 * </pre>
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "main": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 *
 * Really though, you'll use views to set up multiple views:
 * <pre>
 * <div ui-view></div>
 * <div ui-view="chart"></div>
 * <div ui-view="data"></div>
 * </pre>
 *
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     },
 *     "chart": {
 *       template: "<chart_thing/>"
 *     },
 *     "data": {
 *       template: "<data_thing/>"
 *     }
 *   }    
 * })
 * </pre>
 *
 * Examples for `autoscroll`:
 *
 * <pre>
 * <!-- If autoscroll present with no expression,
 *      then scroll ui-view into view -->
 * <ui-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ui-view into view if expression evaluates to true -->
 * <ui-view autoscroll='true'/>
 * <ui-view autoscroll='false'/>
 * <ui-view autoscroll='scopeVariable'/>
 * </pre>
 *
 * Resolve data:
 *
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve` (this
 * can be customized using [[ViewDeclaration.resolveAs]]).  This can be then accessed from the template.
 *
 * Note that when `controllerAs` is being used, `$resolve` is set on the controller instance *after* the
 * controller is instantiated.  The `$onInit()` hook can be used to perform initialization code which
 * depends on `$resolve` data.
 *
 * Example usage of $resolve in a view template
 * <pre>
 * $stateProvider.state('home', {
 *   template: '<my-component user="$resolve.user"></my-component>',
 *   resolve: {
 *     user: function(UserService) { return UserService.fetchUser(); }
 *   }
 * });
 * </pre>
 */
$ViewDirective.$inject = ['$state', '$injector', '$uiViewScroll', '$interpolate', '$q'];
function $ViewDirective(   $state,   $injector,   $uiViewScroll,   $interpolate,   $q) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on which Angular version
  // it should use
  function getRenderer(attrs, scope) {
    var statics = function() {
      return {
        enter: function (element, target, cb) { target.after(element); cb(); },
        leave: function (element, cb) { element.remove(); cb(); }
      };
    };

    if ($animate) {
      return {
        enter: function(element, target, cb) {
          if (angular.version.minor > 2) {
            $animate.enter(element, null, target).then(cb);
          } else {
            $animate.enter(element, null, target, cb);
          }
        },
        leave: function(element, cb) {
          if (angular.version.minor > 2) {
            $animate.leave(element).then(cb);
          } else {
            $animate.leave(element, cb);
          }
        }
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return {
        enter: function(element, target, cb) {animate.enter(element, null, target); cb(); },
        leave: function(element, cb) { animate.leave(element); cb(); }
      };
    }

    return statics();
  }

  var directive = {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    compile: function (tElement, tAttrs, $transclude) {
      return function (scope, $element, attrs) {
        var previousEl, currentEl, currentScope, latestLocals,
            onloadExp     = attrs.onload || '',
            autoScrollExp = attrs.autoscroll,
            renderer      = getRenderer(attrs, scope),
            inherited     = $element.inheritedData('$uiView');

        scope.$on('$stateChangeSuccess', function() {
          updateView(false);
        });

        updateView(true);

        function cleanupLastView() {
          if (previousEl) {
            previousEl.remove();
            previousEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            var $uiViewData = currentEl.data('$uiViewAnim');
            renderer.leave(currentEl, function() {
              $uiViewData.$$animLeave.resolve();
              previousEl = null;
            });

            previousEl = currentEl;
            currentEl = null;
          }
        }

        function updateView(firstTime) {
          var newScope,
              name            = getUiViewName(scope, attrs, $element, $interpolate),
              previousLocals  = name && $state.$current && $state.$current.locals[name];

          if (!firstTime && previousLocals === latestLocals) return; // nothing to do
          newScope = scope.$new();
          latestLocals = $state.$current.locals[name];

          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoading
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description
           *
           * Fired once the view **begins loading**, *before* the DOM is rendered.
           *
           * @param {Object} event Event object.
           * @param {string} viewName Name of the view.
           */
          newScope.$emit('$viewContentLoading', name);

          var clone = $transclude(newScope, function(clone) {
            var animEnter = $q.defer(), animLeave = $q.defer();
            var viewAnimData = {
              $animEnter: animEnter.promise,
              $animLeave: animLeave.promise,
              $$animLeave: animLeave
            };

            clone.data('$uiViewAnim', viewAnimData);
            renderer.enter(clone, $element, function onUiViewEnter() {
              animEnter.resolve();
              if(currentScope) {
                currentScope.$emit('$viewContentAnimationEnded');
              }

              if (angular.isDefined(autoScrollExp) && !autoScrollExp || scope.$eval(autoScrollExp)) {
                $uiViewScroll(clone);
              }
            });
            cleanupLastView();
          });

          currentEl = clone;
          currentScope = newScope;
          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoaded
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param {Object} event Event object.
           * @param {string} viewName Name of the view.
           */
          currentScope.$emit('$viewContentLoaded', name);
          currentScope.$eval(onloadExp);
        }
      };
    }
  };

  return directive;
}

$ViewDirectiveFill.$inject = ['$compile', '$controller', '$state', '$interpolate'];
function $ViewDirectiveFill (  $compile,   $controller,   $state,   $interpolate) {
  return {
    restrict: 'ECA',
    priority: -400,
    compile: function (tElement) {
      var initial = tElement.html();
      if (tElement.empty) {
        tElement.empty();
      } else {
        // ng 1.0.0 doesn't have empty(), which cleans up data and handlers
        tElement[0].innerHTML = null;
      }

      return function (scope, $element, attrs) {
        var current = $state.$current,
            name = getUiViewName(scope, attrs, $element, $interpolate),
            locals  = current && current.locals[name];

        if (! locals) {
          $element.html(initial);
          $compile($element.contents())(scope);
          return;
        }

        $element.data('$uiView', { name: name, state: locals.$$state });
        $element.html(locals.$template ? locals.$template : initial);

        var resolveData = angular.extend({}, locals);
        scope[locals.$$resolveAs] = resolveData;

        var link = $compile($element.contents());

        if (locals.$$controller) {
          locals.$scope = scope;
          locals.$element = $element;
          var controller = $controller(locals.$$controller, locals);
          if (locals.$$controllerAs) {
            scope[locals.$$controllerAs] = controller;
            scope[locals.$$controllerAs][locals.$$resolveAs] = resolveData;
          }
          if (isFunction(controller.$onInit)) controller.$onInit();
          $element.data('$ngControllerController', controller);
          $element.children().data('$ngControllerController', controller);
        }

        link(scope);
      };
    }
  };
}

/**
 * Shared ui-view code for both directives:
 * Given scope, element, and its attributes, return the view's name
 */
function getUiViewName(scope, attrs, element, $interpolate) {
  var name = $interpolate(attrs.uiView || attrs.name || '')(scope);
  var uiViewCreatedBy = element.inheritedData('$uiView');
  return name.indexOf('@') >= 0 ?  name :  (name + '@' + (uiViewCreatedBy ? uiViewCreatedBy.state.name : ''));
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);
angular.module('ui.router.state').directive('uiView', $ViewDirectiveFill);

function parseStateRef(ref, current) {
  var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
  if (preparsed) ref = current + '(' + preparsed[1] + ')';
  parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

function getTypeInfo(el) {
  // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
  var isSvg = Object.prototype.toString.call(el.prop('href')) === '[object SVGAnimatedString]';
  var isForm = el[0].nodeName === "FORM";

  return {
    attr: isForm ? "action" : (isSvg ? 'xlink:href' : 'href'),
    isAnchor: el.prop("tagName").toUpperCase() === "A",
    clickable: !isForm
  };
}

function clickHook(el, $state, $timeout, type, current) {
  return function(e) {
    var button = e.which || e.button, target = current();

    if (!(button > 1 || e.ctrlKey || e.metaKey || e.shiftKey || el.attr('target'))) {
      // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
      var transition = $timeout(function() {
        $state.go(target.state, target.params, target.options);
      });
      e.preventDefault();

      // if the state has no URL, ignore one preventDefault from the <a> directive.
      var ignorePreventDefaultCount = type.isAnchor && !target.href ? 1: 0;

      e.preventDefault = function() {
        if (ignorePreventDefaultCount-- <= 0) $timeout.cancel(transition);
      };
    }
  };
}

function defaultOpts(el, $state) {
  return { relative: stateContext(el) || $state.$current, inherit: true };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated
 * URL, the directive will automatically generate & update the `href` attribute via
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking
 * the link will trigger a state transition with optional parameters.
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the
 * template containing the link.
 *
 * You can specify options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 * using the `ui-sref-opts` attribute. Options are restricted to `location`, `inherit`,
 * and `reload`.
 *
 * @example
 * Here's an example of how you'd use ui-sref and how it would compile. If you have the
 * following template:
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a> | <a ui-sref="{page: 2}">Next page</a>
 *
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *     </li>
 * </ul>
 * </pre>
 *
 * Then the compiled html would be (assuming Html5Mode is off and current state is contacts):
 * <pre>
 * <a href="#/home" ui-sref="home">Home</a> | <a href="#/about" ui-sref="about">About</a> | <a href="#/contacts?page=2" ui-sref="{page: 2}">Next page</a>
 *
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/1" ui-sref="contacts.detail({ id: contact.id })">Joe</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/2" ui-sref="contacts.detail({ id: contact.id })">Alice</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/3" ui-sref="contacts.detail({ id: contact.id })">Bob</a>
 *     </li>
 * </ul>
 *
 * <a ui-sref="home" ui-sref-opts="{reload: true}">Home</a>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-sref-opts options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var ref    = parseStateRef(attrs.uiSref, $state.current.name);
      var def    = { state: ref.state, href: null, params: null };
      var type   = getTypeInfo(element);
      var active = uiSrefActive[1] || uiSrefActive[0];
      var unlinkInfoFn = null;
      var hookFn;

      def.options = extend(defaultOpts(element, $state), attrs.uiSrefOpts ? scope.$eval(attrs.uiSrefOpts) : {});

      var update = function(val) {
        if (val) def.params = angular.copy(val);
        def.href = $state.href(ref.state, def.params, def.options);

        if (unlinkInfoFn) unlinkInfoFn();
        if (active) unlinkInfoFn = active.$$addStateInfo(ref.state, def.params);
        if (def.href !== null) attrs.$set(type.attr, def.href);
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(val) { if (val !== def.params) update(val); }, true);
        def.params = angular.copy(scope.$eval(ref.paramExpr));
      }
      update();

      if (!type.clickable) return;
      hookFn = clickHook(element, $state, $timeout, type, function() { return def; });
      element[element.on ? 'on' : 'bind']("click", hookFn);
      scope.$on('$destroy', function() {
        element[element.off ? 'off' : 'unbind']("click", hookFn);
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-state
 *
 * @requires ui.router.state.uiSref
 *
 * @restrict A
 *
 * @description
 * Much like ui-sref, but will accept named $scope properties to evaluate for a state definition,
 * params and override options.
 *
 * @param {string} ui-state 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-state-params params to pass to {@link ui.router.state.$state#methods_href $state.href()}
 * @param {Object} ui-state-opts options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 */
$StateRefDynamicDirective.$inject = ['$state', '$timeout'];
function $StateRefDynamicDirective($state, $timeout) {
  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var type   = getTypeInfo(element);
      var active = uiSrefActive[1] || uiSrefActive[0];
      var group  = [attrs.uiState, attrs.uiStateParams || null, attrs.uiStateOpts || null];
      var watch  = '[' + group.map(function(val) { return val || 'null'; }).join(', ') + ']';
      var def    = { state: null, params: null, options: null, href: null };
      var unlinkInfoFn = null;
      var hookFn;

      function runStateRefLink (group) {
        def.state = group[0]; def.params = group[1]; def.options = group[2];
        def.href = $state.href(def.state, def.params, def.options);

        if (unlinkInfoFn) unlinkInfoFn();
        if (active) unlinkInfoFn = active.$$addStateInfo(def.state, def.params);
        if (def.href) attrs.$set(type.attr, def.href);
      }

      scope.$watch(watch, runStateRefLink, true);
      runStateRefLink(scope.$eval(watch));

      if (!type.clickable) return;
      hookFn = clickHook(element, $state, $timeout, type, function() { return def; });
      element[element.on ? 'on' : 'bind']("click", hookFn);
      scope.$on('$destroy', function() {
        element[element.off ? 'off' : 'unbind']("click", hookFn);
      });
    }
  };
}


/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * ui-sref-active can live on the same element as ui-sref or on a parent element. The first
 * ui-sref-active found at the same level or above the ui-sref will be used.
 *
 * Will activate when the ui-sref's target state or any child state is active. If you
 * need to activate only when the ui-sref target state is active and *not* any of
 * it's children, then you will use
 * {@link ui.router.state.directive:ui-sref-active-eq ui-sref-active-eq}
 *
 * @example
 * Given the following template:
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item">
 *     <a href ui-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 *
 * When the app state is "app.user" (or any children states), and contains the state parameter "user" with value "bilbobaggins",
 * the resulting HTML will appear as (note the 'active' class):
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * The class name is interpolated **once** during the directives link time (any further changes to the
 * interpolated value are ignored).
 *
 * Multiple classes may be specified in a space-separated format:
 * <pre>
 * <ul>
 *   <li ui-sref-active='class1 class2 class3'>
 *     <a ui-sref="app.user">link</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * It is also possible to pass ui-sref-active an expression that evaluates
 * to an object hash, whose keys represent active class names and whose
 * values represent the respective state names/globs.
 * ui-sref-active will match if the current active state **includes** any of
 * the specified state names/globs, even the abstract ones.
 *
 * @Example
 * Given the following template, with "admin" being an abstract state:
 * <pre>
 * <div ui-sref-active="{'active': 'admin.*'}">
 *   <a ui-sref-active="active" ui-sref="admin.roles">Roles</a>
 * </div>
 * </pre>
 *
 * When the current state is "admin.roles" the "active" class will be applied
 * to both the <div> and <a> elements. It is important to note that the state
 * names/globs passed to ui-sref-active shadow the state provided by ui-sref.
 */

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active-eq
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * The same as {@link ui.router.state.directive:ui-sref-active ui-sref-active} but will only activate
 * when the exact target state used in the `ui-sref` is active; no child states.
 *
 */
$StateRefActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateRefActiveDirective($state, $stateParams, $interpolate) {
  return  {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', '$timeout', function ($scope, $element, $attrs, $timeout) {
      var states = [], activeClasses = {}, activeEqClass, uiSrefActive;

      // There probably isn't much point in $observing this
      // uiSrefActive and uiSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeEqClass = $interpolate($attrs.uiSrefActiveEq || '', false)($scope);

      try {
        uiSrefActive = $scope.$eval($attrs.uiSrefActive);
      } catch (e) {
        // Do nothing. uiSrefActive is not a valid expression.
        // Fall back to using $interpolate below
      }
      uiSrefActive = uiSrefActive || $interpolate($attrs.uiSrefActive || '', false)($scope);
      if (isObject(uiSrefActive)) {
        forEach(uiSrefActive, function(stateOrName, activeClass) {
          if (isString(stateOrName)) {
            var ref = parseStateRef(stateOrName, $state.current.name);
            addState(ref.state, $scope.$eval(ref.paramExpr), activeClass);
          }
        });
      }

      // Allow uiSref to communicate with uiSrefActive[Equals]
      this.$$addStateInfo = function (newState, newParams) {
        // we already got an explicit state provided by ui-sref-active, so we
        // shadow the one that comes from ui-sref
        if (isObject(uiSrefActive) && states.length > 0) {
          return;
        }
        var deregister = addState(newState, newParams, uiSrefActive);
        update();
        return deregister;
      };

      $scope.$on('$stateChangeSuccess', update);

      function addState(stateName, stateParams, activeClass) {
        var state = $state.get(stateName, stateContext($element));
        var stateHash = createStateHash(stateName, stateParams);

        var stateInfo = {
          state: state || { name: stateName },
          params: stateParams,
          hash: stateHash
        };

        states.push(stateInfo);
        activeClasses[stateHash] = activeClass;

        return function removeState() {
          var idx = states.indexOf(stateInfo);
          if (idx !== -1) states.splice(idx, 1);
        };
      }

      /**
       * @param {string} state
       * @param {Object|string} [params]
       * @return {string}
       */
      function createStateHash(state, params) {
        if (!isString(state)) {
          throw new Error('state should be a string');
        }
        if (isObject(params)) {
          return state + toJson(params);
        }
        params = $scope.$eval(params);
        if (isObject(params)) {
          return state + toJson(params);
        }
        return state;
      }

      // Update route state
      function update() {
        for (var i = 0; i < states.length; i++) {
          if (anyMatch(states[i].state, states[i].params)) {
            addClass($element, activeClasses[states[i].hash]);
          } else {
            removeClass($element, activeClasses[states[i].hash]);
          }

          if (exactMatch(states[i].state, states[i].params)) {
            addClass($element, activeEqClass);
          } else {
            removeClass($element, activeEqClass);
          }
        }
      }

      function addClass(el, className) { $timeout(function () { el.addClass(className); }); }
      function removeClass(el, className) { el.removeClass(className); }
      function anyMatch(state, params) { return $state.includes(state.name, params); }
      function exactMatch(state, params) { return $state.is(state.name, params); }

      update();
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateRefActiveDirective)
  .directive('uiSrefActiveEq', $StateRefActiveDirective)
  .directive('uiState', $StateRefDynamicDirective);

/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  var isFilter = function (state, params) {
    return $state.is(state, params);
  };
  isFilter.$stateful = true;
  return isFilter;
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includedByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_includes $state.includes('fullOrPartialStateName')}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  var includesFilter = function (state, params, options) {
    return $state.includes(state, params, options);
  };
  includesFilter.$stateful = true;
  return  includesFilter;
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);
})(window, window.angular);
},{}],2:[function(require,module,exports){
/**
 * oclazyload - Load modules on demand (lazy load) with angularJS
 * @version v1.0.10
 * @link https://github.com/ocombe/ocLazyLoad
 * @license MIT
 * @author Olivier Combe <olivier.combe@gmail.com>
 */
(function (angular, window) {
    'use strict';

    var regModules = ['ng', 'oc.lazyLoad'],
        regInvokes = {},
        regConfigs = [],
        modulesToLoad = [],
        // modules to load from angular.module or other sources
    realModules = [],
        // real modules called from angular.module
    recordDeclarations = [],
        broadcast = angular.noop,
        runBlocks = {},
        justLoaded = [];

    var ocLazyLoad = angular.module('oc.lazyLoad', ['ng']);

    ocLazyLoad.provider('$ocLazyLoad', ["$controllerProvider", "$provide", "$compileProvider", "$filterProvider", "$injector", "$animateProvider", function ($controllerProvider, $provide, $compileProvider, $filterProvider, $injector, $animateProvider) {
        var modules = {},
            providers = {
            $controllerProvider: $controllerProvider,
            $compileProvider: $compileProvider,
            $filterProvider: $filterProvider,
            $provide: $provide, // other things (constant, decorator, provider, factory, service)
            $injector: $injector,
            $animateProvider: $animateProvider
        },
            debug = false,
            events = false,
            moduleCache = [],
            modulePromises = {};

        moduleCache.push = function (value) {
            if (this.indexOf(value) === -1) {
                Array.prototype.push.apply(this, arguments);
            }
        };

        this.config = function (config) {
            // If we want to define modules configs
            if (angular.isDefined(config.modules)) {
                if (angular.isArray(config.modules)) {
                    angular.forEach(config.modules, function (moduleConfig) {
                        modules[moduleConfig.name] = moduleConfig;
                    });
                } else {
                    modules[config.modules.name] = config.modules;
                }
            }

            if (angular.isDefined(config.debug)) {
                debug = config.debug;
            }

            if (angular.isDefined(config.events)) {
                events = config.events;
            }
        };

        /**
         * Get the list of existing registered modules
         * @param element
         */
        this._init = function _init(element) {
            // this is probably useless now because we override angular.bootstrap
            if (modulesToLoad.length === 0) {
                var elements = [element],
                    names = ['ng:app', 'ng-app', 'x-ng-app', 'data-ng-app'],
                    NG_APP_CLASS_REGEXP = /\sng[:\-]app(:\s*([\w\d_]+);?)?\s/,
                    append = function append(elm) {
                    return elm && elements.push(elm);
                };

                angular.forEach(names, function (name) {
                    names[name] = true;
                    append(document.getElementById(name));
                    name = name.replace(':', '\\:');
                    if (typeof element[0] !== 'undefined' && element[0].querySelectorAll) {
                        angular.forEach(element[0].querySelectorAll('.' + name), append);
                        angular.forEach(element[0].querySelectorAll('.' + name + '\\:'), append);
                        angular.forEach(element[0].querySelectorAll('[' + name + ']'), append);
                    }
                });

                angular.forEach(elements, function (elm) {
                    if (modulesToLoad.length === 0) {
                        var className = ' ' + element.className + ' ';
                        var match = NG_APP_CLASS_REGEXP.exec(className);
                        if (match) {
                            modulesToLoad.push((match[2] || '').replace(/\s+/g, ','));
                        } else {
                            angular.forEach(elm.attributes, function (attr) {
                                if (modulesToLoad.length === 0 && names[attr.name]) {
                                    modulesToLoad.push(attr.value);
                                }
                            });
                        }
                    }
                });
            }

            if (modulesToLoad.length === 0 && !((window.jasmine || window.mocha) && angular.isDefined(angular.mock))) {
                console.error('No module found during bootstrap, unable to init ocLazyLoad. You should always use the ng-app directive or angular.boostrap when you use ocLazyLoad.');
            }

            var addReg = function addReg(moduleName) {
                if (regModules.indexOf(moduleName) === -1) {
                    // register existing modules
                    regModules.push(moduleName);
                    var mainModule = angular.module(moduleName);

                    // register existing components (directives, services, ...)
                    _invokeQueue(null, mainModule._invokeQueue, moduleName);
                    _invokeQueue(null, mainModule._configBlocks, moduleName); // angular 1.3+

                    angular.forEach(mainModule.requires, addReg);
                }
            };

            angular.forEach(modulesToLoad, function (moduleName) {
                addReg(moduleName);
            });

            modulesToLoad = []; // reset for next bootstrap
            recordDeclarations.pop(); // wait for the next lazy load
        };

        /**
         * Like JSON.stringify but that doesn't throw on circular references
         * @param obj
         */
        var stringify = function stringify(obj) {
            try {
                return JSON.stringify(obj);
            } catch (e) {
                var cache = [];
                return JSON.stringify(obj, function (key, value) {
                    if (angular.isObject(value) && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Circular reference found, discard key
                            return;
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
                });
            }
        };

        var hashCode = function hashCode(str) {
            var hash = 0,
                i,
                chr,
                len;
            if (str.length == 0) {
                return hash;
            }
            for (i = 0, len = str.length; i < len; i++) {
                chr = str.charCodeAt(i);
                hash = (hash << 5) - hash + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        };

        function _register(providers, registerModules, params) {
            if (registerModules) {
                var k,
                    moduleName,
                    moduleFn,
                    tempRunBlocks = [];
                for (k = registerModules.length - 1; k >= 0; k--) {
                    moduleName = registerModules[k];
                    if (!angular.isString(moduleName)) {
                        moduleName = getModuleName(moduleName);
                    }
                    if (!moduleName || justLoaded.indexOf(moduleName) !== -1 || modules[moduleName] && realModules.indexOf(moduleName) === -1) {
                        continue;
                    }
                    // new if not registered
                    var newModule = regModules.indexOf(moduleName) === -1;
                    moduleFn = ngModuleFct(moduleName);
                    if (newModule) {
                        regModules.push(moduleName);
                        _register(providers, moduleFn.requires, params);
                    }
                    if (moduleFn._runBlocks.length > 0) {
                        // new run blocks detected! Replace the old ones (if existing)
                        runBlocks[moduleName] = [];
                        while (moduleFn._runBlocks.length > 0) {
                            runBlocks[moduleName].push(moduleFn._runBlocks.shift());
                        }
                    }
                    if (angular.isDefined(runBlocks[moduleName]) && (newModule || params.rerun)) {
                        tempRunBlocks = tempRunBlocks.concat(runBlocks[moduleName]);
                    }
                    _invokeQueue(providers, moduleFn._invokeQueue, moduleName, params.reconfig);
                    _invokeQueue(providers, moduleFn._configBlocks, moduleName, params.reconfig); // angular 1.3+
                    broadcast(newModule ? 'ocLazyLoad.moduleLoaded' : 'ocLazyLoad.moduleReloaded', moduleName);
                    registerModules.pop();
                    justLoaded.push(moduleName);
                }
                // execute the run blocks at the end
                var instanceInjector = providers.getInstanceInjector();
                angular.forEach(tempRunBlocks, function (fn) {
                    instanceInjector.invoke(fn);
                });
            }
        }

        function _registerInvokeList(args, moduleName) {
            var invokeList = args[2][0],
                type = args[1],
                newInvoke = false;
            if (angular.isUndefined(regInvokes[moduleName])) {
                regInvokes[moduleName] = {};
            }
            if (angular.isUndefined(regInvokes[moduleName][type])) {
                regInvokes[moduleName][type] = {};
            }
            var onInvoke = function onInvoke(invokeName, invoke) {
                if (!regInvokes[moduleName][type].hasOwnProperty(invokeName)) {
                    regInvokes[moduleName][type][invokeName] = [];
                }
                if (checkHashes(invoke, regInvokes[moduleName][type][invokeName])) {
                    newInvoke = true;
                    regInvokes[moduleName][type][invokeName].push(invoke);
                    broadcast('ocLazyLoad.componentLoaded', [moduleName, type, invokeName]);
                }
            };

            function checkHashes(potentialNew, invokes) {
                var isNew = true,
                    newHash;
                if (invokes.length) {
                    newHash = signature(potentialNew);
                    angular.forEach(invokes, function (invoke) {
                        isNew = isNew && signature(invoke) !== newHash;
                    });
                }
                return isNew;
            }

            function signature(data) {
                if (angular.isArray(data)) {
                    // arrays are objects, we need to test for it first
                    return hashCode(data.toString());
                } else if (angular.isObject(data)) {
                    // constants & values for example
                    return hashCode(stringify(data));
                } else {
                    if (angular.isDefined(data) && data !== null) {
                        return hashCode(data.toString());
                    } else {
                        // null & undefined constants
                        return data;
                    }
                }
            }

            if (angular.isString(invokeList)) {
                onInvoke(invokeList, args[2][1]);
            } else if (angular.isObject(invokeList)) {
                angular.forEach(invokeList, function (invoke, key) {
                    if (angular.isString(invoke)) {
                        // decorators for example
                        onInvoke(invoke, invokeList[1]);
                    } else {
                        // components registered as object lists {"componentName": function() {}}
                        onInvoke(key, invoke);
                    }
                });
            } else {
                return false;
            }
            return newInvoke;
        }

        function _invokeQueue(providers, queue, moduleName, reconfig) {
            if (!queue) {
                return;
            }

            var i, len, args, provider;
            for (i = 0, len = queue.length; i < len; i++) {
                args = queue[i];
                if (angular.isArray(args)) {
                    if (providers !== null) {
                        if (providers.hasOwnProperty(args[0])) {
                            provider = providers[args[0]];
                        } else {
                            throw new Error('unsupported provider ' + args[0]);
                        }
                    }
                    var isNew = _registerInvokeList(args, moduleName);
                    if (args[1] !== 'invoke') {
                        if (isNew && angular.isDefined(provider)) {
                            provider[args[1]].apply(provider, args[2]);
                        }
                    } else {
                        // config block
                        var callInvoke = function callInvoke(fct) {
                            var invoked = regConfigs.indexOf(moduleName + '-' + fct);
                            if (invoked === -1 || reconfig) {
                                if (invoked === -1) {
                                    regConfigs.push(moduleName + '-' + fct);
                                }
                                if (angular.isDefined(provider)) {
                                    provider[args[1]].apply(provider, args[2]);
                                }
                            }
                        };
                        if (angular.isFunction(args[2][0])) {
                            callInvoke(args[2][0]);
                        } else if (angular.isArray(args[2][0])) {
                            for (var j = 0, jlen = args[2][0].length; j < jlen; j++) {
                                if (angular.isFunction(args[2][0][j])) {
                                    callInvoke(args[2][0][j]);
                                }
                            }
                        }
                    }
                }
            }
        }

        function getModuleName(module) {
            var moduleName = null;
            if (angular.isString(module)) {
                moduleName = module;
            } else if (angular.isObject(module) && module.hasOwnProperty('name') && angular.isString(module.name)) {
                moduleName = module.name;
            }
            return moduleName;
        }

        function moduleExists(moduleName) {
            if (!angular.isString(moduleName)) {
                return false;
            }
            try {
                return ngModuleFct(moduleName);
            } catch (e) {
                if (/No module/.test(e) || e.message.indexOf('$injector:nomod') > -1) {
                    return false;
                }
            }
        }

        this.$get = ["$log", "$rootElement", "$rootScope", "$cacheFactory", "$q", function ($log, $rootElement, $rootScope, $cacheFactory, $q) {
            var instanceInjector,
                filesCache = $cacheFactory('ocLazyLoad');

            if (!debug) {
                $log = {};
                $log['error'] = angular.noop;
                $log['warn'] = angular.noop;
                $log['info'] = angular.noop;
            }

            // Make this lazy because when $get() is called the instance injector hasn't been assigned to the rootElement yet
            providers.getInstanceInjector = function () {
                return instanceInjector ? instanceInjector : instanceInjector = $rootElement.data('$injector') || angular.injector();
            };

            broadcast = function broadcast(eventName, params) {
                if (events) {
                    $rootScope.$broadcast(eventName, params);
                }
                if (debug) {
                    $log.info(eventName, params);
                }
            };

            function reject(e) {
                var deferred = $q.defer();
                $log.error(e.message);
                deferred.reject(e);
                return deferred.promise;
            }

            return {
                _broadcast: broadcast,

                _$log: $log,

                /**
                 * Returns the files cache used by the loaders to store the files currently loading
                 * @returns {*}
                 */
                _getFilesCache: function getFilesCache() {
                    return filesCache;
                },

                /**
                 * Let the service know that it should monitor angular.module because files are loading
                 * @param watch boolean
                 */
                toggleWatch: function toggleWatch(watch) {
                    if (watch) {
                        recordDeclarations.push(true);
                    } else {
                        recordDeclarations.pop();
                    }
                },

                /**
                 * Let you get a module config object
                 * @param moduleName String the name of the module
                 * @returns {*}
                 */
                getModuleConfig: function getModuleConfig(moduleName) {
                    if (!angular.isString(moduleName)) {
                        throw new Error('You need to give the name of the module to get');
                    }
                    if (!modules[moduleName]) {
                        return null;
                    }
                    return angular.copy(modules[moduleName]);
                },

                /**
                 * Let you define a module config object
                 * @param moduleConfig Object the module config object
                 * @returns {*}
                 */
                setModuleConfig: function setModuleConfig(moduleConfig) {
                    if (!angular.isObject(moduleConfig)) {
                        throw new Error('You need to give the module config object to set');
                    }
                    modules[moduleConfig.name] = moduleConfig;
                    return moduleConfig;
                },

                /**
                 * Returns the list of loaded modules
                 * @returns {string[]}
                 */
                getModules: function getModules() {
                    return regModules;
                },

                /**
                 * Let you check if a module has been loaded into Angular or not
                 * @param modulesNames String/Object a module name, or a list of module names
                 * @returns {boolean}
                 */
                isLoaded: function isLoaded(modulesNames) {
                    var moduleLoaded = function moduleLoaded(module) {
                        var isLoaded = regModules.indexOf(module) > -1;
                        if (!isLoaded) {
                            isLoaded = !!moduleExists(module);
                        }
                        return isLoaded;
                    };
                    if (angular.isString(modulesNames)) {
                        modulesNames = [modulesNames];
                    }
                    if (angular.isArray(modulesNames)) {
                        var i, len;
                        for (i = 0, len = modulesNames.length; i < len; i++) {
                            if (!moduleLoaded(modulesNames[i])) {
                                return false;
                            }
                        }
                        return true;
                    } else {
                        throw new Error('You need to define the module(s) name(s)');
                    }
                },

                /**
                 * Given a module, return its name
                 * @param module
                 * @returns {String}
                 */
                _getModuleName: getModuleName,

                /**
                 * Returns a module if it exists
                 * @param moduleName
                 * @returns {module}
                 */
                _getModule: function getModule(moduleName) {
                    try {
                        return ngModuleFct(moduleName);
                    } catch (e) {
                        // this error message really suxx
                        if (/No module/.test(e) || e.message.indexOf('$injector:nomod') > -1) {
                            e.message = 'The module "' + stringify(moduleName) + '" that you are trying to load does not exist. ' + e.message;
                        }
                        throw e;
                    }
                },

                /**
                 * Check if a module exists and returns it if it does
                 * @param moduleName
                 * @returns {boolean}
                 */
                moduleExists: moduleExists,

                /**
                 * Load the dependencies, and might try to load new files depending on the config
                 * @param moduleName (String or Array of Strings)
                 * @param localParams
                 * @returns {*}
                 * @private
                 */
                _loadDependencies: function _loadDependencies(moduleName, localParams) {
                    var loadedModule,
                        requires,
                        diff,
                        promisesList = [],
                        self = this;

                    moduleName = self._getModuleName(moduleName);

                    if (moduleName === null) {
                        return $q.when();
                    } else {
                        try {
                            loadedModule = self._getModule(moduleName);
                        } catch (e) {
                            return reject(e);
                        }
                        // get unloaded requires
                        requires = self.getRequires(loadedModule);
                    }

                    angular.forEach(requires, function (requireEntry) {
                        // If no configuration is provided, try and find one from a previous load.
                        // If there isn't one, bail and let the normal flow run
                        if (angular.isString(requireEntry)) {
                            var config = self.getModuleConfig(requireEntry);
                            if (config === null) {
                                moduleCache.push(requireEntry); // We don't know about this module, but something else might, so push it anyway.
                                return;
                            }
                            requireEntry = config;
                            // ignore the name because it's probably not a real module name
                            config.name = undefined;
                        }

                        // Check if this dependency has been loaded previously
                        if (self.moduleExists(requireEntry.name)) {
                            // compare against the already loaded module to see if the new definition adds any new files
                            diff = requireEntry.files.filter(function (n) {
                                return self.getModuleConfig(requireEntry.name).files.indexOf(n) < 0;
                            });

                            // If the module was redefined, advise via the console
                            if (diff.length !== 0) {
                                self._$log.warn('Module "', moduleName, '" attempted to redefine configuration for dependency. "', requireEntry.name, '"\n Additional Files Loaded:', diff);
                            }

                            // Push everything to the file loader, it will weed out the duplicates.
                            if (angular.isDefined(self.filesLoader)) {
                                // if a files loader is defined
                                promisesList.push(self.filesLoader(requireEntry, localParams).then(function () {
                                    return self._loadDependencies(requireEntry);
                                }));
                            } else {
                                return reject(new Error('Error: New dependencies need to be loaded from external files (' + requireEntry.files + '), but no loader has been defined.'));
                            }
                            return;
                        } else if (angular.isArray(requireEntry)) {
                            var files = [];
                            angular.forEach(requireEntry, function (entry) {
                                // let's check if the entry is a file name or a config name
                                var config = self.getModuleConfig(entry);
                                if (config === null) {
                                    files.push(entry);
                                } else if (config.files) {
                                    files = files.concat(config.files);
                                }
                            });
                            if (files.length > 0) {
                                requireEntry = {
                                    files: files
                                };
                            }
                        } else if (angular.isObject(requireEntry)) {
                            if (requireEntry.hasOwnProperty('name') && requireEntry['name']) {
                                // The dependency doesn't exist in the module cache and is a new configuration, so store and push it.
                                self.setModuleConfig(requireEntry);
                                moduleCache.push(requireEntry['name']);
                            }
                        }

                        // Check if the dependency has any files that need to be loaded. If there are, push a new promise to the promise list.
                        if (angular.isDefined(requireEntry.files) && requireEntry.files.length !== 0) {
                            if (angular.isDefined(self.filesLoader)) {
                                // if a files loader is defined
                                promisesList.push(self.filesLoader(requireEntry, localParams).then(function () {
                                    return self._loadDependencies(requireEntry);
                                }));
                            } else {
                                return reject(new Error('Error: the module "' + requireEntry.name + '" is defined in external files (' + requireEntry.files + '), but no loader has been defined.'));
                            }
                        }
                    });

                    // Create a wrapper promise to watch the promise list and resolve it once everything is done.
                    return $q.all(promisesList);
                },

                /**
                 * Inject new modules into Angular
                 * @param moduleName
                 * @param localParams
                 * @param real
                 */
                inject: function inject(moduleName) {
                    var localParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
                    var real = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

                    var self = this,
                        deferred = $q.defer();
                    if (angular.isDefined(moduleName) && moduleName !== null) {
                        if (angular.isArray(moduleName)) {
                            var promisesList = [];
                            angular.forEach(moduleName, function (module) {
                                promisesList.push(self.inject(module, localParams, real));
                            });
                            return $q.all(promisesList);
                        } else {
                            self._addToLoadList(self._getModuleName(moduleName), true, real);
                        }
                    }
                    if (modulesToLoad.length > 0) {
                        var res = modulesToLoad.slice(); // clean copy
                        var loadNext = function loadNext(moduleName) {
                            moduleCache.push(moduleName);
                            modulePromises[moduleName] = deferred.promise;
                            self._loadDependencies(moduleName, localParams).then(function success() {
                                try {
                                    justLoaded = [];
                                    _register(providers, moduleCache, localParams);
                                } catch (e) {
                                    self._$log.error(e.message);
                                    deferred.reject(e);
                                    return;
                                }

                                if (modulesToLoad.length > 0) {
                                    loadNext(modulesToLoad.shift()); // load the next in list
                                } else {
                                        deferred.resolve(res); // everything has been loaded, resolve
                                    }
                            }, function error(err) {
                                deferred.reject(err);
                            });
                        };

                        // load the first in list
                        loadNext(modulesToLoad.shift());
                    } else if (localParams && localParams.name && modulePromises[localParams.name]) {
                        return modulePromises[localParams.name];
                    } else {
                        deferred.resolve();
                    }
                    return deferred.promise;
                },

                /**
                 * Get the list of required modules/services/... for this module
                 * @param module
                 * @returns {Array}
                 */
                getRequires: function getRequires(module) {
                    var requires = [];
                    angular.forEach(module.requires, function (requireModule) {
                        if (regModules.indexOf(requireModule) === -1) {
                            requires.push(requireModule);
                        }
                    });
                    return requires;
                },

                /**
                 * Invoke the new modules & component by their providers
                 * @param providers
                 * @param queue
                 * @param moduleName
                 * @param reconfig
                 * @private
                 */
                _invokeQueue: _invokeQueue,

                /**
                 * Check if a module has been invoked and registers it if not
                 * @param args
                 * @param moduleName
                 * @returns {boolean} is new
                 */
                _registerInvokeList: _registerInvokeList,

                /**
                 * Register a new module and loads it, executing the run/config blocks if needed
                 * @param providers
                 * @param registerModules
                 * @param params
                 * @private
                 */
                _register: _register,

                /**
                 * Add a module name to the list of modules that will be loaded in the next inject
                 * @param name
                 * @param force
                 * @private
                 */
                _addToLoadList: _addToLoadList,

                /**
                 * Unregister modules (you shouldn't have to use this)
                 * @param modules
                 */
                _unregister: function _unregister(modules) {
                    if (angular.isDefined(modules)) {
                        if (angular.isArray(modules)) {
                            angular.forEach(modules, function (module) {
                                regInvokes[module] = undefined;
                            });
                        }
                    }
                }
            };
        }];

        // Let's get the list of loaded modules & components
        this._init(angular.element(window.document));
    }]);

    var bootstrapFct = angular.bootstrap;
    angular.bootstrap = function (element, modules, config) {
        // Clean state from previous bootstrap
        regModules = ['ng', 'oc.lazyLoad'];
        regInvokes = {};
        regConfigs = [];
        modulesToLoad = [];
        realModules = [];
        recordDeclarations = [];
        broadcast = angular.noop;
        runBlocks = {};
        justLoaded = [];
        // we use slice to make a clean copy
        angular.forEach(modules.slice(), function (module) {
            _addToLoadList(module, true, true);
        });
        return bootstrapFct(element, modules, config);
    };

    var _addToLoadList = function _addToLoadList(name, force, real) {
        if ((recordDeclarations.length > 0 || force) && angular.isString(name) && modulesToLoad.indexOf(name) === -1) {
            modulesToLoad.push(name);
            if (real) {
                realModules.push(name);
            }
        }
    };

    var ngModuleFct = angular.module;
    angular.module = function (name, requires, configFn) {
        _addToLoadList(name, false, true);
        return ngModuleFct(name, requires, configFn);
    };

    // CommonJS package manager support:
    if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
        module.exports = 'oc.lazyLoad';
    }
})(angular, window);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').directive('ocLazyLoad', ["$ocLazyLoad", "$compile", "$animate", "$parse", "$timeout", function ($ocLazyLoad, $compile, $animate, $parse, $timeout) {
        return {
            restrict: 'A',
            terminal: true,
            priority: 1000,
            compile: function compile(element, attrs) {
                // we store the content and remove it before compilation
                var content = element[0].innerHTML;
                element.html('');

                return function ($scope, $element, $attr) {
                    var model = $parse($attr.ocLazyLoad);
                    $scope.$watch(function () {
                        return model($scope) || $attr.ocLazyLoad; // it can be a module name (string), an object, an array, or a scope reference to any of this
                    }, function (moduleName) {
                        if (angular.isDefined(moduleName)) {
                            $ocLazyLoad.load(moduleName).then(function () {
                                // Attach element contents to DOM and then compile them.
                                // This prevents an issue where IE invalidates saved element objects (HTMLCollections)
                                // of the compiled contents when attaching to the parent DOM.
                                $animate.enter(content, $element);
                                // get the new content & compile it
                                $compile($element.contents())($scope);
                            });
                        }
                    }, true);
                };
            }
        };
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", "$window", "$interval", function ($delegate, $q, $window, $interval) {
            var uaCssChecked = false,
                useCssLoadPatch = false,
                anchor = $window.document.getElementsByTagName('head')[0] || $window.document.getElementsByTagName('body')[0];

            /**
             * Load a js/css file
             * @param type
             * @param path
             * @param params
             * @returns promise
             */
            $delegate.buildElement = function buildElement(type, path, params) {
                var deferred = $q.defer(),
                    el,
                    loaded,
                    filesCache = $delegate._getFilesCache(),
                    cacheBuster = function cacheBuster(url) {
                    var dc = new Date().getTime();
                    if (url.indexOf('?') >= 0) {
                        if (url.substring(0, url.length - 1) === '&') {
                            return url + '_dc=' + dc;
                        }
                        return url + '&_dc=' + dc;
                    } else {
                        return url + '?_dc=' + dc;
                    }
                };

                // Store the promise early so the file load can be detected by other parallel lazy loads
                // (ie: multiple routes on one page) a 'true' value isn't sufficient
                // as it causes false positive load results.
                if (angular.isUndefined(filesCache.get(path))) {
                    filesCache.put(path, deferred.promise);
                }

                // Switch in case more content types are added later
                switch (type) {
                    case 'css':
                        el = $window.document.createElement('link');
                        el.type = 'text/css';
                        el.rel = 'stylesheet';
                        el.href = params.cache === false ? cacheBuster(path) : path;
                        break;
                    case 'js':
                        el = $window.document.createElement('script');
                        el.src = params.cache === false ? cacheBuster(path) : path;
                        break;
                    default:
                        filesCache.remove(path);
                        deferred.reject(new Error('Requested type "' + type + '" is not known. Could not inject "' + path + '"'));
                        break;
                }
                el.onload = el['onreadystatechange'] = function (e) {
                    if (el['readyState'] && !/^c|loade/.test(el['readyState']) || loaded) return;
                    el.onload = el['onreadystatechange'] = null;
                    loaded = 1;
                    $delegate._broadcast('ocLazyLoad.fileLoaded', path);
                    deferred.resolve(el);
                };
                el.onerror = function () {
                    filesCache.remove(path);
                    deferred.reject(new Error('Unable to load ' + path));
                };
                el.async = params.serie ? 0 : 1;

                var insertBeforeElem = anchor.lastChild;
                if (params.insertBefore) {
                    var element = angular.element(angular.isDefined(window.jQuery) ? params.insertBefore : document.querySelector(params.insertBefore));
                    if (element && element.length > 0) {
                        insertBeforeElem = element[0];
                    }
                }
                insertBeforeElem.parentNode.insertBefore(el, insertBeforeElem);

                /*
                 The event load or readystatechange doesn't fire in:
                 - PhantomJS 1.9 (headless webkit browser)
                 - iOS < 6       (default mobile browser)
                 - Android < 4.4 (default mobile browser)
                 - Safari < 6    (desktop browser)
                 */
                if (type == 'css') {
                    if (!uaCssChecked) {
                        var ua = $window.navigator.userAgent.toLowerCase();

                        if (ua.indexOf('phantomjs/1.9') > -1) {
                            // PhantomJS ~1.9
                            useCssLoadPatch = true;
                        } else if (/iP(hone|od|ad)/.test($window.navigator.platform)) {
                            // iOS < 6
                            var v = $window.navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
                            var iOSVersion = parseFloat([parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)].join('.'));
                            useCssLoadPatch = iOSVersion < 6;
                        } else if (ua.indexOf('android') > -1) {
                            // Android < 4.4
                            var androidVersion = parseFloat(ua.slice(ua.indexOf('android') + 8));
                            useCssLoadPatch = androidVersion < 4.4;
                        } else if (ua.indexOf('safari') > -1) {
                            // Safari < 6
                            var versionMatch = ua.match(/version\/([\.\d]+)/i);
                            useCssLoadPatch = versionMatch && versionMatch[1] && parseFloat(versionMatch[1]) < 6;
                        }
                    }

                    if (useCssLoadPatch) {
                        var tries = 1000; // * 20 = 20000 miliseconds
                        var interval = $interval(function () {
                            try {
                                el.sheet.cssRules;
                                $interval.cancel(interval);
                                el.onload();
                            } catch (e) {
                                if (--tries <= 0) {
                                    el.onerror();
                                }
                            }
                        }, 20);
                    }
                }

                return deferred.promise;
            };

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * The function that loads new files
             * @param config
             * @param params
             * @returns {*}
             */
            $delegate.filesLoader = function filesLoader(config) {
                var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var cssFiles = [],
                    templatesFiles = [],
                    jsFiles = [],
                    promises = [],
                    cachePromise = null,
                    filesCache = $delegate._getFilesCache();

                $delegate.toggleWatch(true); // start watching angular.module calls

                angular.extend(params, config);

                var pushFile = function pushFile(path) {
                    var file_type = null,
                        m;
                    if (angular.isObject(path)) {
                        file_type = path.type;
                        path = path.path;
                    }
                    cachePromise = filesCache.get(path);
                    if (angular.isUndefined(cachePromise) || params.cache === false) {

                        // always check for requirejs syntax just in case
                        if ((m = /^(css|less|html|htm|js)?(?=!)/.exec(path)) !== null) {
                            // Detect file type using preceding type declaration (ala requireJS)
                            file_type = m[1];
                            path = path.substr(m[1].length + 1, path.length); // Strip the type from the path
                        }

                        if (!file_type) {
                            if ((m = /[.](css|less|html|htm|js)?((\?|#).*)?$/.exec(path)) !== null) {
                                // Detect file type via file extension
                                file_type = m[1];
                            } else if (!$delegate.jsLoader.hasOwnProperty('ocLazyLoadLoader') && $delegate.jsLoader.hasOwnProperty('requirejs')) {
                                // requirejs
                                file_type = 'js';
                            } else {
                                $delegate._$log.error('File type could not be determined. ' + path);
                                return;
                            }
                        }

                        if ((file_type === 'css' || file_type === 'less') && cssFiles.indexOf(path) === -1) {
                            cssFiles.push(path);
                        } else if ((file_type === 'html' || file_type === 'htm') && templatesFiles.indexOf(path) === -1) {
                            templatesFiles.push(path);
                        } else if (file_type === 'js' || jsFiles.indexOf(path) === -1) {
                            jsFiles.push(path);
                        } else {
                            $delegate._$log.error('File type is not valid. ' + path);
                        }
                    } else if (cachePromise) {
                        promises.push(cachePromise);
                    }
                };

                if (params.serie) {
                    pushFile(params.files.shift());
                } else {
                    angular.forEach(params.files, function (path) {
                        pushFile(path);
                    });
                }

                if (cssFiles.length > 0) {
                    var cssDeferred = $q.defer();
                    $delegate.cssLoader(cssFiles, function (err) {
                        if (angular.isDefined(err) && $delegate.cssLoader.hasOwnProperty('ocLazyLoadLoader')) {
                            $delegate._$log.error(err);
                            cssDeferred.reject(err);
                        } else {
                            cssDeferred.resolve();
                        }
                    }, params);
                    promises.push(cssDeferred.promise);
                }

                if (templatesFiles.length > 0) {
                    var templatesDeferred = $q.defer();
                    $delegate.templatesLoader(templatesFiles, function (err) {
                        if (angular.isDefined(err) && $delegate.templatesLoader.hasOwnProperty('ocLazyLoadLoader')) {
                            $delegate._$log.error(err);
                            templatesDeferred.reject(err);
                        } else {
                            templatesDeferred.resolve();
                        }
                    }, params);
                    promises.push(templatesDeferred.promise);
                }

                if (jsFiles.length > 0) {
                    var jsDeferred = $q.defer();
                    $delegate.jsLoader(jsFiles, function (err) {
                        if (angular.isDefined(err) && ($delegate.jsLoader.hasOwnProperty("ocLazyLoadLoader") || $delegate.jsLoader.hasOwnProperty("requirejs"))) {
                            $delegate._$log.error(err);
                            jsDeferred.reject(err);
                        } else {
                            jsDeferred.resolve();
                        }
                    }, params);
                    promises.push(jsDeferred.promise);
                }

                if (promises.length === 0) {
                    var deferred = $q.defer(),
                        err = "Error: no file to load has been found, if you're trying to load an existing module you should use the 'inject' method instead of 'load'.";
                    $delegate._$log.error(err);
                    deferred.reject(err);
                    return deferred.promise;
                } else if (params.serie && params.files.length > 0) {
                    return $q.all(promises).then(function () {
                        return $delegate.filesLoader(config, params);
                    });
                } else {
                    return $q.all(promises)['finally'](function (res) {
                        $delegate.toggleWatch(false); // stop watching angular.module calls
                        return res;
                    });
                }
            };

            /**
             * Load a module or a list of modules into Angular
             * @param module Mixed the name of a predefined module config object, or a module config object, or an array of either
             * @param params Object optional parameters
             * @returns promise
             */
            $delegate.load = function (originalModule) {
                var originalParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var self = this,
                    config = null,
                    deferredList = [],
                    deferred = $q.defer(),
                    errText;

                // clean copy
                var module = angular.copy(originalModule);
                var params = angular.copy(originalParams);

                // If module is an array, break it down
                if (angular.isArray(module)) {
                    // Resubmit each entry as a single module
                    angular.forEach(module, function (m) {
                        deferredList.push(self.load(m, params));
                    });

                    // Resolve the promise once everything has loaded
                    $q.all(deferredList).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });

                    return deferred.promise;
                }

                // Get or Set a configuration depending on what was passed in
                if (angular.isString(module)) {
                    config = self.getModuleConfig(module);
                    if (!config) {
                        config = {
                            files: [module]
                        };
                    }
                } else if (angular.isObject(module)) {
                    // case {type: 'js', path: lazyLoadUrl + 'testModule.fakejs'}
                    if (angular.isDefined(module.path) && angular.isDefined(module.type)) {
                        config = {
                            files: [module]
                        };
                    } else {
                        config = self.setModuleConfig(module);
                    }
                }

                if (config === null) {
                    var moduleName = self._getModuleName(module);
                    errText = 'Module "' + (moduleName || 'unknown') + '" is not configured, cannot load.';
                    $delegate._$log.error(errText);
                    deferred.reject(new Error(errText));
                    return deferred.promise;
                } else {
                    // deprecated
                    if (angular.isDefined(config.template)) {
                        if (angular.isUndefined(config.files)) {
                            config.files = [];
                        }
                        if (angular.isString(config.template)) {
                            config.files.push(config.template);
                        } else if (angular.isArray(config.template)) {
                            config.files.concat(config.template);
                        }
                    }
                }

                var localParams = angular.extend({}, params, config);

                // if someone used an external loader and called the load function with just the module name
                if (angular.isUndefined(config.files) && angular.isDefined(config.name) && $delegate.moduleExists(config.name)) {
                    return $delegate.inject(config.name, localParams, true);
                }

                $delegate.filesLoader(config, localParams).then(function () {
                    $delegate.inject(null, localParams).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            };

            // return the patched service
            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * cssLoader function
             * @type Function
             * @param paths array list of css files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters
             * because the user can overwrite cssLoader and it will probably not use promises :(
             */
            $delegate.cssLoader = function (paths, callback, params) {
                var promises = [];
                angular.forEach(paths, function (path) {
                    promises.push($delegate.buildElement('css', path, params));
                });
                $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.cssLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$q", function ($delegate, $q) {
            /**
             * jsLoader function
             * @type Function
             * @param paths array list of js files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters
             * because the user can overwrite jsLoader and it will probably not use promises :(
             */
            $delegate.jsLoader = function (paths, callback, params) {
                var promises = [];
                angular.forEach(paths, function (path) {
                    promises.push($delegate.buildElement('js', path, params));
                });
                $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.jsLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
(function (angular) {
    'use strict';

    angular.module('oc.lazyLoad').config(["$provide", function ($provide) {
        $provide.decorator('$ocLazyLoad', ["$delegate", "$templateCache", "$q", "$http", function ($delegate, $templateCache, $q, $http) {
            /**
             * templatesLoader function
             * @type Function
             * @param paths array list of css files to load
             * @param callback to call when everything is loaded. We use a callback and not a promise
             * @param params object config parameters for $http
             * because the user can overwrite templatesLoader and it will probably not use promises :(
             */
            $delegate.templatesLoader = function (paths, callback, params) {
                var promises = [],
                    filesCache = $delegate._getFilesCache();

                angular.forEach(paths, function (url) {
                    var deferred = $q.defer();
                    promises.push(deferred.promise);
                    $http.get(url, params).then(function (response) {
                        var data = response.data;
                        if (angular.isString(data) && data.length > 0) {
                            angular.forEach(angular.element(data), function (node) {
                                if (node.nodeName === 'SCRIPT' && node.type === 'text/ng-template') {
                                    $templateCache.put(node.id, node.innerHTML);
                                }
                            });
                        }
                        if (angular.isUndefined(filesCache.get(url))) {
                            filesCache.put(url, true);
                        }
                        deferred.resolve();
                    })['catch'](function (response) {
                        deferred.reject(new Error('Unable to load template file "' + url + '": ' + response.data));
                    });
                });
                return $q.all(promises).then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            };
            $delegate.templatesLoader.ocLazyLoadLoader = true;

            return $delegate;
        }]);
    }]);
})(angular);
// Array.indexOf polyfill for IE8
if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement, fromIndex) {
                var k;

                // 1. Let O be the result of calling ToObject passing
                //    the this value as the argument.
                if (this == null) {
                        throw new TypeError('"this" is null or not defined');
                }

                var O = Object(this);

                // 2. Let lenValue be the result of calling the Get
                //    internal method of O with the argument "length".
                // 3. Let len be ToUint32(lenValue).
                var len = O.length >>> 0;

                // 4. If len is 0, return -1.
                if (len === 0) {
                        return -1;
                }

                // 5. If argument fromIndex was passed let n be
                //    ToInteger(fromIndex); else let n be 0.
                var n = +fromIndex || 0;

                if (Math.abs(n) === Infinity) {
                        n = 0;
                }

                // 6. If n >= len, return -1.
                if (n >= len) {
                        return -1;
                }

                // 7. If n >= 0, then Let k be n.
                // 8. Else, n<0, Let k be len - abs(n).
                //    If k is less than 0, then let k be 0.
                k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

                // 9. Repeat, while k < len
                while (k < len) {
                        // a. Let Pk be ToString(k).
                        //   This is implicit for LHS operands of the in operator
                        // b. Let kPresent be the result of calling the
                        //    HasProperty internal method of O with argument Pk.
                        //   This step can be combined with c
                        // c. If kPresent is true, then
                        //    i.  Let elementK be the result of calling the Get
                        //        internal method of O with the argument ToString(k).
                        //   ii.  Let same be the result of applying the
                        //        Strict Equality Comparison Algorithm to
                        //        searchElement and elementK.
                        //  iii.  If same is true, return k.
                        if (k in O && O[k] === searchElement) {
                                return k;
                        }
                        k++;
                }
                return -1;
        };
}
},{}],3:[function(require,module,exports){
require('./angular.min');
module.exports = angular;

},{"./angular.min":4}],4:[function(require,module,exports){
/*
 AngularJS v1.2.25
 (c) 2010-2014 Google, Inc. http://angularjs.org
 License: MIT
*/
(function (W, X, t) {
  'use strict';
  function D(b) {
    return function () {
      var a = arguments[0],
          c,
          a = "[" + (b ? b + ":" : "") + a + "] http://errors.angularjs.org/1.2.25/" + (b ? b + "/" : "") + a;for (c = 1; c < arguments.length; c++) a = a + (1 == c ? "?" : "&") + "p" + (c - 1) + "=" + encodeURIComponent("function" == typeof arguments[c] ? arguments[c].toString().replace(/ \{[\s\S]*$/, "") : "undefined" == typeof arguments[c] ? "undefined" : "string" != typeof arguments[c] ? JSON.stringify(arguments[c]) : arguments[c]);return Error(a);
    };
  }function Pa(b) {
    if (null == b || Ga(b)) return !1;
    var a = b.length;return 1 === b.nodeType && a ? !0 : A(b) || I(b) || 0 === a || "number" === typeof a && 0 < a && a - 1 in b;
  }function r(b, a, c) {
    var d;if (b) if (P(b)) for (d in b) "prototype" == d || "length" == d || "name" == d || b.hasOwnProperty && !b.hasOwnProperty(d) || a.call(c, b[d], d);else if (I(b) || Pa(b)) for (d = 0; d < b.length; d++) a.call(c, b[d], d);else if (b.forEach && b.forEach !== r) b.forEach(a, c);else for (d in b) b.hasOwnProperty(d) && a.call(c, b[d], d);return b;
  }function Zb(b) {
    var a = [],
        c;for (c in b) b.hasOwnProperty(c) && a.push(c);return a.sort();
  }function Tc(b, a, c) {
    for (var d = Zb(b), e = 0; e < d.length; e++) a.call(c, b[d[e]], d[e]);return d;
  }function $b(b) {
    return function (a, c) {
      b(c, a);
    };
  }function hb() {
    for (var b = ma.length, a; b;) {
      b--;a = ma[b].charCodeAt(0);if (57 == a) return ma[b] = "A", ma.join("");if (90 == a) ma[b] = "0";else return ma[b] = String.fromCharCode(a + 1), ma.join("");
    }ma.unshift("0");return ma.join("");
  }function ac(b, a) {
    a ? b.$$hashKey = a : delete b.$$hashKey;
  }function J(b) {
    var a = b.$$hashKey;r(arguments, function (a) {
      a !== b && r(a, function (a, c) {
        b[c] = a;
      });
    });ac(b, a);return b;
  }function U(b) {
    return parseInt(b, 10);
  }function bc(b, a) {
    return J(new (J(function () {}, { prototype: b }))(), a);
  }function F() {}function Qa(b) {
    return b;
  }function ba(b) {
    return function () {
      return b;
    };
  }function y(b) {
    return "undefined" === typeof b;
  }function z(b) {
    return "undefined" !== typeof b;
  }function T(b) {
    return null != b && "object" === typeof b;
  }function A(b) {
    return "string" === typeof b;
  }function ib(b) {
    return "number" === typeof b;
  }function ta(b) {
    return "[object Date]" === za.call(b);
  }function P(b) {
    return "function" === typeof b;
  }function jb(b) {
    return "[object RegExp]" === za.call(b);
  }
  function Ga(b) {
    return b && b.document && b.location && b.alert && b.setInterval;
  }function Uc(b) {
    return !(!b || !(b.nodeName || b.prop && b.attr && b.find));
  }function Vc(b, a, c) {
    var d = [];r(b, function (b, f, g) {
      d.push(a.call(c, b, f, g));
    });return d;
  }function Ra(b, a) {
    if (b.indexOf) return b.indexOf(a);for (var c = 0; c < b.length; c++) if (a === b[c]) return c;return -1;
  }function Sa(b, a) {
    var c = Ra(b, a);0 <= c && b.splice(c, 1);return a;
  }function Ha(b, a, c, d) {
    if (Ga(b) || b && b.$evalAsync && b.$watch) throw Ta("cpws");if (a) {
      if (b === a) throw Ta("cpi");c = c || [];
      d = d || [];if (T(b)) {
        var e = Ra(c, b);if (-1 !== e) return d[e];c.push(b);d.push(a);
      }if (I(b)) for (var f = a.length = 0; f < b.length; f++) e = Ha(b[f], null, c, d), T(b[f]) && (c.push(b[f]), d.push(e)), a.push(e);else {
        var g = a.$$hashKey;I(a) ? a.length = 0 : r(a, function (b, c) {
          delete a[c];
        });for (f in b) e = Ha(b[f], null, c, d), T(b[f]) && (c.push(b[f]), d.push(e)), a[f] = e;ac(a, g);
      }
    } else if (a = b) I(b) ? a = Ha(b, [], c, d) : ta(b) ? a = new Date(b.getTime()) : jb(b) ? (a = RegExp(b.source, b.toString().match(/[^\/]*$/)[0]), a.lastIndex = b.lastIndex) : T(b) && (a = Ha(b, {}, c, d));
    return a;
  }function ha(b, a) {
    if (I(b)) {
      a = a || [];for (var c = 0; c < b.length; c++) a[c] = b[c];
    } else if (T(b)) for (c in a = a || {}, b) !kb.call(b, c) || "$" === c.charAt(0) && "$" === c.charAt(1) || (a[c] = b[c]);return a || b;
  }function Aa(b, a) {
    if (b === a) return !0;if (null === b || null === a) return !1;if (b !== b && a !== a) return !0;var c = typeof b,
        d;if (c == typeof a && "object" == c) if (I(b)) {
      if (!I(a)) return !1;if ((c = b.length) == a.length) {
        for (d = 0; d < c; d++) if (!Aa(b[d], a[d])) return !1;return !0;
      }
    } else {
      if (ta(b)) return ta(a) ? isNaN(b.getTime()) && isNaN(a.getTime()) || b.getTime() === a.getTime() : !1;if (jb(b) && jb(a)) return b.toString() == a.toString();if (b && b.$evalAsync && b.$watch || a && a.$evalAsync && a.$watch || Ga(b) || Ga(a) || I(a)) return !1;c = {};for (d in b) if ("$" !== d.charAt(0) && !P(b[d])) {
        if (!Aa(b[d], a[d])) return !1;c[d] = !0;
      }for (d in a) if (!c.hasOwnProperty(d) && "$" !== d.charAt(0) && a[d] !== t && !P(a[d])) return !1;return !0;
    }return !1;
  }function Bb(b, a) {
    var c = 2 < arguments.length ? Ba.call(arguments, 2) : [];return !P(a) || a instanceof RegExp ? a : c.length ? function () {
      return arguments.length ? a.apply(b, c.concat(Ba.call(arguments, 0))) : a.apply(b, c);
    } : function () {
      return arguments.length ? a.apply(b, arguments) : a.call(b);
    };
  }function Wc(b, a) {
    var c = a;"string" === typeof b && "$" === b.charAt(0) ? c = t : Ga(a) ? c = "$WINDOW" : a && X === a ? c = "$DOCUMENT" : a && a.$evalAsync && a.$watch && (c = "$SCOPE");return c;
  }function na(b, a) {
    return "undefined" === typeof b ? t : JSON.stringify(b, Wc, a ? "  " : null);
  }function cc(b) {
    return A(b) ? JSON.parse(b) : b;
  }function Ua(b) {
    "function" === typeof b ? b = !0 : b && 0 !== b.length ? (b = M("" + b), b = !("f" == b || "0" == b || "false" == b || "no" == b || "n" == b || "[]" == b)) : b = !1;
    return b;
  }function ia(b) {
    b = v(b).clone();try {
      b.empty();
    } catch (a) {}var c = v("<div>").append(b).html();try {
      return 3 === b[0].nodeType ? M(c) : c.match(/^(<[^>]+>)/)[1].replace(/^<([\w\-]+)/, function (a, b) {
        return "<" + M(b);
      });
    } catch (d) {
      return M(c);
    }
  }function dc(b) {
    try {
      return decodeURIComponent(b);
    } catch (a) {}
  }function ec(b) {
    var a = {},
        c,
        d;r((b || "").split("&"), function (b) {
      b && (c = b.replace(/\+/g, "%20").split("="), d = dc(c[0]), z(d) && (b = z(c[1]) ? dc(c[1]) : !0, kb.call(a, d) ? I(a[d]) ? a[d].push(b) : a[d] = [a[d], b] : a[d] = b));
    });return a;
  }function Cb(b) {
    var a = [];r(b, function (b, d) {
      I(b) ? r(b, function (b) {
        a.push(Ca(d, !0) + (!0 === b ? "" : "=" + Ca(b, !0)));
      }) : a.push(Ca(d, !0) + (!0 === b ? "" : "=" + Ca(b, !0)));
    });return a.length ? a.join("&") : "";
  }function lb(b) {
    return Ca(b, !0).replace(/%26/gi, "&").replace(/%3D/gi, "=").replace(/%2B/gi, "+");
  }function Ca(b, a) {
    return encodeURIComponent(b).replace(/%40/gi, "@").replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, a ? "%20" : "+");
  }function Xc(b, a) {
    function c(a) {
      a && d.push(a);
    }var d = [b],
        e,
        f,
        g = ["ng:app", "ng-app", "x-ng-app", "data-ng-app"],
        k = /\sng[:\-]app(:\s*([\w\d_]+);?)?\s/;r(g, function (a) {
      g[a] = !0;c(X.getElementById(a));a = a.replace(":", "\\:");b.querySelectorAll && (r(b.querySelectorAll("." + a), c), r(b.querySelectorAll("." + a + "\\:"), c), r(b.querySelectorAll("[" + a + "]"), c));
    });r(d, function (a) {
      if (!e) {
        var b = k.exec(" " + a.className + " ");b ? (e = a, f = (b[2] || "").replace(/\s+/g, ",")) : r(a.attributes, function (b) {
          !e && g[b.name] && (e = a, f = b.value);
        });
      }
    });e && a(e, f ? [f] : []);
  }function fc(b, a) {
    var c = function () {
      b = v(b);if (b.injector()) {
        var c = b[0] === X ? "document" : ia(b);throw Ta("btstrpd", c.replace(/</, "&lt;").replace(/>/, "&gt;"));
      }a = a || [];a.unshift(["$provide", function (a) {
        a.value("$rootElement", b);
      }]);a.unshift("ng");c = gc(a);c.invoke(["$rootScope", "$rootElement", "$compile", "$injector", "$animate", function (a, b, c, d, e) {
        a.$apply(function () {
          b.data("$injector", d);c(b)(a);
        });
      }]);return c;
    },
        d = /^NG_DEFER_BOOTSTRAP!/;if (W && !d.test(W.name)) return c();W.name = W.name.replace(d, "");Va.resumeBootstrap = function (b) {
      r(b, function (b) {
        a.push(b);
      });c();
    };
  }function mb(b, a) {
    a = a || "_";return b.replace(Yc, function (b, d) {
      return (d ? a : "") + b.toLowerCase();
    });
  }function Db(b, a, c) {
    if (!b) throw Ta("areq", a || "?", c || "required");return b;
  }function Wa(b, a, c) {
    c && I(b) && (b = b[b.length - 1]);Db(P(b), a, "not a function, got " + (b && "object" === typeof b ? b.constructor.name || "Object" : typeof b));return b;
  }function Da(b, a) {
    if ("hasOwnProperty" === b) throw Ta("badname", a);
  }function hc(b, a, c) {
    if (!a) return b;a = a.split(".");for (var d, e = b, f = a.length, g = 0; g < f; g++) d = a[g], b && (b = (e = b)[d]);return !c && P(b) ? Bb(e, b) : b;
  }function Eb(b) {
    var a = b[0];b = b[b.length - 1];if (a === b) return v(a);var c = [a];do {
      a = a.nextSibling;if (!a) break;c.push(a);
    } while (a !== b);return v(c);
  }function Zc(b) {
    var a = D("$injector"),
        c = D("ng");b = b.angular || (b.angular = {});b.$$minErr = b.$$minErr || D;return b.module || (b.module = function () {
      var b = {};return function (e, f, g) {
        if ("hasOwnProperty" === e) throw c("badname", "module");f && b.hasOwnProperty(e) && (b[e] = null);return b[e] || (b[e] = function () {
          function b(a, d, e) {
            return function () {
              c[e || "push"]([a, d, arguments]);return n;
            };
          }if (!f) throw a("nomod", e);var c = [],
              d = [],
              l = b("$injector", "invoke"),
              n = { _invokeQueue: c, _runBlocks: d, requires: f, name: e, provider: b("$provide", "provider"), factory: b("$provide", "factory"), service: b("$provide", "service"), value: b("$provide", "value"), constant: b("$provide", "constant", "unshift"), animation: b("$animateProvider", "register"), filter: b("$filterProvider", "register"), controller: b("$controllerProvider", "register"), directive: b("$compileProvider", "directive"), config: l, run: function (a) {
              d.push(a);return this;
            } };g && l(g);return n;
        }());
      };
    }());
  }
  function $c(b) {
    J(b, { bootstrap: fc, copy: Ha, extend: J, equals: Aa, element: v, forEach: r, injector: gc, noop: F, bind: Bb, toJson: na, fromJson: cc, identity: Qa, isUndefined: y, isDefined: z, isString: A, isFunction: P, isObject: T, isNumber: ib, isElement: Uc, isArray: I, version: ad, isDate: ta, lowercase: M, uppercase: Ia, callbacks: { counter: 0 }, $$minErr: D, $$csp: Xa });Ya = Zc(W);try {
      Ya("ngLocale");
    } catch (a) {
      Ya("ngLocale", []).provider("$locale", bd);
    }Ya("ng", ["ngLocale"], ["$provide", function (a) {
      a.provider({ $$sanitizeUri: cd });a.provider("$compile", ic).directive({ a: dd, input: jc, textarea: jc, form: ed, script: fd, select: gd, style: hd, option: id, ngBind: jd, ngBindHtml: kd, ngBindTemplate: ld, ngClass: md, ngClassEven: nd, ngClassOdd: od, ngCloak: pd, ngController: qd, ngForm: rd, ngHide: sd, ngIf: td, ngInclude: ud, ngInit: vd, ngNonBindable: wd, ngPluralize: xd, ngRepeat: yd, ngShow: zd, ngStyle: Ad, ngSwitch: Bd, ngSwitchWhen: Cd, ngSwitchDefault: Dd, ngOptions: Ed, ngTransclude: Fd, ngModel: Gd, ngList: Hd, ngChange: Id, required: kc, ngRequired: kc, ngValue: Jd }).directive({ ngInclude: Kd }).directive(Fb).directive(lc);
      a.provider({ $anchorScroll: Ld, $animate: Md, $browser: Nd, $cacheFactory: Od, $controller: Pd, $document: Qd, $exceptionHandler: Rd, $filter: mc, $interpolate: Sd, $interval: Td, $http: Ud, $httpBackend: Vd, $location: Wd, $log: Xd, $parse: Yd, $rootScope: Zd, $q: $d, $sce: ae, $sceDelegate: be, $sniffer: ce, $templateCache: de, $timeout: ee, $window: fe, $$rAF: ge, $$asyncCallback: he });
    }]);
  }function Za(b) {
    return b.replace(ie, function (a, b, d, e) {
      return e ? d.toUpperCase() : d;
    }).replace(je, "Moz$1");
  }function Gb(b, a, c, d) {
    function e(b) {
      var e = c && b ? [this.filter(b)] : [this],
          m = a,
          h,
          l,
          n,
          p,
          q,
          s;if (!d || null != b) for (; e.length;) for (h = e.shift(), l = 0, n = h.length; l < n; l++) for (p = v(h[l]), m ? p.triggerHandler("$destroy") : m = !m, q = 0, p = (s = p.children()).length; q < p; q++) e.push(Ea(s[q]));return f.apply(this, arguments);
    }var f = Ea.fn[b],
        f = f.$original || f;e.$original = f;Ea.fn[b] = e;
  }function S(b) {
    if (b instanceof S) return b;A(b) && (b = aa(b));if (!(this instanceof S)) {
      if (A(b) && "<" != b.charAt(0)) throw Hb("nosel");return new S(b);
    }if (A(b)) {
      var a = b;b = X;var c;if (c = ke.exec(a)) b = [b.createElement(c[1])];else {
        var d = b,
            e;b = d.createDocumentFragment();c = [];if (Ib.test(a)) {
          d = b.appendChild(d.createElement("div"));e = (le.exec(a) || ["", ""])[1].toLowerCase();e = ea[e] || ea._default;d.innerHTML = "<div>&#160;</div>" + e[1] + a.replace(me, "<$1></$2>") + e[2];d.removeChild(d.firstChild);for (a = e[0]; a--;) d = d.lastChild;a = 0;for (e = d.childNodes.length; a < e; ++a) c.push(d.childNodes[a]);d = b.firstChild;d.textContent = "";
        } else c.push(d.createTextNode(a));b.textContent = "";b.innerHTML = "";b = c;
      }Jb(this, b);v(X.createDocumentFragment()).append(this);
    } else Jb(this, b);
  }function Kb(b) {
    return b.cloneNode(!0);
  }function Ja(b) {
    Lb(b);var a = 0;for (b = b.childNodes || []; a < b.length; a++) Ja(b[a]);
  }function nc(b, a, c, d) {
    if (z(d)) throw Hb("offargs");var e = oa(b, "events");oa(b, "handle") && (y(a) ? r(e, function (a, c) {
      $a(b, c, a);delete e[c];
    }) : r(a.split(" "), function (a) {
      y(c) ? ($a(b, a, e[a]), delete e[a]) : Sa(e[a] || [], c);
    }));
  }function Lb(b, a) {
    var c = b.ng339,
        d = ab[c];d && (a ? delete ab[c].data[a] : (d.handle && (d.events.$destroy && d.handle({}, "$destroy"), nc(b)), delete ab[c], b.ng339 = t));
  }function oa(b, a, c) {
    var d = b.ng339,
        d = ab[d || -1];if (z(c)) d || (b.ng339 = d = ++ne, d = ab[d] = {}), d[a] = c;else return d && d[a];
  }function Mb(b, a, c) {
    var d = oa(b, "data"),
        e = z(c),
        f = !e && z(a),
        g = f && !T(a);d || g || oa(b, "data", d = {});if (e) d[a] = c;else if (f) {
      if (g) return d && d[a];J(d, a);
    } else return d;
  }function Nb(b, a) {
    return b.getAttribute ? -1 < (" " + (b.getAttribute("class") || "") + " ").replace(/[\n\t]/g, " ").indexOf(" " + a + " ") : !1;
  }function nb(b, a) {
    a && b.setAttribute && r(a.split(" "), function (a) {
      b.setAttribute("class", aa((" " + (b.getAttribute("class") || "") + " ").replace(/[\n\t]/g, " ").replace(" " + aa(a) + " ", " ")));
    });
  }function ob(b, a) {
    if (a && b.setAttribute) {
      var c = (" " + (b.getAttribute("class") || "") + " ").replace(/[\n\t]/g, " ");r(a.split(" "), function (a) {
        a = aa(a);-1 === c.indexOf(" " + a + " ") && (c += a + " ");
      });b.setAttribute("class", aa(c));
    }
  }function Jb(b, a) {
    if (a) {
      a = a.nodeName || !z(a.length) || Ga(a) ? [a] : a;for (var c = 0; c < a.length; c++) b.push(a[c]);
    }
  }function oc(b, a) {
    return pb(b, "$" + (a || "ngController") + "Controller");
  }function pb(b, a, c) {
    9 == b.nodeType && (b = b.documentElement);for (a = I(a) ? a : [a]; b;) {
      for (var d = 0, e = a.length; d < e; d++) if ((c = v.data(b, a[d])) !== t) return c;b = b.parentNode || 11 === b.nodeType && b.host;
    }
  }function pc(b) {
    for (var a = 0, c = b.childNodes; a < c.length; a++) Ja(c[a]);for (; b.firstChild;) b.removeChild(b.firstChild);
  }function qc(b, a) {
    var c = qb[a.toLowerCase()];return c && rc[b.nodeName] && c;
  }function oe(b, a) {
    var c = function (c, e) {
      c.preventDefault || (c.preventDefault = function () {
        c.returnValue = !1;
      });c.stopPropagation || (c.stopPropagation = function () {
        c.cancelBubble = !0;
      });c.target || (c.target = c.srcElement || X);if (y(c.defaultPrevented)) {
        var f = c.preventDefault;c.preventDefault = function () {
          c.defaultPrevented = !0;f.call(c);
        };c.defaultPrevented = !1;
      }c.isDefaultPrevented = function () {
        return c.defaultPrevented || !1 === c.returnValue;
      };var g = ha(a[e || c.type] || []);r(g, function (a) {
        a.call(b, c);
      });8 >= Q ? (c.preventDefault = null, c.stopPropagation = null, c.isDefaultPrevented = null) : (delete c.preventDefault, delete c.stopPropagation, delete c.isDefaultPrevented);
    };c.elem = b;return c;
  }function Ka(b, a) {
    var c = typeof b,
        d;"function" == c || "object" == c && null !== b ? "function" == typeof (d = b.$$hashKey) ? d = b.$$hashKey() : d === t && (d = b.$$hashKey = (a || hb)()) : d = b;return c + ":" + d;
  }function bb(b, a) {
    if (a) {
      var c = 0;this.nextUid = function () {
        return ++c;
      };
    }r(b, this.put, this);
  }function sc(b) {
    var a, c;"function" === typeof b ? (a = b.$inject) || (a = [], b.length && (c = b.toString().replace(pe, ""), c = c.match(qe), r(c[1].split(re), function (b) {
      b.replace(se, function (b, c, d) {
        a.push(d);
      });
    })), b.$inject = a) : I(b) ? (c = b.length - 1, Wa(b[c], "fn"), a = b.slice(0, c)) : Wa(b, "fn", !0);return a;
  }function gc(b) {
    function a(a) {
      return function (b, c) {
        if (T(b)) r(b, $b(a));else return a(b, c);
      };
    }function c(a, b) {
      Da(a, "service");if (P(b) || I(b)) b = n.instantiate(b);if (!b.$get) throw cb("pget", a);return l[a + k] = b;
    }function d(a, b) {
      return c(a, { $get: b });
    }function e(a) {
      var b = [],
          c,
          d,
          f,
          k;r(a, function (a) {
        if (!h.get(a)) {
          h.put(a, !0);try {
            if (A(a)) for (c = Ya(a), b = b.concat(e(c.requires)).concat(c._runBlocks), d = c._invokeQueue, f = 0, k = d.length; f < k; f++) {
              var g = d[f],
                  m = n.get(g[0]);m[g[1]].apply(m, g[2]);
            } else P(a) ? b.push(n.invoke(a)) : I(a) ? b.push(n.invoke(a)) : Wa(a, "module");
          } catch (l) {
            throw I(a) && (a = a[a.length - 1]), l.message && l.stack && -1 == l.stack.indexOf(l.message) && (l = l.message + "\n" + l.stack), cb("modulerr", a, l.stack || l.message || l);
          }
        }
      });return b;
    }function f(a, b) {
      function c(d) {
        if (a.hasOwnProperty(d)) {
          if (a[d] === g) throw cb("cdep", d + " <- " + m.join(" <- "));return a[d];
        }try {
          return m.unshift(d), a[d] = g, a[d] = b(d);
        } catch (e) {
          throw a[d] === g && delete a[d], e;
        } finally {
          m.shift();
        }
      }function d(a, b, e) {
        var f = [],
            k = sc(a),
            g,
            m,
            h;m = 0;for (g = k.length; m < g; m++) {
          h = k[m];if ("string" !== typeof h) throw cb("itkn", h);f.push(e && e.hasOwnProperty(h) ? e[h] : c(h));
        }I(a) && (a = a[g]);return a.apply(b, f);
      }return { invoke: d, instantiate: function (a, b) {
          var c = function () {},
              e;c.prototype = (I(a) ? a[a.length - 1] : a).prototype;c = new c();e = d(a, c, b);return T(e) || P(e) ? e : c;
        }, get: c, annotate: sc, has: function (b) {
          return l.hasOwnProperty(b + k) || a.hasOwnProperty(b);
        } };
    }var g = {},
        k = "Provider",
        m = [],
        h = new bb([], !0),
        l = { $provide: { provider: a(c), factory: a(d), service: a(function (a, b) {
          return d(a, ["$injector", function (a) {
            return a.instantiate(b);
          }]);
        }), value: a(function (a, b) {
          return d(a, ba(b));
        }), constant: a(function (a, b) {
          Da(a, "constant");l[a] = b;p[a] = b;
        }), decorator: function (a, b) {
          var c = n.get(a + k),
              d = c.$get;c.$get = function () {
            var a = q.invoke(d, c);return q.invoke(b, null, { $delegate: a });
          };
        } } },
        n = l.$injector = f(l, function () {
      throw cb("unpr", m.join(" <- "));
    }),
        p = {},
        q = p.$injector = f(p, function (a) {
      a = n.get(a + k);return q.invoke(a.$get, a);
    });r(e(b), function (a) {
      q.invoke(a || F);
    });return q;
  }function Ld() {
    var b = !0;this.disableAutoScrolling = function () {
      b = !1;
    };this.$get = ["$window", "$location", "$rootScope", function (a, c, d) {
      function e(a) {
        var b = null;
        r(a, function (a) {
          b || "a" !== M(a.nodeName) || (b = a);
        });return b;
      }function f() {
        var b = c.hash(),
            d;b ? (d = g.getElementById(b)) ? d.scrollIntoView() : (d = e(g.getElementsByName(b))) ? d.scrollIntoView() : "top" === b && a.scrollTo(0, 0) : a.scrollTo(0, 0);
      }var g = a.document;b && d.$watch(function () {
        return c.hash();
      }, function () {
        d.$evalAsync(f);
      });return f;
    }];
  }function he() {
    this.$get = ["$$rAF", "$timeout", function (b, a) {
      return b.supported ? function (a) {
        return b(a);
      } : function (b) {
        return a(b, 0, !1);
      };
    }];
  }function te(b, a, c, d) {
    function e(a) {
      try {
        a.apply(null, Ba.call(arguments, 1));
      } finally {
        if (s--, 0 === s) for (; E.length;) try {
          E.pop()();
        } catch (b) {
          c.error(b);
        }
      }
    }function f(a, b) {
      (function fa() {
        r(u, function (a) {
          a();
        });B = b(fa, a);
      })();
    }function g() {
      w = null;N != k.url() && (N = k.url(), r(ca, function (a) {
        a(k.url());
      }));
    }var k = this,
        m = a[0],
        h = b.location,
        l = b.history,
        n = b.setTimeout,
        p = b.clearTimeout,
        q = {};k.isMock = !1;var s = 0,
        E = [];k.$$completeOutstandingRequest = e;k.$$incOutstandingRequestCount = function () {
      s++;
    };k.notifyWhenNoOutstandingRequests = function (a) {
      r(u, function (a) {
        a();
      });0 === s ? a() : E.push(a);
    };
    var u = [],
        B;k.addPollFn = function (a) {
      y(B) && f(100, n);u.push(a);return a;
    };var N = h.href,
        R = a.find("base"),
        w = null;k.url = function (a, c) {
      h !== b.location && (h = b.location);l !== b.history && (l = b.history);if (a) {
        if (N != a) return N = a, d.history ? c ? l.replaceState(null, "", a) : (l.pushState(null, "", a), R.attr("href", R.attr("href"))) : (w = a, c ? h.replace(a) : h.href = a), k;
      } else return w || h.href.replace(/%27/g, "'");
    };var ca = [],
        K = !1;k.onUrlChange = function (a) {
      if (!K) {
        if (d.history) v(b).on("popstate", g);if (d.hashchange) v(b).on("hashchange", g);else k.addPollFn(g);K = !0;
      }ca.push(a);return a;
    };k.$$checkUrlChange = g;k.baseHref = function () {
      var a = R.attr("href");return a ? a.replace(/^(https?\:)?\/\/[^\/]*/, "") : "";
    };var O = {},
        da = "",
        C = k.baseHref();k.cookies = function (a, b) {
      var d, e, f, k;if (a) b === t ? m.cookie = escape(a) + "=;path=" + C + ";expires=Thu, 01 Jan 1970 00:00:00 GMT" : A(b) && (d = (m.cookie = escape(a) + "=" + escape(b) + ";path=" + C).length + 1, 4096 < d && c.warn("Cookie '" + a + "' possibly not set or overflowed because it was too large (" + d + " > 4096 bytes)!"));else {
        if (m.cookie !== da) for (da = m.cookie, d = da.split("; "), O = {}, f = 0; f < d.length; f++) e = d[f], k = e.indexOf("="), 0 < k && (a = unescape(e.substring(0, k)), O[a] === t && (O[a] = unescape(e.substring(k + 1))));return O;
      }
    };k.defer = function (a, b) {
      var c;s++;c = n(function () {
        delete q[c];e(a);
      }, b || 0);q[c] = !0;return c;
    };k.defer.cancel = function (a) {
      return q[a] ? (delete q[a], p(a), e(F), !0) : !1;
    };
  }function Nd() {
    this.$get = ["$window", "$log", "$sniffer", "$document", function (b, a, c, d) {
      return new te(b, d, a, c);
    }];
  }function Od() {
    this.$get = function () {
      function b(b, d) {
        function e(a) {
          a != n && (p ? p == a && (p = a.n) : p = a, f(a.n, a.p), f(a, n), n = a, n.n = null);
        }function f(a, b) {
          a != b && (a && (a.p = b), b && (b.n = a));
        }if (b in a) throw D("$cacheFactory")("iid", b);var g = 0,
            k = J({}, d, { id: b }),
            m = {},
            h = d && d.capacity || Number.MAX_VALUE,
            l = {},
            n = null,
            p = null;return a[b] = { put: function (a, b) {
            if (h < Number.MAX_VALUE) {
              var c = l[a] || (l[a] = { key: a });e(c);
            }if (!y(b)) return a in m || g++, m[a] = b, g > h && this.remove(p.key), b;
          }, get: function (a) {
            if (h < Number.MAX_VALUE) {
              var b = l[a];if (!b) return;e(b);
            }return m[a];
          }, remove: function (a) {
            if (h < Number.MAX_VALUE) {
              var b = l[a];if (!b) return;b == n && (n = b.p);b == p && (p = b.n);f(b.n, b.p);delete l[a];
            }delete m[a];g--;
          }, removeAll: function () {
            m = {};g = 0;l = {};n = p = null;
          }, destroy: function () {
            l = k = m = null;delete a[b];
          }, info: function () {
            return J({}, k, { size: g });
          } };
      }var a = {};b.info = function () {
        var b = {};r(a, function (a, e) {
          b[e] = a.info();
        });return b;
      };b.get = function (b) {
        return a[b];
      };return b;
    };
  }function de() {
    this.$get = ["$cacheFactory", function (b) {
      return b("templates");
    }];
  }function ic(b, a) {
    var c = {},
        d = "Directive",
        e = /^\s*directive\:\s*([\d\w_\-]+)\s+(.*)$/,
        f = /(([\d\w_\-]+)(?:\:([^;]+))?;?)/,
        g = /^(on[a-z]+|formaction)$/;this.directive = function m(a, e) {
      Da(a, "directive");A(a) ? (Db(e, "directiveFactory"), c.hasOwnProperty(a) || (c[a] = [], b.factory(a + d, ["$injector", "$exceptionHandler", function (b, d) {
        var e = [];r(c[a], function (c, f) {
          try {
            var g = b.invoke(c);P(g) ? g = { compile: ba(g) } : !g.compile && g.link && (g.compile = ba(g.link));g.priority = g.priority || 0;g.index = f;g.name = g.name || a;g.require = g.require || g.controller && g.name;g.restrict = g.restrict || "A";e.push(g);
          } catch (m) {
            d(m);
          }
        });return e;
      }])), c[a].push(e)) : r(a, $b(m));
      return this;
    };this.aHrefSanitizationWhitelist = function (b) {
      return z(b) ? (a.aHrefSanitizationWhitelist(b), this) : a.aHrefSanitizationWhitelist();
    };this.imgSrcSanitizationWhitelist = function (b) {
      return z(b) ? (a.imgSrcSanitizationWhitelist(b), this) : a.imgSrcSanitizationWhitelist();
    };this.$get = ["$injector", "$interpolate", "$exceptionHandler", "$http", "$templateCache", "$parse", "$controller", "$rootScope", "$document", "$sce", "$animate", "$$sanitizeUri", function (a, b, l, n, p, q, s, E, u, B, N, R) {
      function w(a, b, c, d, e) {
        a instanceof v || (a = v(a));r(a, function (b, c) {
          3 == b.nodeType && b.nodeValue.match(/\S+/) && (a[c] = v(b).wrap("<span></span>").parent()[0]);
        });var f = K(a, b, a, c, d, e);ca(a, "ng-scope");return function (b, c, d, e) {
          Db(b, "scope");var g = c ? La.clone.call(a) : a;r(d, function (a, b) {
            g.data("$" + b + "Controller", a);
          });d = 0;for (var m = g.length; d < m; d++) {
            var h = g[d].nodeType;1 !== h && 9 !== h || g.eq(d).data("$scope", b);
          }c && c(g, b);f && f(b, g, g, e);return g;
        };
      }function ca(a, b) {
        try {
          a.addClass(b);
        } catch (c) {}
      }function K(a, b, c, d, e, f) {
        function g(a, c, d, e) {
          var f, h, l, q, n, p, s;f = c.length;var L = Array(f);for (q = 0; q < f; q++) L[q] = c[q];p = q = 0;for (n = m.length; q < n; p++) h = L[p], c = m[q++], f = m[q++], c ? (c.scope ? (l = a.$new(), v.data(h, "$scope", l)) : l = a, s = c.transcludeOnThisElement ? O(a, c.transclude, e) : !c.templateOnThisElement && e ? e : !e && b ? O(a, b) : null, c(f, l, h, d, s)) : f && f(a, h.childNodes, t, e);
        }for (var m = [], h, l, q, n, p = 0; p < a.length; p++) h = new Ob(), l = da(a[p], [], h, 0 === p ? d : t, e), (f = l.length ? H(l, a[p], h, b, c, null, [], [], f) : null) && f.scope && ca(h.$$element, "ng-scope"), h = f && f.terminal || !(q = a[p].childNodes) || !q.length ? null : K(q, f ? (f.transcludeOnThisElement || !f.templateOnThisElement) && f.transclude : b), m.push(f, h), n = n || f || h, f = null;return n ? g : null;
      }function O(a, b, c) {
        return function (d, e, f) {
          var g = !1;d || (d = a.$new(), g = d.$$transcluded = !0);e = b(d, e, f, c);if (g) e.on("$destroy", function () {
            d.$destroy();
          });return e;
        };
      }function da(a, b, c, d, g) {
        var m = c.$attr,
            h;switch (a.nodeType) {case 1:
            fa(b, pa(Ma(a).toLowerCase()), "E", d, g);for (var l, q, n, p = a.attributes, s = 0, E = p && p.length; s < E; s++) {
              var B = !1,
                  N = !1;l = p[s];if (!Q || 8 <= Q || l.specified) {
                h = l.name;q = aa(l.value);l = pa(h);if (n = U.test(l)) h = mb(l.substr(6), "-");var u = l.replace(/(Start|End)$/, "");l === u + "Start" && (B = h, N = h.substr(0, h.length - 5) + "end", h = h.substr(0, h.length - 6));l = pa(h.toLowerCase());m[l] = h;if (n || !c.hasOwnProperty(l)) c[l] = q, qc(a, l) && (c[l] = !0);S(a, b, q, l);fa(b, l, "A", d, g, B, N);
              }
            }a = a.className;if (A(a) && "" !== a) for (; h = f.exec(a);) l = pa(h[2]), fa(b, l, "C", d, g) && (c[l] = aa(h[3])), a = a.substr(h.index + h[0].length);break;case 3:
            M(b, a.nodeValue);break;case 8:
            try {
              if (h = e.exec(a.nodeValue)) l = pa(h[1]), fa(b, l, "M", d, g) && (c[l] = aa(h[2]));
            } catch (w) {}}b.sort(y);return b;
      }function C(a, b, c) {
        var d = [],
            e = 0;if (b && a.hasAttribute && a.hasAttribute(b)) {
          do {
            if (!a) throw ja("uterdir", b, c);1 == a.nodeType && (a.hasAttribute(b) && e++, a.hasAttribute(c) && e--);d.push(a);a = a.nextSibling;
          } while (0 < e);
        } else d.push(a);return v(d);
      }function x(a, b, c) {
        return function (d, e, f, g, h) {
          e = C(e[0], b, c);return a(d, e, f, g, h);
        };
      }function H(a, c, d, e, f, g, m, n, p) {
        function E(a, b, c, d) {
          if (a) {
            c && (a = x(a, c, d));a.require = G.require;a.directiveName = D;if (K === G || G.$$isolateScope) a = tc(a, { isolateScope: !0 });m.push(a);
          }if (b) {
            c && (b = x(b, c, d));b.require = G.require;b.directiveName = D;if (K === G || G.$$isolateScope) b = tc(b, { isolateScope: !0 });n.push(b);
          }
        }function B(a, b, c, d) {
          var e,
              f = "data",
              g = !1;if (A(b)) {
            for (; "^" == (e = b.charAt(0)) || "?" == e;) b = b.substr(1), "^" == e && (f = "inheritedData"), g = g || "?" == e;e = null;d && "data" === f && (e = d[b]);e = e || c[f]("$" + b + "Controller");if (!e && !g) throw ja("ctreq", b, a);
          } else I(b) && (e = [], r(b, function (b) {
            e.push(B(a, b, c, d));
          }));return e;
        }function N(a, e, f, g, p) {
          function E(a, b) {
            var c;2 > arguments.length && (b = a, a = t);M && (c = da);return p(a, b, c);
          }var u,
              L,
              w,
              O,
              x,
              C,
              da = {},
              rb;u = c === f ? d : ha(d, new Ob(v(f), d.$attr));L = u.$$element;if (K) {
            var Na = /^\s*([@=&])(\??)\s*(\w*)\s*$/;C = e.$new(!0);!H || H !== K && H !== K.$$originalDirective ? L.data("$isolateScopeNoTemplate", C) : L.data("$isolateScope", C);ca(L, "ng-isolate-scope");r(K.scope, function (a, c) {
              var d = a.match(Na) || [],
                  f = d[3] || c,
                  g = "?" == d[2],
                  d = d[1],
                  m,
                  l,
                  n,
                  p;C.$$isolateBindings[c] = d + f;switch (d) {case "@":
                  u.$observe(f, function (a) {
                    C[c] = a;
                  });u.$$observers[f].$$scope = e;u[f] && (C[c] = b(u[f])(e));
                  break;case "=":
                  if (g && !u[f]) break;l = q(u[f]);p = l.literal ? Aa : function (a, b) {
                    return a === b || a !== a && b !== b;
                  };n = l.assign || function () {
                    m = C[c] = l(e);throw ja("nonassign", u[f], K.name);
                  };m = C[c] = l(e);C.$watch(function () {
                    var a = l(e);p(a, C[c]) || (p(a, m) ? n(e, a = C[c]) : C[c] = a);return m = a;
                  }, null, l.literal);break;case "&":
                  l = q(u[f]);C[c] = function (a) {
                    return l(e, a);
                  };break;default:
                  throw ja("iscp", K.name, c, a);}
            });
          }rb = p && E;R && r(R, function (a) {
            var b = { $scope: a === K || a.$$isolateScope ? C : e, $element: L, $attrs: u, $transclude: rb },
                c;x = a.controller;
            "@" == x && (x = u[a.name]);c = s(x, b);da[a.name] = c;M || L.data("$" + a.name + "Controller", c);a.controllerAs && (b.$scope[a.controllerAs] = c);
          });g = 0;for (w = m.length; g < w; g++) try {
            O = m[g], O(O.isolateScope ? C : e, L, u, O.require && B(O.directiveName, O.require, L, da), rb);
          } catch (G) {
            l(G, ia(L));
          }g = e;K && (K.template || null === K.templateUrl) && (g = C);a && a(g, f.childNodes, t, p);for (g = n.length - 1; 0 <= g; g--) try {
            O = n[g], O(O.isolateScope ? C : e, L, u, O.require && B(O.directiveName, O.require, L, da), rb);
          } catch (z) {
            l(z, ia(L));
          }
        }p = p || {};for (var u = -Number.MAX_VALUE, O, R = p.controllerDirectives, K = p.newIsolateScopeDirective, H = p.templateDirective, fa = p.nonTlbTranscludeDirective, y = !1, J = !1, M = p.hasElementTranscludeDirective, Z = d.$$element = v(c), G, D, V, S = e, Q, Fa = 0, qa = a.length; Fa < qa; Fa++) {
          G = a[Fa];var U = G.$$start,
              Y = G.$$end;U && (Z = C(c, U, Y));V = t;if (u > G.priority) break;if (V = G.scope) O = O || G, G.templateUrl || (db("new/isolated scope", K, G, Z), T(V) && (K = G));D = G.name;!G.templateUrl && G.controller && (V = G.controller, R = R || {}, db("'" + D + "' controller", R[D], G, Z), R[D] = G);if (V = G.transclude) y = !0, G.$$tlb || (db("transclusion", fa, G, Z), fa = G), "element" == V ? (M = !0, u = G.priority, V = Z, Z = d.$$element = v(X.createComment(" " + D + ": " + d[D] + " ")), c = Z[0], Na(f, Ba.call(V, 0), c), S = w(V, e, u, g && g.name, { nonTlbTranscludeDirective: fa })) : (V = v(Kb(c)).contents(), Z.empty(), S = w(V, e));if (G.template) if (J = !0, db("template", H, G, Z), H = G, V = P(G.template) ? G.template(Z, d) : G.template, V = W(V), G.replace) {
            g = G;V = Ib.test(V) ? v(aa(V)) : [];c = V[0];if (1 != V.length || 1 !== c.nodeType) throw ja("tplrt", D, "");Na(f, Z, c);qa = { $attr: {} };V = da(c, [], qa);var $ = a.splice(Fa + 1, a.length - (Fa + 1));K && z(V);a = a.concat(V).concat($);F(d, qa);qa = a.length;
          } else Z.html(V);if (G.templateUrl) J = !0, db("template", H, G, Z), H = G, G.replace && (g = G), N = ue(a.splice(Fa, a.length - Fa), Z, d, f, y && S, m, n, { controllerDirectives: R, newIsolateScopeDirective: K, templateDirective: H, nonTlbTranscludeDirective: fa }), qa = a.length;else if (G.compile) try {
            Q = G.compile(Z, d, S), P(Q) ? E(null, Q, U, Y) : Q && E(Q.pre, Q.post, U, Y);
          } catch (ve) {
            l(ve, ia(Z));
          }G.terminal && (N.terminal = !0, u = Math.max(u, G.priority));
        }N.scope = O && !0 === O.scope;N.transcludeOnThisElement = y;N.templateOnThisElement = J;N.transclude = S;p.hasElementTranscludeDirective = M;return N;
      }function z(a) {
        for (var b = 0, c = a.length; b < c; b++) a[b] = bc(a[b], { $$isolateScope: !0 });
      }function fa(b, e, f, g, h, q, n) {
        if (e === h) return null;h = null;if (c.hasOwnProperty(e)) {
          var p;e = a.get(e + d);for (var s = 0, u = e.length; s < u; s++) try {
            p = e[s], (g === t || g > p.priority) && -1 != p.restrict.indexOf(f) && (q && (p = bc(p, { $$start: q, $$end: n })), b.push(p), h = p);
          } catch (E) {
            l(E);
          }
        }return h;
      }function F(a, b) {
        var c = b.$attr,
            d = a.$attr,
            e = a.$$element;r(a, function (d, e) {
          "$" != e.charAt(0) && (b[e] && b[e] !== d && (d += ("style" === e ? ";" : " ") + b[e]), a.$set(e, d, !0, c[e]));
        });r(b, function (b, f) {
          "class" == f ? (ca(e, b), a["class"] = (a["class"] ? a["class"] + " " : "") + b) : "style" == f ? (e.attr("style", e.attr("style") + ";" + b), a.style = (a.style ? a.style + ";" : "") + b) : "$" == f.charAt(0) || a.hasOwnProperty(f) || (a[f] = b, d[f] = c[f]);
        });
      }function ue(a, b, c, d, e, f, g, h) {
        var m = [],
            l,
            q,
            s = b[0],
            u = a.shift(),
            E = J({}, u, { templateUrl: null, transclude: null, replace: null, $$originalDirective: u }),
            N = P(u.templateUrl) ? u.templateUrl(b, c) : u.templateUrl;
        b.empty();n.get(B.getTrustedResourceUrl(N), { cache: p }).success(function (n) {
          var p, B;n = W(n);if (u.replace) {
            n = Ib.test(n) ? v(aa(n)) : [];p = n[0];if (1 != n.length || 1 !== p.nodeType) throw ja("tplrt", u.name, N);n = { $attr: {} };Na(d, b, p);var w = da(p, [], n);T(u.scope) && z(w);a = w.concat(a);F(c, n);
          } else p = s, b.html(n);a.unshift(E);l = H(a, p, c, e, b, u, f, g, h);r(d, function (a, c) {
            a == p && (d[c] = b[0]);
          });for (q = K(b[0].childNodes, e); m.length;) {
            n = m.shift();B = m.shift();var R = m.shift(),
                x = m.shift(),
                w = b[0];if (B !== s) {
              var C = B.className;h.hasElementTranscludeDirective && u.replace || (w = Kb(p));Na(R, v(B), w);ca(v(w), C);
            }B = l.transcludeOnThisElement ? O(n, l.transclude, x) : x;l(q, n, w, d, B);
          }m = null;
        }).error(function (a, b, c, d) {
          throw ja("tpload", d.url);
        });return function (a, b, c, d, e) {
          a = e;m ? (m.push(b), m.push(c), m.push(d), m.push(a)) : (l.transcludeOnThisElement && (a = O(b, l.transclude, e)), l(q, b, c, d, a));
        };
      }function y(a, b) {
        var c = b.priority - a.priority;return 0 !== c ? c : a.name !== b.name ? a.name < b.name ? -1 : 1 : a.index - b.index;
      }function db(a, b, c, d) {
        if (b) throw ja("multidir", b.name, c.name, a, ia(d));
      }function M(a, c) {
        var d = b(c, !0);d && a.push({ priority: 0, compile: function (a) {
            var b = a.parent().length;b && ca(a.parent(), "ng-binding");return function (a, c) {
              var e = c.parent(),
                  f = e.data("$binding") || [];f.push(d);e.data("$binding", f);b || ca(e, "ng-binding");a.$watch(d, function (a) {
                c[0].nodeValue = a;
              });
            };
          } });
      }function D(a, b) {
        if ("srcdoc" == b) return B.HTML;var c = Ma(a);if ("xlinkHref" == b || "FORM" == c && "action" == b || "IMG" != c && ("src" == b || "ngSrc" == b)) return B.RESOURCE_URL;
      }function S(a, c, d, e) {
        var f = b(d, !0);if (f) {
          if ("multiple" === e && "SELECT" === Ma(a)) throw ja("selmulti", ia(a));c.push({ priority: 100, compile: function () {
              return { pre: function (c, d, m) {
                  d = m.$$observers || (m.$$observers = {});if (g.test(e)) throw ja("nodomevents");if (f = b(m[e], !0, D(a, e))) m[e] = f(c), (d[e] || (d[e] = [])).$$inter = !0, (m.$$observers && m.$$observers[e].$$scope || c).$watch(f, function (a, b) {
                    "class" === e && a != b ? m.$updateClass(a, b) : m.$set(e, a);
                  });
                } };
            } });
        }
      }function Na(a, b, c) {
        var d = b[0],
            e = b.length,
            f = d.parentNode,
            g,
            m;if (a) for (g = 0, m = a.length; g < m; g++) if (a[g] == d) {
          a[g++] = c;m = g + e - 1;for (var h = a.length; g < h; g++, m++) m < h ? a[g] = a[m] : delete a[g];a.length -= e - 1;break;
        }f && f.replaceChild(c, d);a = X.createDocumentFragment();a.appendChild(d);c[v.expando] = d[v.expando];d = 1;for (e = b.length; d < e; d++) f = b[d], v(f).remove(), a.appendChild(f), delete b[d];b[0] = c;b.length = 1;
      }function tc(a, b) {
        return J(function () {
          return a.apply(null, arguments);
        }, a, b);
      }var Ob = function (a, b) {
        this.$$element = a;this.$attr = b || {};
      };Ob.prototype = { $normalize: pa, $addClass: function (a) {
          a && 0 < a.length && N.addClass(this.$$element, a);
        }, $removeClass: function (a) {
          a && 0 < a.length && N.removeClass(this.$$element, a);
        }, $updateClass: function (a, b) {
          var c = uc(a, b),
              d = uc(b, a);0 === c.length ? N.removeClass(this.$$element, d) : 0 === d.length ? N.addClass(this.$$element, c) : N.setClass(this.$$element, c, d);
        }, $set: function (a, b, c, d) {
          var e = qc(this.$$element[0], a);e && (this.$$element.prop(a, b), d = e);this[a] = b;d ? this.$attr[a] = d : (d = this.$attr[a]) || (this.$attr[a] = d = mb(a, "-"));e = Ma(this.$$element);if ("A" === e && "href" === a || "IMG" === e && "src" === a) this[a] = b = R(b, "src" === a);!1 !== c && (null === b || b === t ? this.$$element.removeAttr(d) : this.$$element.attr(d, b));(c = this.$$observers) && r(c[a], function (a) {
            try {
              a(b);
            } catch (c) {
              l(c);
            }
          });
        }, $observe: function (a, b) {
          var c = this,
              d = c.$$observers || (c.$$observers = {}),
              e = d[a] || (d[a] = []);e.push(b);E.$evalAsync(function () {
            e.$$inter || b(c[a]);
          });return b;
        } };var qa = b.startSymbol(),
          Z = b.endSymbol(),
          W = "{{" == qa || "}}" == Z ? Qa : function (a) {
        return a.replace(/\{\{/g, qa).replace(/}}/g, Z);
      },
          U = /^ngAttr[A-Z]/;return w;
    }];
  }function pa(b) {
    return Za(b.replace(we, ""));
  }function uc(b, a) {
    var c = "",
        d = b.split(/\s+/),
        e = a.split(/\s+/),
        f = 0;a: for (; f < d.length; f++) {
      for (var g = d[f], k = 0; k < e.length; k++) if (g == e[k]) continue a;c += (0 < c.length ? " " : "") + g;
    }return c;
  }function Pd() {
    var b = {},
        a = /^(\S+)(\s+as\s+(\w+))?$/;this.register = function (a, d) {
      Da(a, "controller");T(a) ? J(b, a) : b[a] = d;
    };this.$get = ["$injector", "$window", function (c, d) {
      return function (e, f) {
        var g, k, m;A(e) && (g = e.match(a), k = g[1], m = g[3], e = b.hasOwnProperty(k) ? b[k] : hc(f.$scope, k, !0) || hc(d, k, !0), Wa(e, k, !0));g = c.instantiate(e, f);if (m) {
          if (!f || "object" !== typeof f.$scope) throw D("$controller")("noscp", k || e.name, m);f.$scope[m] = g;
        }return g;
      };
    }];
  }function Qd() {
    this.$get = ["$window", function (b) {
      return v(b.document);
    }];
  }function Rd() {
    this.$get = ["$log", function (b) {
      return function (a, c) {
        b.error.apply(b, arguments);
      };
    }];
  }function vc(b) {
    var a = {},
        c,
        d,
        e;if (!b) return a;r(b.split("\n"), function (b) {
      e = b.indexOf(":");c = M(aa(b.substr(0, e)));d = aa(b.substr(e + 1));c && (a[c] = a[c] ? a[c] + ", " + d : d);
    });return a;
  }function wc(b) {
    var a = T(b) ? b : t;return function (c) {
      a || (a = vc(b));return c ? a[M(c)] || null : a;
    };
  }function xc(b, a, c) {
    if (P(c)) return c(b, a);r(c, function (c) {
      b = c(b, a);
    });return b;
  }function Ud() {
    var b = /^\s*(\[|\{[^\{])/,
        a = /[\}\]]\s*$/,
        c = /^\)\]\}',?\n/,
        d = { "Content-Type": "application/json;charset=utf-8" },
        e = this.defaults = { transformResponse: [function (d) {
        A(d) && (d = d.replace(c, ""), b.test(d) && a.test(d) && (d = cc(d)));return d;
      }], transformRequest: [function (a) {
        return T(a) && "[object File]" !== za.call(a) && "[object Blob]" !== za.call(a) ? na(a) : a;
      }], headers: { common: { Accept: "application/json, text/plain, */*" }, post: ha(d), put: ha(d), patch: ha(d) }, xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN" },
        f = this.interceptors = [],
        g = this.responseInterceptors = [];this.$get = ["$httpBackend", "$browser", "$cacheFactory", "$rootScope", "$q", "$injector", function (a, b, c, d, n, p) {
      function q(a) {
        function b(a) {
          var d = J({}, a, { data: xc(a.data, a.headers, c.transformResponse) });return 200 <= a.status && 300 > a.status ? d : n.reject(d);
        }var c = { method: "get", transformRequest: e.transformRequest, transformResponse: e.transformResponse },
            d = function (a) {
          var b = e.headers,
              c = J({}, a.headers),
              d,
              f,
              b = J({}, b.common, b[M(a.method)]);
          a: for (d in b) {
            a = M(d);for (f in c) if (M(f) === a) continue a;c[d] = b[d];
          }(function (a) {
            var b;r(a, function (c, d) {
              P(c) && (b = c(), null != b ? a[d] = b : delete a[d]);
            });
          })(c);return c;
        }(a);J(c, a);c.headers = d;c.method = Ia(c.method);var f = [function (a) {
          d = a.headers;var c = xc(a.data, wc(d), a.transformRequest);y(c) && r(d, function (a, b) {
            "content-type" === M(b) && delete d[b];
          });y(a.withCredentials) && !y(e.withCredentials) && (a.withCredentials = e.withCredentials);return s(a, c, d).then(b, b);
        }, t],
            g = n.when(c);for (r(B, function (a) {
          (a.request || a.requestError) && f.unshift(a.request, a.requestError);(a.response || a.responseError) && f.push(a.response, a.responseError);
        }); f.length;) {
          a = f.shift();var m = f.shift(),
              g = g.then(a, m);
        }g.success = function (a) {
          g.then(function (b) {
            a(b.data, b.status, b.headers, c);
          });return g;
        };g.error = function (a) {
          g.then(null, function (b) {
            a(b.data, b.status, b.headers, c);
          });return g;
        };return g;
      }function s(c, f, g) {
        function h(a, b, c, e) {
          x && (200 <= a && 300 > a ? x.put(v, [a, b, vc(c), e]) : x.remove(v));p(b, a, c, e);d.$$phase || d.$apply();
        }function p(a, b, d, e) {
          b = Math.max(b, 0);(200 <= b && 300 > b ? B.resolve : B.reject)({ data: a, status: b, headers: wc(d), config: c, statusText: e });
        }function s() {
          var a = Ra(q.pendingRequests, c);-1 !== a && q.pendingRequests.splice(a, 1);
        }var B = n.defer(),
            r = B.promise,
            x,
            H,
            v = E(c.url, c.params);q.pendingRequests.push(c);r.then(s, s);!c.cache && !e.cache || !1 === c.cache || "GET" !== c.method && "JSONP" !== c.method || (x = T(c.cache) ? c.cache : T(e.cache) ? e.cache : u);if (x) if (H = x.get(v), z(H)) {
          if (H && P(H.then)) return H.then(s, s), H;I(H) ? p(H[1], H[0], ha(H[2]), H[3]) : p(H, 200, {}, "OK");
        } else x.put(v, r);y(H) && ((H = Pb(c.url) ? b.cookies()[c.xsrfCookieName || e.xsrfCookieName] : t) && (g[c.xsrfHeaderName || e.xsrfHeaderName] = H), a(c.method, v, f, h, g, c.timeout, c.withCredentials, c.responseType));return r;
      }function E(a, b) {
        if (!b) return a;var c = [];Tc(b, function (a, b) {
          null === a || y(a) || (I(a) || (a = [a]), r(a, function (a) {
            T(a) && (a = ta(a) ? a.toISOString() : na(a));c.push(Ca(b) + "=" + Ca(a));
          }));
        });0 < c.length && (a += (-1 == a.indexOf("?") ? "?" : "&") + c.join("&"));return a;
      }var u = c("$http"),
          B = [];r(f, function (a) {
        B.unshift(A(a) ? p.get(a) : p.invoke(a));
      });r(g, function (a, b) {
        var c = A(a) ? p.get(a) : p.invoke(a);B.splice(b, 0, { response: function (a) {
            return c(n.when(a));
          }, responseError: function (a) {
            return c(n.reject(a));
          } });
      });q.pendingRequests = [];(function (a) {
        r(arguments, function (a) {
          q[a] = function (b, c) {
            return q(J(c || {}, { method: a, url: b }));
          };
        });
      })("get", "delete", "head", "jsonp");(function (a) {
        r(arguments, function (a) {
          q[a] = function (b, c, d) {
            return q(J(d || {}, { method: a, url: b, data: c }));
          };
        });
      })("post", "put");q.defaults = e;return q;
    }];
  }function xe(b) {
    if (8 >= Q && (!b.match(/^(get|post|head|put|delete|options)$/i) || !W.XMLHttpRequest)) return new W.ActiveXObject("Microsoft.XMLHTTP");if (W.XMLHttpRequest) return new W.XMLHttpRequest();throw D("$httpBackend")("noxhr");
  }function Vd() {
    this.$get = ["$browser", "$window", "$document", function (b, a, c) {
      return ye(b, xe, b.defer, a.angular.callbacks, c[0]);
    }];
  }function ye(b, a, c, d, e) {
    function f(a, b, c) {
      var f = e.createElement("script"),
          g = null;f.type = "text/javascript";f.src = a;f.async = !0;g = function (a) {
        $a(f, "load", g);$a(f, "error", g);e.body.removeChild(f);f = null;var k = -1,
            s = "unknown";a && ("load" !== a.type || d[b].called || (a = { type: "error" }), s = a.type, k = "error" === a.type ? 404 : 200);c && c(k, s);
      };sb(f, "load", g);sb(f, "error", g);8 >= Q && (f.onreadystatechange = function () {
        A(f.readyState) && /loaded|complete/.test(f.readyState) && (f.onreadystatechange = null, g({ type: "load" }));
      });e.body.appendChild(f);return g;
    }var g = -1;return function (e, m, h, l, n, p, q, s) {
      function E() {
        B = g;R && R();w && w.abort();
      }function u(a, d, e, f, g) {
        K && c.cancel(K);R = w = null;0 === d && (d = e ? 200 : "file" == ua(m).protocol ? 404 : 0);a(1223 === d ? 204 : d, e, f, g || "");b.$$completeOutstandingRequest(F);
      }
      var B;b.$$incOutstandingRequestCount();m = m || b.url();if ("jsonp" == M(e)) {
        var N = "_" + (d.counter++).toString(36);d[N] = function (a) {
          d[N].data = a;d[N].called = !0;
        };var R = f(m.replace("JSON_CALLBACK", "angular.callbacks." + N), N, function (a, b) {
          u(l, a, d[N].data, "", b);d[N] = F;
        });
      } else {
        var w = a(e);w.open(e, m, !0);r(n, function (a, b) {
          z(a) && w.setRequestHeader(b, a);
        });w.onreadystatechange = function () {
          if (w && 4 == w.readyState) {
            var a = null,
                b = null,
                c = "";B !== g && (a = w.getAllResponseHeaders(), b = "response" in w ? w.response : w.responseText);B === g && 10 > Q || (c = w.statusText);u(l, B || w.status, b, a, c);
          }
        };q && (w.withCredentials = !0);if (s) try {
          w.responseType = s;
        } catch (ca) {
          if ("json" !== s) throw ca;
        }w.send(h || null);
      }if (0 < p) var K = c(E, p);else p && P(p.then) && p.then(E);
    };
  }function Sd() {
    var b = "{{",
        a = "}}";this.startSymbol = function (a) {
      return a ? (b = a, this) : b;
    };this.endSymbol = function (b) {
      return b ? (a = b, this) : a;
    };this.$get = ["$parse", "$exceptionHandler", "$sce", function (c, d, e) {
      function f(f, h, l) {
        for (var n, p, q = 0, s = [], E = f.length, u = !1, B = []; q < E;) -1 != (n = f.indexOf(b, q)) && -1 != (p = f.indexOf(a, n + g)) ? (q != n && s.push(f.substring(q, n)), s.push(q = c(u = f.substring(n + g, p))), q.exp = u, q = p + k, u = !0) : (q != E && s.push(f.substring(q)), q = E);(E = s.length) || (s.push(""), E = 1);if (l && 1 < s.length) throw yc("noconcat", f);if (!h || u) return B.length = E, q = function (a) {
          try {
            for (var b = 0, c = E, g; b < c; b++) {
              if ("function" == typeof (g = s[b])) if (g = g(a), g = l ? e.getTrusted(l, g) : e.valueOf(g), null == g) g = "";else switch (typeof g) {case "string":
                  break;case "number":
                  g = "" + g;break;default:
                  g = na(g);}B[b] = g;
            }return B.join("");
          } catch (k) {
            a = yc("interr", f, k.toString()), d(a);
          }
        }, q.exp = f, q.parts = s, q;
      }var g = b.length,
          k = a.length;f.startSymbol = function () {
        return b;
      };f.endSymbol = function () {
        return a;
      };return f;
    }];
  }function Td() {
    this.$get = ["$rootScope", "$window", "$q", function (b, a, c) {
      function d(d, g, k, m) {
        var h = a.setInterval,
            l = a.clearInterval,
            n = c.defer(),
            p = n.promise,
            q = 0,
            s = z(m) && !m;k = z(k) ? k : 0;p.then(null, null, d);p.$$intervalId = h(function () {
          n.notify(q++);0 < k && q >= k && (n.resolve(q), l(p.$$intervalId), delete e[p.$$intervalId]);s || b.$apply();
        }, g);e[p.$$intervalId] = n;return p;
      }var e = {};d.cancel = function (b) {
        return b && b.$$intervalId in e ? (e[b.$$intervalId].reject("canceled"), a.clearInterval(b.$$intervalId), delete e[b.$$intervalId], !0) : !1;
      };return d;
    }];
  }function bd() {
    this.$get = function () {
      return { id: "en-us", NUMBER_FORMATS: { DECIMAL_SEP: ".", GROUP_SEP: ",", PATTERNS: [{ minInt: 1, minFrac: 0, maxFrac: 3, posPre: "", posSuf: "", negPre: "-", negSuf: "", gSize: 3, lgSize: 3 }, { minInt: 1, minFrac: 2, maxFrac: 2, posPre: "\u00a4", posSuf: "", negPre: "(\u00a4", negSuf: ")", gSize: 3, lgSize: 3 }], CURRENCY_SYM: "$" }, DATETIME_FORMATS: { MONTH: "January February March April May June July August September October November December".split(" "),
          SHORTMONTH: "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "), DAY: "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "), SHORTDAY: "Sun Mon Tue Wed Thu Fri Sat".split(" "), AMPMS: ["AM", "PM"], medium: "MMM d, y h:mm:ss a", "short": "M/d/yy h:mm a", fullDate: "EEEE, MMMM d, y", longDate: "MMMM d, y", mediumDate: "MMM d, y", shortDate: "M/d/yy", mediumTime: "h:mm:ss a", shortTime: "h:mm a" }, pluralCat: function (b) {
          return 1 === b ? "one" : "other";
        } };
    };
  }function Qb(b) {
    b = b.split("/");for (var a = b.length; a--;) b[a] = lb(b[a]);return b.join("/");
  }function zc(b, a, c) {
    b = ua(b, c);a.$$protocol = b.protocol;a.$$host = b.hostname;a.$$port = U(b.port) || ze[b.protocol] || null;
  }function Ac(b, a, c) {
    var d = "/" !== b.charAt(0);d && (b = "/" + b);b = ua(b, c);a.$$path = decodeURIComponent(d && "/" === b.pathname.charAt(0) ? b.pathname.substring(1) : b.pathname);a.$$search = ec(b.search);a.$$hash = decodeURIComponent(b.hash);a.$$path && "/" != a.$$path.charAt(0) && (a.$$path = "/" + a.$$path);
  }function ra(b, a) {
    if (0 === a.indexOf(b)) return a.substr(b.length);
  }function eb(b) {
    var a = b.indexOf("#");return -1 == a ? b : b.substr(0, a);
  }function Rb(b) {
    return b.substr(0, eb(b).lastIndexOf("/") + 1);
  }function Bc(b, a) {
    this.$$html5 = !0;a = a || "";var c = Rb(b);zc(b, this, b);this.$$parse = function (a) {
      var e = ra(c, a);if (!A(e)) throw Sb("ipthprfx", a, c);Ac(e, this, b);this.$$path || (this.$$path = "/");this.$$compose();
    };this.$$compose = function () {
      var a = Cb(this.$$search),
          b = this.$$hash ? "#" + lb(this.$$hash) : "";this.$$url = Qb(this.$$path) + (a ? "?" + a : "") + b;this.$$absUrl = c + this.$$url.substr(1);
    };this.$$rewrite = function (d) {
      var e;
      if ((e = ra(b, d)) !== t) return d = e, (e = ra(a, e)) !== t ? c + (ra("/", e) || e) : b + d;if ((e = ra(c, d)) !== t) return c + e;if (c == d + "/") return c;
    };
  }function Tb(b, a) {
    var c = Rb(b);zc(b, this, b);this.$$parse = function (d) {
      var e = ra(b, d) || ra(c, d),
          e = "#" == e.charAt(0) ? ra(a, e) : this.$$html5 ? e : "";if (!A(e)) throw Sb("ihshprfx", d, a);Ac(e, this, b);d = this.$$path;var f = /^\/[A-Z]:(\/.*)/;0 === e.indexOf(b) && (e = e.replace(b, ""));f.exec(e) || (d = (e = f.exec(d)) ? e[1] : d);this.$$path = d;this.$$compose();
    };this.$$compose = function () {
      var c = Cb(this.$$search),
          e = this.$$hash ? "#" + lb(this.$$hash) : "";this.$$url = Qb(this.$$path) + (c ? "?" + c : "") + e;this.$$absUrl = b + (this.$$url ? a + this.$$url : "");
    };this.$$rewrite = function (a) {
      if (eb(b) == eb(a)) return a;
    };
  }function Ub(b, a) {
    this.$$html5 = !0;Tb.apply(this, arguments);var c = Rb(b);this.$$rewrite = function (d) {
      var e;if (b == eb(d)) return d;if (e = ra(c, d)) return b + a + e;if (c === d + "/") return c;
    };this.$$compose = function () {
      var c = Cb(this.$$search),
          e = this.$$hash ? "#" + lb(this.$$hash) : "";this.$$url = Qb(this.$$path) + (c ? "?" + c : "") + e;this.$$absUrl = b + a + this.$$url;
    };
  }function tb(b) {
    return function () {
      return this[b];
    };
  }
  function Cc(b, a) {
    return function (c) {
      if (y(c)) return this[b];this[b] = a(c);this.$$compose();return this;
    };
  }function Wd() {
    var b = "",
        a = !1;this.hashPrefix = function (a) {
      return z(a) ? (b = a, this) : b;
    };this.html5Mode = function (b) {
      return z(b) ? (a = b, this) : a;
    };this.$get = ["$rootScope", "$browser", "$sniffer", "$rootElement", function (c, d, e, f) {
      function g(a) {
        c.$broadcast("$locationChangeSuccess", k.absUrl(), a);
      }var k,
          m,
          h = d.baseHref(),
          l = d.url(),
          n;a ? (n = l.substring(0, l.indexOf("/", l.indexOf("//") + 2)) + (h || "/"), m = e.history ? Bc : Ub) : (n = eb(l), m = Tb);k = new m(n, "#" + b);k.$$parse(k.$$rewrite(l));var p = /^\s*(javascript|mailto):/i;f.on("click", function (a) {
        if (!a.ctrlKey && !a.metaKey && 2 != a.which) {
          for (var e = v(a.target); "a" !== M(e[0].nodeName);) if (e[0] === f[0] || !(e = e.parent())[0]) return;var g = e.prop("href");T(g) && "[object SVGAnimatedString]" === g.toString() && (g = ua(g.animVal).href);if (!p.test(g)) {
            if (m === Ub) {
              var h = e.attr("href") || e.attr("xlink:href");if (h && 0 > h.indexOf("://")) if (g = "#" + b, "/" == h[0]) g = n + g + h;else if ("#" == h[0]) g = n + g + (k.path() || "/") + h;else {
                var l = k.path().split("/"),
                    h = h.split("/");2 !== l.length || l[1] || (l.length = 1);for (var q = 0; q < h.length; q++) "." != h[q] && (".." == h[q] ? l.pop() : h[q].length && l.push(h[q]));g = n + g + l.join("/");
              }
            }l = k.$$rewrite(g);g && !e.attr("target") && l && !a.isDefaultPrevented() && (a.preventDefault(), l != d.url() && (k.$$parse(l), c.$apply(), W.angular["ff-684208-preventDefault"] = !0));
          }
        }
      });k.absUrl() != l && d.url(k.absUrl(), !0);d.onUrlChange(function (a) {
        k.absUrl() != a && (c.$evalAsync(function () {
          var b = k.absUrl();k.$$parse(a);c.$broadcast("$locationChangeStart", a, b).defaultPrevented ? (k.$$parse(b), d.url(b)) : g(b);
        }), c.$$phase || c.$digest());
      });var q = 0;c.$watch(function () {
        var a = d.url(),
            b = k.$$replace;q && a == k.absUrl() || (q++, c.$evalAsync(function () {
          c.$broadcast("$locationChangeStart", k.absUrl(), a).defaultPrevented ? k.$$parse(a) : (d.url(k.absUrl(), b), g(a));
        }));k.$$replace = !1;return q;
      });return k;
    }];
  }function Xd() {
    var b = !0,
        a = this;this.debugEnabled = function (a) {
      return z(a) ? (b = a, this) : b;
    };this.$get = ["$window", function (c) {
      function d(a) {
        a instanceof Error && (a.stack ? a = a.message && -1 === a.stack.indexOf(a.message) ? "Error: " + a.message + "\n" + a.stack : a.stack : a.sourceURL && (a = a.message + "\n" + a.sourceURL + ":" + a.line));return a;
      }function e(a) {
        var b = c.console || {},
            e = b[a] || b.log || F;a = !1;try {
          a = !!e.apply;
        } catch (m) {}return a ? function () {
          var a = [];r(arguments, function (b) {
            a.push(d(b));
          });return e.apply(b, a);
        } : function (a, b) {
          e(a, null == b ? "" : b);
        };
      }return { log: e("log"), info: e("info"), warn: e("warn"), error: e("error"), debug: function () {
          var c = e("debug");return function () {
            b && c.apply(a, arguments);
          };
        }() };
    }];
  }function ka(b, a) {
    if ("__defineGetter__" === b || "__defineSetter__" === b || "__lookupGetter__" === b || "__lookupSetter__" === b || "__proto__" === b) throw la("isecfld", a);return b;
  }function va(b, a) {
    if (b) {
      if (b.constructor === b) throw la("isecfn", a);if (b.document && b.location && b.alert && b.setInterval) throw la("isecwindow", a);if (b.children && (b.nodeName || b.prop && b.attr && b.find)) throw la("isecdom", a);if (b === Object) throw la("isecobj", a);
    }return b;
  }function ub(b, a, c, d, e) {
    va(b, d);e = e || {};a = a.split(".");for (var f, g = 0; 1 < a.length; g++) {
      f = ka(a.shift(), d);var k = va(b[f], d);k || (k = {}, b[f] = k);b = k;b.then && e.unwrapPromises && (wa(d), "$$v" in b || function (a) {
        a.then(function (b) {
          a.$$v = b;
        });
      }(b), b.$$v === t && (b.$$v = {}), b = b.$$v);
    }f = ka(a.shift(), d);va(b[f], d);return b[f] = c;
  }function Dc(b, a, c, d, e, f, g) {
    ka(b, f);ka(a, f);ka(c, f);ka(d, f);ka(e, f);return g.unwrapPromises ? function (g, m) {
      var h = m && m.hasOwnProperty(b) ? m : g,
          l;if (null == h) return h;(h = h[b]) && h.then && (wa(f), "$$v" in h || (l = h, l.$$v = t, l.then(function (a) {
        l.$$v = a;
      })), h = h.$$v);if (!a) return h;if (null == h) return t;(h = h[a]) && h.then && (wa(f), "$$v" in h || (l = h, l.$$v = t, l.then(function (a) {
        l.$$v = a;
      })), h = h.$$v);if (!c) return h;if (null == h) return t;(h = h[c]) && h.then && (wa(f), "$$v" in h || (l = h, l.$$v = t, l.then(function (a) {
        l.$$v = a;
      })), h = h.$$v);if (!d) return h;if (null == h) return t;(h = h[d]) && h.then && (wa(f), "$$v" in h || (l = h, l.$$v = t, l.then(function (a) {
        l.$$v = a;
      })), h = h.$$v);if (!e) return h;if (null == h) return t;(h = h[e]) && h.then && (wa(f), "$$v" in h || (l = h, l.$$v = t, l.then(function (a) {
        l.$$v = a;
      })), h = h.$$v);return h;
    } : function (f, g) {
      var h = g && g.hasOwnProperty(b) ? g : f;if (null == h) return h;h = h[b];if (!a) return h;if (null == h) return t;h = h[a];if (!c) return h;if (null == h) return t;h = h[c];if (!d) return h;if (null == h) return t;h = h[d];return e ? null == h ? t : h = h[e] : h;
    };
  }function Ec(b, a, c) {
    if (Vb.hasOwnProperty(b)) return Vb[b];var d = b.split("."),
        e = d.length,
        f;if (a.csp) f = 6 > e ? Dc(d[0], d[1], d[2], d[3], d[4], c, a) : function (b, f) {
      var g = 0,
          k;do k = Dc(d[g++], d[g++], d[g++], d[g++], d[g++], c, a)(b, f), f = t, b = k; while (g < e);return k;
    };else {
      var g = "var p;\n";r(d, function (b, d) {
        ka(b, c);g += "if(s == null) return undefined;\ns=" + (d ? "s" : '((k&&k.hasOwnProperty("' + b + '"))?k:s)') + '["' + b + '"];\n' + (a.unwrapPromises ? 'if (s && s.then) {\n pw("' + c.replace(/(["\r\n])/g, "\\$1") + '");\n if (!("$$v" in s)) {\n p=s;\n p.$$v = undefined;\n p.then(function(v) {p.$$v=v;});\n}\n s=s.$$v\n}\n' : "");
      });var g = g + "return s;",
          k = new Function("s", "k", "pw", g);k.toString = ba(g);f = a.unwrapPromises ? function (a, b) {
        return k(a, b, wa);
      } : k;
    }"hasOwnProperty" !== b && (Vb[b] = f);return f;
  }function Yd() {
    var b = {},
        a = { csp: !1, unwrapPromises: !1, logPromiseWarnings: !0 };this.unwrapPromises = function (b) {
      return z(b) ? (a.unwrapPromises = !!b, this) : a.unwrapPromises;
    };this.logPromiseWarnings = function (b) {
      return z(b) ? (a.logPromiseWarnings = b, this) : a.logPromiseWarnings;
    };this.$get = ["$filter", "$sniffer", "$log", function (c, d, e) {
      a.csp = d.csp;wa = function (b) {
        a.logPromiseWarnings && !Fc.hasOwnProperty(b) && (Fc[b] = !0, e.warn("[$parse] Promise found in the expression `" + b + "`. Automatic unwrapping of promises in Angular expressions is deprecated."));
      };return function (d) {
        var e;switch (typeof d) {case "string":
            if (b.hasOwnProperty(d)) return b[d];
            e = new Wb(a);e = new fb(e, c, a).parse(d);"hasOwnProperty" !== d && (b[d] = e);return e;case "function":
            return d;default:
            return F;}
      };
    }];
  }function $d() {
    this.$get = ["$rootScope", "$exceptionHandler", function (b, a) {
      return Ae(function (a) {
        b.$evalAsync(a);
      }, a);
    }];
  }function Ae(b, a) {
    function c(a) {
      return a;
    }function d(a) {
      return g(a);
    }var e = function () {
      var g = [],
          h,
          l;return l = { resolve: function (a) {
          if (g) {
            var c = g;g = t;h = f(a);c.length && b(function () {
              for (var a, b = 0, d = c.length; b < d; b++) a = c[b], h.then(a[0], a[1], a[2]);
            });
          }
        }, reject: function (a) {
          l.resolve(k(a));
        },
        notify: function (a) {
          if (g) {
            var c = g;g.length && b(function () {
              for (var b, d = 0, e = c.length; d < e; d++) b = c[d], b[2](a);
            });
          }
        }, promise: { then: function (b, f, k) {
            var l = e(),
                E = function (d) {
              try {
                l.resolve((P(b) ? b : c)(d));
              } catch (e) {
                l.reject(e), a(e);
              }
            },
                u = function (b) {
              try {
                l.resolve((P(f) ? f : d)(b));
              } catch (c) {
                l.reject(c), a(c);
              }
            },
                B = function (b) {
              try {
                l.notify((P(k) ? k : c)(b));
              } catch (d) {
                a(d);
              }
            };g ? g.push([E, u, B]) : h.then(E, u, B);return l.promise;
          }, "catch": function (a) {
            return this.then(null, a);
          }, "finally": function (a) {
            function b(a, c) {
              var d = e();c ? d.resolve(a) : d.reject(a);return d.promise;
            }function d(e, f) {
              var g = null;try {
                g = (a || c)();
              } catch (k) {
                return b(k, !1);
              }return g && P(g.then) ? g.then(function () {
                return b(e, f);
              }, function (a) {
                return b(a, !1);
              }) : b(e, f);
            }return this.then(function (a) {
              return d(a, !0);
            }, function (a) {
              return d(a, !1);
            });
          } } };
    },
        f = function (a) {
      return a && P(a.then) ? a : { then: function (c) {
          var d = e();b(function () {
            d.resolve(c(a));
          });return d.promise;
        } };
    },
        g = function (a) {
      var b = e();b.reject(a);return b.promise;
    },
        k = function (c) {
      return { then: function (f, g) {
          var k = e();b(function () {
            try {
              k.resolve((P(g) ? g : d)(c));
            } catch (b) {
              k.reject(b), a(b);
            }
          });return k.promise;
        } };
    };return { defer: e, reject: g, when: function (k, h, l, n) {
        var p = e(),
            q,
            s = function (b) {
          try {
            return (P(h) ? h : c)(b);
          } catch (d) {
            return a(d), g(d);
          }
        },
            E = function (b) {
          try {
            return (P(l) ? l : d)(b);
          } catch (c) {
            return a(c), g(c);
          }
        },
            u = function (b) {
          try {
            return (P(n) ? n : c)(b);
          } catch (d) {
            a(d);
          }
        };b(function () {
          f(k).then(function (a) {
            q || (q = !0, p.resolve(f(a).then(s, E, u)));
          }, function (a) {
            q || (q = !0, p.resolve(E(a)));
          }, function (a) {
            q || p.notify(u(a));
          });
        });return p.promise;
      }, all: function (a) {
        var b = e(),
            c = 0,
            d = I(a) ? [] : {};r(a, function (a, e) {
          c++;f(a).then(function (a) {
            d.hasOwnProperty(e) || (d[e] = a, --c || b.resolve(d));
          }, function (a) {
            d.hasOwnProperty(e) || b.reject(a);
          });
        });0 === c && b.resolve(d);return b.promise;
      } };
  }function ge() {
    this.$get = ["$window", "$timeout", function (b, a) {
      var c = b.requestAnimationFrame || b.webkitRequestAnimationFrame || b.mozRequestAnimationFrame,
          d = b.cancelAnimationFrame || b.webkitCancelAnimationFrame || b.mozCancelAnimationFrame || b.webkitCancelRequestAnimationFrame,
          e = !!c,
          f = e ? function (a) {
        var b = c(a);return function () {
          d(b);
        };
      } : function (b) {
        var c = a(b, 16.66, !1);return function () {
          a.cancel(c);
        };
      };f.supported = e;return f;
    }];
  }function Zd() {
    var b = 10,
        a = D("$rootScope"),
        c = null;this.digestTtl = function (a) {
      arguments.length && (b = a);return b;
    };this.$get = ["$injector", "$exceptionHandler", "$parse", "$browser", function (d, e, f, g) {
      function k() {
        this.$id = hb();this.$$phase = this.$parent = this.$$watchers = this.$$nextSibling = this.$$prevSibling = this.$$childHead = this.$$childTail = null;this["this"] = this.$root = this;this.$$destroyed = !1;this.$$asyncQueue = [];this.$$postDigestQueue = [];this.$$listeners = {};this.$$listenerCount = {};this.$$isolateBindings = {};
      }function m(b) {
        if (p.$$phase) throw a("inprog", p.$$phase);p.$$phase = b;
      }function h(a, b) {
        var c = f(a);Wa(c, b);return c;
      }function l(a, b, c) {
        do a.$$listenerCount[c] -= b, 0 === a.$$listenerCount[c] && delete a.$$listenerCount[c]; while (a = a.$parent);
      }function n() {}k.prototype = { constructor: k, $new: function (a) {
          a ? (a = new k(), a.$root = this.$root, a.$$asyncQueue = this.$$asyncQueue, a.$$postDigestQueue = this.$$postDigestQueue) : (this.$$childScopeClass || (this.$$childScopeClass = function () {
            this.$$watchers = this.$$nextSibling = this.$$childHead = this.$$childTail = null;this.$$listeners = {};this.$$listenerCount = {};this.$id = hb();this.$$childScopeClass = null;
          }, this.$$childScopeClass.prototype = this), a = new this.$$childScopeClass());a["this"] = a;a.$parent = this;a.$$prevSibling = this.$$childTail;this.$$childHead ? this.$$childTail = this.$$childTail.$$nextSibling = a : this.$$childHead = this.$$childTail = a;return a;
        }, $watch: function (a, b, d) {
          var e = h(a, "watch"),
              f = this.$$watchers,
              g = { fn: b, last: n, get: e, exp: a,
            eq: !!d };c = null;if (!P(b)) {
            var k = h(b || F, "listener");g.fn = function (a, b, c) {
              k(c);
            };
          }if ("string" == typeof a && e.constant) {
            var l = g.fn;g.fn = function (a, b, c) {
              l.call(this, a, b, c);Sa(f, g);
            };
          }f || (f = this.$$watchers = []);f.unshift(g);return function () {
            Sa(f, g);c = null;
          };
        }, $watchCollection: function (a, b) {
          var c = this,
              d,
              e,
              g,
              k = 1 < b.length,
              h = 0,
              l = f(a),
              m = [],
              p = {},
              n = !0,
              r = 0;return this.$watch(function () {
            d = l(c);var a, b, f;if (T(d)) {
              if (Pa(d)) for (e !== m && (e = m, r = e.length = 0, h++), a = d.length, r !== a && (h++, e.length = r = a), b = 0; b < a; b++) f = e[b] !== e[b] && d[b] !== d[b], f || e[b] === d[b] || (h++, e[b] = d[b]);else {
                e !== p && (e = p = {}, r = 0, h++);a = 0;for (b in d) d.hasOwnProperty(b) && (a++, e.hasOwnProperty(b) ? (f = e[b] !== e[b] && d[b] !== d[b], f || e[b] === d[b] || (h++, e[b] = d[b])) : (r++, e[b] = d[b], h++));if (r > a) for (b in h++, e) e.hasOwnProperty(b) && !d.hasOwnProperty(b) && (r--, delete e[b]);
              }
            } else e !== d && (e = d, h++);return h;
          }, function () {
            n ? (n = !1, b(d, d, c)) : b(d, g, c);if (k) if (T(d)) {
              if (Pa(d)) {
                g = Array(d.length);for (var a = 0; a < d.length; a++) g[a] = d[a];
              } else for (a in g = {}, d) kb.call(d, a) && (g[a] = d[a]);
            } else g = d;
          });
        }, $digest: function () {
          var d,
              f,
              k,
              h,
              l = this.$$asyncQueue,
              r = this.$$postDigestQueue,
              R,
              w,
              t = b,
              K,
              O = [],
              v,
              C,
              x;m("$digest");g.$$checkUrlChange();c = null;do {
            w = !1;for (K = this; l.length;) {
              try {
                x = l.shift(), x.scope.$eval(x.expression);
              } catch (H) {
                p.$$phase = null, e(H);
              }c = null;
            }a: do {
              if (h = K.$$watchers) for (R = h.length; R--;) try {
                if (d = h[R]) if ((f = d.get(K)) !== (k = d.last) && !(d.eq ? Aa(f, k) : "number" === typeof f && "number" === typeof k && isNaN(f) && isNaN(k))) w = !0, c = d, d.last = d.eq ? Ha(f, null) : f, d.fn(f, k === n ? f : k, K), 5 > t && (v = 4 - t, O[v] || (O[v] = []), C = P(d.exp) ? "fn: " + (d.exp.name || d.exp.toString()) : d.exp, C += "; newVal: " + na(f) + "; oldVal: " + na(k), O[v].push(C));else if (d === c) {
                  w = !1;break a;
                }
              } catch (z) {
                p.$$phase = null, e(z);
              }if (!(h = K.$$childHead || K !== this && K.$$nextSibling)) for (; K !== this && !(h = K.$$nextSibling);) K = K.$parent;
            } while (K = h);if ((w || l.length) && !t--) throw p.$$phase = null, a("infdig", b, na(O));
          } while (w || l.length);for (p.$$phase = null; r.length;) try {
            r.shift()();
          } catch (A) {
            e(A);
          }
        }, $destroy: function () {
          if (!this.$$destroyed) {
            var a = this.$parent;this.$broadcast("$destroy");this.$$destroyed = !0;this !== p && (r(this.$$listenerCount, Bb(null, l, this)), a.$$childHead == this && (a.$$childHead = this.$$nextSibling), a.$$childTail == this && (a.$$childTail = this.$$prevSibling), this.$$prevSibling && (this.$$prevSibling.$$nextSibling = this.$$nextSibling), this.$$nextSibling && (this.$$nextSibling.$$prevSibling = this.$$prevSibling), this.$parent = this.$$nextSibling = this.$$prevSibling = this.$$childHead = this.$$childTail = this.$root = null, this.$$listeners = {}, this.$$watchers = this.$$asyncQueue = this.$$postDigestQueue = [], this.$destroy = this.$digest = this.$apply = F, this.$on = this.$watch = function () {
              return F;
            });
          }
        }, $eval: function (a, b) {
          return f(a)(this, b);
        }, $evalAsync: function (a) {
          p.$$phase || p.$$asyncQueue.length || g.defer(function () {
            p.$$asyncQueue.length && p.$digest();
          });this.$$asyncQueue.push({ scope: this, expression: a });
        }, $$postDigest: function (a) {
          this.$$postDigestQueue.push(a);
        }, $apply: function (a) {
          try {
            return m("$apply"), this.$eval(a);
          } catch (b) {
            e(b);
          } finally {
            p.$$phase = null;try {
              p.$digest();
            } catch (c) {
              throw e(c), c;
            }
          }
        }, $on: function (a, b) {
          var c = this.$$listeners[a];c || (this.$$listeners[a] = c = []);c.push(b);var d = this;do d.$$listenerCount[a] || (d.$$listenerCount[a] = 0), d.$$listenerCount[a]++; while (d = d.$parent);var e = this;return function () {
            c[Ra(c, b)] = null;l(e, 1, a);
          };
        }, $emit: function (a, b) {
          var c = [],
              d,
              f = this,
              g = !1,
              k = { name: a, targetScope: f, stopPropagation: function () {
              g = !0;
            }, preventDefault: function () {
              k.defaultPrevented = !0;
            }, defaultPrevented: !1 },
              h = [k].concat(Ba.call(arguments, 1)),
              l,
              m;do {
            d = f.$$listeners[a] || c;k.currentScope = f;l = 0;for (m = d.length; l < m; l++) if (d[l]) try {
              d[l].apply(null, h);
            } catch (p) {
              e(p);
            } else d.splice(l, 1), l--, m--;if (g) break;f = f.$parent;
          } while (f);return k;
        }, $broadcast: function (a, b) {
          for (var c = this, d = this, f = { name: a, targetScope: this, preventDefault: function () {
              f.defaultPrevented = !0;
            }, defaultPrevented: !1 }, g = [f].concat(Ba.call(arguments, 1)), k, h; c = d;) {
            f.currentScope = c;d = c.$$listeners[a] || [];k = 0;for (h = d.length; k < h; k++) if (d[k]) try {
              d[k].apply(null, g);
            } catch (l) {
              e(l);
            } else d.splice(k, 1), k--, h--;if (!(d = c.$$listenerCount[a] && c.$$childHead || c !== this && c.$$nextSibling)) for (; c !== this && !(d = c.$$nextSibling);) c = c.$parent;
          }return f;
        } };
      var p = new k();return p;
    }];
  }function cd() {
    var b = /^\s*(https?|ftp|mailto|tel|file):/,
        a = /^\s*((https?|ftp|file):|data:image\/)/;this.aHrefSanitizationWhitelist = function (a) {
      return z(a) ? (b = a, this) : b;
    };this.imgSrcSanitizationWhitelist = function (b) {
      return z(b) ? (a = b, this) : a;
    };this.$get = function () {
      return function (c, d) {
        var e = d ? a : b,
            f;if (!Q || 8 <= Q) if (f = ua(c).href, "" !== f && !f.match(e)) return "unsafe:" + f;return c;
      };
    };
  }function Be(b) {
    if ("self" === b) return b;if (A(b)) {
      if (-1 < b.indexOf("***")) throw xa("iwcard", b);b = b.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08").replace("\\*\\*", ".*").replace("\\*", "[^:/.?&;]*");return RegExp("^" + b + "$");
    }if (jb(b)) return RegExp("^" + b.source + "$");throw xa("imatcher");
  }function Gc(b) {
    var a = [];z(b) && r(b, function (b) {
      a.push(Be(b));
    });return a;
  }function be() {
    this.SCE_CONTEXTS = ga;var b = ["self"],
        a = [];this.resourceUrlWhitelist = function (a) {
      arguments.length && (b = Gc(a));return b;
    };this.resourceUrlBlacklist = function (b) {
      arguments.length && (a = Gc(b));return a;
    };this.$get = ["$injector", function (c) {
      function d(a) {
        var b = function (a) {
          this.$$unwrapTrustedValue = function () {
            return a;
          };
        };a && (b.prototype = new a());b.prototype.valueOf = function () {
          return this.$$unwrapTrustedValue();
        };b.prototype.toString = function () {
          return this.$$unwrapTrustedValue().toString();
        };return b;
      }var e = function (a) {
        throw xa("unsafe");
      };c.has("$sanitize") && (e = c.get("$sanitize"));var f = d(),
          g = {};g[ga.HTML] = d(f);g[ga.CSS] = d(f);g[ga.URL] = d(f);g[ga.JS] = d(f);g[ga.RESOURCE_URL] = d(g[ga.URL]);return { trustAs: function (a, b) {
          var c = g.hasOwnProperty(a) ? g[a] : null;if (!c) throw xa("icontext", a, b);if (null === b || b === t || "" === b) return b;if ("string" !== typeof b) throw xa("itype", a);return new c(b);
        }, getTrusted: function (c, d) {
          if (null === d || d === t || "" === d) return d;var f = g.hasOwnProperty(c) ? g[c] : null;if (f && d instanceof f) return d.$$unwrapTrustedValue();if (c === ga.RESOURCE_URL) {
            var f = ua(d.toString()),
                l,
                n,
                p = !1;l = 0;for (n = b.length; l < n; l++) if ("self" === b[l] ? Pb(f) : b[l].exec(f.href)) {
              p = !0;break;
            }if (p) for (l = 0, n = a.length; l < n; l++) if ("self" === a[l] ? Pb(f) : a[l].exec(f.href)) {
              p = !1;break;
            }if (p) return d;throw xa("insecurl", d.toString());
          }if (c === ga.HTML) return e(d);throw xa("unsafe");
        }, valueOf: function (a) {
          return a instanceof f ? a.$$unwrapTrustedValue() : a;
        } };
    }];
  }function ae() {
    var b = !0;this.enabled = function (a) {
      arguments.length && (b = !!a);return b;
    };this.$get = ["$parse", "$sniffer", "$sceDelegate", function (a, c, d) {
      if (b && c.msie && 8 > c.msieDocumentMode) throw xa("iequirks");var e = ha(ga);e.isEnabled = function () {
        return b;
      };e.trustAs = d.trustAs;e.getTrusted = d.getTrusted;e.valueOf = d.valueOf;b || (e.trustAs = e.getTrusted = function (a, b) {
        return b;
      }, e.valueOf = Qa);e.parseAs = function (b, c) {
        var d = a(c);return d.literal && d.constant ? d : function (a, c) {
          return e.getTrusted(b, d(a, c));
        };
      };var f = e.parseAs,
          g = e.getTrusted,
          k = e.trustAs;r(ga, function (a, b) {
        var c = M(b);e[Za("parse_as_" + c)] = function (b) {
          return f(a, b);
        };e[Za("get_trusted_" + c)] = function (b) {
          return g(a, b);
        };e[Za("trust_as_" + c)] = function (b) {
          return k(a, b);
        };
      });return e;
    }];
  }function ce() {
    this.$get = ["$window", "$document", function (b, a) {
      var c = {},
          d = U((/android (\d+)/.exec(M((b.navigator || {}).userAgent)) || [])[1]),
          e = /Boxee/i.test((b.navigator || {}).userAgent),
          f = a[0] || {},
          g = f.documentMode,
          k,
          m = /^(Moz|webkit|O|ms)(?=[A-Z])/,
          h = f.body && f.body.style,
          l = !1,
          n = !1;if (h) {
        for (var p in h) if (l = m.exec(p)) {
          k = l[0];k = k.substr(0, 1).toUpperCase() + k.substr(1);break;
        }k || (k = "WebkitOpacity" in h && "webkit");l = !!("transition" in h || k + "Transition" in h);n = !!("animation" in h || k + "Animation" in h);!d || l && n || (l = A(f.body.style.webkitTransition), n = A(f.body.style.webkitAnimation));
      }return { history: !(!b.history || !b.history.pushState || 4 > d || e), hashchange: "onhashchange" in b && (!g || 7 < g), hasEvent: function (a) {
          if ("input" == a && 9 == Q) return !1;if (y(c[a])) {
            var b = f.createElement("div");c[a] = "on" + a in b;
          }return c[a];
        }, csp: Xa(), vendorPrefix: k, transitions: l, animations: n, android: d, msie: Q, msieDocumentMode: g };
    }];
  }function ee() {
    this.$get = ["$rootScope", "$browser", "$q", "$exceptionHandler", function (b, a, c, d) {
      function e(e, k, m) {
        var h = c.defer(),
            l = h.promise,
            n = z(m) && !m;k = a.defer(function () {
          try {
            h.resolve(e());
          } catch (a) {
            h.reject(a), d(a);
          } finally {
            delete f[l.$$timeoutId];
          }n || b.$apply();
        }, k);l.$$timeoutId = k;f[k] = h;
        return l;
      }var f = {};e.cancel = function (b) {
        return b && b.$$timeoutId in f ? (f[b.$$timeoutId].reject("canceled"), delete f[b.$$timeoutId], a.defer.cancel(b.$$timeoutId)) : !1;
      };return e;
    }];
  }function ua(b, a) {
    var c = b;Q && (Y.setAttribute("href", c), c = Y.href);Y.setAttribute("href", c);return { href: Y.href, protocol: Y.protocol ? Y.protocol.replace(/:$/, "") : "", host: Y.host, search: Y.search ? Y.search.replace(/^\?/, "") : "", hash: Y.hash ? Y.hash.replace(/^#/, "") : "", hostname: Y.hostname, port: Y.port, pathname: "/" === Y.pathname.charAt(0) ? Y.pathname : "/" + Y.pathname };
  }function Pb(b) {
    b = A(b) ? ua(b) : b;return b.protocol === Hc.protocol && b.host === Hc.host;
  }function fe() {
    this.$get = ba(W);
  }function mc(b) {
    function a(d, e) {
      if (T(d)) {
        var f = {};r(d, function (b, c) {
          f[c] = a(c, b);
        });return f;
      }return b.factory(d + c, e);
    }var c = "Filter";this.register = a;this.$get = ["$injector", function (a) {
      return function (b) {
        return a.get(b + c);
      };
    }];a("currency", Ic);a("date", Jc);a("filter", Ce);a("json", De);a("limitTo", Ee);a("lowercase", Fe);a("number", Kc);a("orderBy", Lc);a("uppercase", Ge);
  }function Ce() {
    return function (b, a, c) {
      if (!I(b)) return b;var d = typeof c,
          e = [];e.check = function (a) {
        for (var b = 0; b < e.length; b++) if (!e[b](a)) return !1;return !0;
      };"function" !== d && (c = "boolean" === d && c ? function (a, b) {
        return Va.equals(a, b);
      } : function (a, b) {
        if (a && b && "object" === typeof a && "object" === typeof b) {
          for (var d in a) if ("$" !== d.charAt(0) && kb.call(a, d) && c(a[d], b[d])) return !0;return !1;
        }b = ("" + b).toLowerCase();return -1 < ("" + a).toLowerCase().indexOf(b);
      });var f = function (a, b) {
        if ("string" == typeof b && "!" === b.charAt(0)) return !f(a, b.substr(1));switch (typeof a) {case "boolean":case "number":case "string":
            return c(a, b);case "object":
            switch (typeof b) {case "object":
                return c(a, b);default:
                for (var d in a) if ("$" !== d.charAt(0) && f(a[d], b)) return !0;}return !1;case "array":
            for (d = 0; d < a.length; d++) if (f(a[d], b)) return !0;return !1;default:
            return !1;}
      };switch (typeof a) {case "boolean":case "number":case "string":
          a = { $: a };case "object":
          for (var g in a) (function (b) {
            "undefined" !== typeof a[b] && e.push(function (c) {
              return f("$" == b ? c : c && c[b], a[b]);
            });
          })(g);break;case "function":
          e.push(a);break;default:
          return b;}d = [];for (g = 0; g < b.length; g++) {
        var k = b[g];e.check(k) && d.push(k);
      }return d;
    };
  }function Ic(b) {
    var a = b.NUMBER_FORMATS;return function (b, d) {
      y(d) && (d = a.CURRENCY_SYM);return Mc(b, a.PATTERNS[1], a.GROUP_SEP, a.DECIMAL_SEP, 2).replace(/\u00A4/g, d);
    };
  }function Kc(b) {
    var a = b.NUMBER_FORMATS;return function (b, d) {
      return Mc(b, a.PATTERNS[0], a.GROUP_SEP, a.DECIMAL_SEP, d);
    };
  }function Mc(b, a, c, d, e) {
    if (null == b || !isFinite(b) || T(b)) return "";var f = 0 > b;b = Math.abs(b);var g = b + "",
        k = "",
        m = [],
        h = !1;if (-1 !== g.indexOf("e")) {
      var l = g.match(/([\d\.]+)e(-?)(\d+)/);l && "-" == l[2] && l[3] > e + 1 ? (g = "0", b = 0) : (k = g, h = !0);
    }if (h) 0 < e && -1 < b && 1 > b && (k = b.toFixed(e));else {
      g = (g.split(Nc)[1] || "").length;y(e) && (e = Math.min(Math.max(a.minFrac, g), a.maxFrac));b = +(Math.round(+(b.toString() + "e" + e)).toString() + "e" + -e);0 === b && (f = !1);b = ("" + b).split(Nc);g = b[0];b = b[1] || "";var l = 0,
          n = a.lgSize,
          p = a.gSize;if (g.length >= n + p) for (l = g.length - n, h = 0; h < l; h++) 0 === (l - h) % p && 0 !== h && (k += c), k += g.charAt(h);for (h = l; h < g.length; h++) 0 === (g.length - h) % n && 0 !== h && (k += c), k += g.charAt(h);for (; b.length < e;) b += "0";e && "0" !== e && (k += d + b.substr(0, e));
    }m.push(f ? a.negPre : a.posPre);m.push(k);m.push(f ? a.negSuf : a.posSuf);return m.join("");
  }function Xb(b, a, c) {
    var d = "";0 > b && (d = "-", b = -b);for (b = "" + b; b.length < a;) b = "0" + b;c && (b = b.substr(b.length - a));return d + b;
  }function $(b, a, c, d) {
    c = c || 0;return function (e) {
      e = e["get" + b]();if (0 < c || e > -c) e += c;0 === e && -12 == c && (e = 12);return Xb(e, a, d);
    };
  }function vb(b, a) {
    return function (c, d) {
      var e = c["get" + b](),
          f = Ia(a ? "SHORT" + b : b);return d[f][e];
    };
  }function Jc(b) {
    function a(a) {
      var b;if (b = a.match(c)) {
        a = new Date(0);var f = 0,
            g = 0,
            k = b[8] ? a.setUTCFullYear : a.setFullYear,
            m = b[8] ? a.setUTCHours : a.setHours;b[9] && (f = U(b[9] + b[10]), g = U(b[9] + b[11]));k.call(a, U(b[1]), U(b[2]) - 1, U(b[3]));f = U(b[4] || 0) - f;g = U(b[5] || 0) - g;k = U(b[6] || 0);b = Math.round(1E3 * parseFloat("0." + (b[7] || 0)));m.call(a, f, g, k, b);
      }return a;
    }var c = /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;return function (c, e) {
      var f = "",
          g = [],
          k,
          m;e = e || "mediumDate";e = b.DATETIME_FORMATS[e] || e;A(c) && (c = He.test(c) ? U(c) : a(c));ib(c) && (c = new Date(c));
      if (!ta(c)) return c;for (; e;) (m = Ie.exec(e)) ? (g = g.concat(Ba.call(m, 1)), e = g.pop()) : (g.push(e), e = null);r(g, function (a) {
        k = Je[a];f += k ? k(c, b.DATETIME_FORMATS) : a.replace(/(^'|'$)/g, "").replace(/''/g, "'");
      });return f;
    };
  }function De() {
    return function (b) {
      return na(b, !0);
    };
  }function Ee() {
    return function (b, a) {
      if (!I(b) && !A(b)) return b;a = Infinity === Math.abs(Number(a)) ? Number(a) : U(a);if (A(b)) return a ? 0 <= a ? b.slice(0, a) : b.slice(a, b.length) : "";var c = [],
          d,
          e;a > b.length ? a = b.length : a < -b.length && (a = -b.length);0 < a ? (d = 0, e = a) : (d = b.length + a, e = b.length);for (; d < e; d++) c.push(b[d]);return c;
    };
  }function Lc(b) {
    return function (a, c, d) {
      function e(a, b) {
        return Ua(b) ? function (b, c) {
          return a(c, b);
        } : a;
      }function f(a, b) {
        var c = typeof a,
            d = typeof b;return c == d ? (ta(a) && ta(b) && (a = a.valueOf(), b = b.valueOf()), "string" == c && (a = a.toLowerCase(), b = b.toLowerCase()), a === b ? 0 : a < b ? -1 : 1) : c < d ? -1 : 1;
      }if (!Pa(a) || !c) return a;c = I(c) ? c : [c];c = Vc(c, function (a) {
        var c = !1,
            d = a || Qa;if (A(a)) {
          if ("+" == a.charAt(0) || "-" == a.charAt(0)) c = "-" == a.charAt(0), a = a.substring(1);d = b(a);if (d.constant) {
            var g = d();return e(function (a, b) {
              return f(a[g], b[g]);
            }, c);
          }
        }return e(function (a, b) {
          return f(d(a), d(b));
        }, c);
      });for (var g = [], k = 0; k < a.length; k++) g.push(a[k]);return g.sort(e(function (a, b) {
        for (var d = 0; d < c.length; d++) {
          var e = c[d](a, b);if (0 !== e) return e;
        }return 0;
      }, d));
    };
  }function ya(b) {
    P(b) && (b = { link: b });b.restrict = b.restrict || "AC";return ba(b);
  }function Oc(b, a, c, d) {
    function e(a, c) {
      c = c ? "-" + mb(c, "-") : "";d.setClass(b, (a ? wb : xb) + c, (a ? xb : wb) + c);
    }var f = this,
        g = b.parent().controller("form") || yb,
        k = 0,
        m = f.$error = {},
        h = [];f.$name = a.name || a.ngForm;f.$dirty = !1;f.$pristine = !0;f.$valid = !0;f.$invalid = !1;g.$addControl(f);b.addClass(Oa);e(!0);f.$addControl = function (a) {
      Da(a.$name, "input");h.push(a);a.$name && (f[a.$name] = a);
    };f.$removeControl = function (a) {
      a.$name && f[a.$name] === a && delete f[a.$name];r(m, function (b, c) {
        f.$setValidity(c, !0, a);
      });Sa(h, a);
    };f.$setValidity = function (a, b, c) {
      var d = m[a];if (b) d && (Sa(d, c), d.length || (k--, k || (e(b), f.$valid = !0, f.$invalid = !1), m[a] = !1, e(!0, a), g.$setValidity(a, !0, f)));else {
        k || e(b);if (d) {
          if (-1 != Ra(d, c)) return;
        } else m[a] = d = [], k++, e(!1, a), g.$setValidity(a, !1, f);d.push(c);f.$valid = !1;f.$invalid = !0;
      }
    };f.$setDirty = function () {
      d.removeClass(b, Oa);d.addClass(b, zb);f.$dirty = !0;f.$pristine = !1;g.$setDirty();
    };f.$setPristine = function () {
      d.removeClass(b, zb);d.addClass(b, Oa);f.$dirty = !1;f.$pristine = !0;r(h, function (a) {
        a.$setPristine();
      });
    };
  }function sa(b, a, c, d) {
    b.$setValidity(a, c);return c ? d : t;
  }function Pc(b, a) {
    var c, d;if (a) for (c = 0; c < a.length; ++c) if (d = a[c], b[d]) return !0;return !1;
  }function Ke(b, a, c, d, e) {
    T(e) && (b.$$hasNativeValidators = !0, b.$parsers.push(function (f) {
      if (b.$error[a] || Pc(e, d) || !Pc(e, c)) return f;b.$setValidity(a, !1);
    }));
  }function Ab(b, a, c, d, e, f) {
    var g = a.prop(Le),
        k = a[0].placeholder,
        m = {},
        h = M(a[0].type);d.$$validityState = g;if (!e.android) {
      var l = !1;a.on("compositionstart", function (a) {
        l = !0;
      });a.on("compositionend", function () {
        l = !1;n();
      });
    }var n = function (e) {
      if (!l) {
        var f = a.val();if (Q && "input" === (e || m).type && a[0].placeholder !== k) k = a[0].placeholder;else if ("password" !== h && Ua(c.ngTrim || "T") && (f = aa(f)), e = g && d.$$hasNativeValidators, d.$viewValue !== f || "" === f && e) b.$root.$$phase ? d.$setViewValue(f) : b.$apply(function () {
          d.$setViewValue(f);
        });
      }
    };if (e.hasEvent("input")) a.on("input", n);else {
      var p,
          q = function () {
        p || (p = f.defer(function () {
          n();p = null;
        }));
      };a.on("keydown", function (a) {
        a = a.keyCode;91 === a || 15 < a && 19 > a || 37 <= a && 40 >= a || q();
      });if (e.hasEvent("paste")) a.on("paste cut", q);
    }a.on("change", n);d.$render = function () {
      a.val(d.$isEmpty(d.$viewValue) ? "" : d.$viewValue);
    };var s = c.ngPattern;s && ((e = s.match(/^\/(.*)\/([gim]*)$/)) ? (s = RegExp(e[1], e[2]), e = function (a) {
      return sa(d, "pattern", d.$isEmpty(a) || s.test(a), a);
    }) : e = function (c) {
      var e = b.$eval(s);if (!e || !e.test) throw D("ngPattern")("noregexp", s, e, ia(a));return sa(d, "pattern", d.$isEmpty(c) || e.test(c), c);
    }, d.$formatters.push(e), d.$parsers.push(e));if (c.ngMinlength) {
      var r = U(c.ngMinlength);e = function (a) {
        return sa(d, "minlength", d.$isEmpty(a) || a.length >= r, a);
      };d.$parsers.push(e);d.$formatters.push(e);
    }if (c.ngMaxlength) {
      var u = U(c.ngMaxlength);e = function (a) {
        return sa(d, "maxlength", d.$isEmpty(a) || a.length <= u, a);
      };d.$parsers.push(e);
      d.$formatters.push(e);
    }
  }function Yb(b, a) {
    b = "ngClass" + b;return ["$animate", function (c) {
      function d(a, b) {
        var c = [],
            d = 0;a: for (; d < a.length; d++) {
          for (var e = a[d], l = 0; l < b.length; l++) if (e == b[l]) continue a;c.push(e);
        }return c;
      }function e(a) {
        if (!I(a)) {
          if (A(a)) return a.split(" ");if (T(a)) {
            var b = [];r(a, function (a, c) {
              a && (b = b.concat(c.split(" ")));
            });return b;
          }
        }return a;
      }return { restrict: "AC", link: function (f, g, k) {
          function m(a, b) {
            var c = g.data("$classCounts") || {},
                d = [];r(a, function (a) {
              if (0 < b || c[a]) c[a] = (c[a] || 0) + b, c[a] === +(0 < b) && d.push(a);
            });g.data("$classCounts", c);return d.join(" ");
          }function h(b) {
            if (!0 === a || f.$index % 2 === a) {
              var h = e(b || []);if (!l) {
                var q = m(h, 1);k.$addClass(q);
              } else if (!Aa(b, l)) {
                var s = e(l),
                    q = d(h, s),
                    h = d(s, h),
                    h = m(h, -1),
                    q = m(q, 1);0 === q.length ? c.removeClass(g, h) : 0 === h.length ? c.addClass(g, q) : c.setClass(g, q, h);
              }
            }l = ha(b);
          }var l;f.$watch(k[b], h, !0);k.$observe("class", function (a) {
            h(f.$eval(k[b]));
          });"ngClass" !== b && f.$watch("$index", function (c, d) {
            var g = c & 1;if (g !== (d & 1)) {
              var h = e(f.$eval(k[b]));g === a ? (g = m(h, 1), k.$addClass(g)) : (g = m(h, -1), k.$removeClass(g));
            }
          });
        } };
    }];
  }var Le = "validity",
      M = function (b) {
    return A(b) ? b.toLowerCase() : b;
  },
      kb = Object.prototype.hasOwnProperty,
      Ia = function (b) {
    return A(b) ? b.toUpperCase() : b;
  },
      Q,
      v,
      Ea,
      Ba = [].slice,
      Me = [].push,
      za = Object.prototype.toString,
      Ta = D("ng"),
      Va = W.angular || (W.angular = {}),
      Ya,
      Ma,
      ma = ["0", "0", "0"];Q = U((/msie (\d+)/.exec(M(navigator.userAgent)) || [])[1]);isNaN(Q) && (Q = U((/trident\/.*; rv:(\d+)/.exec(M(navigator.userAgent)) || [])[1]));F.$inject = [];Qa.$inject = [];var I = function () {
    return P(Array.isArray) ? Array.isArray : function (b) {
      return "[object Array]" === za.call(b);
    };
  }(),
      aa = function () {
    return String.prototype.trim ? function (b) {
      return A(b) ? b.trim() : b;
    } : function (b) {
      return A(b) ? b.replace(/^\s\s*/, "").replace(/\s\s*$/, "") : b;
    };
  }();Ma = 9 > Q ? function (b) {
    b = b.nodeName ? b : b[0];return b.scopeName && "HTML" != b.scopeName ? Ia(b.scopeName + ":" + b.nodeName) : b.nodeName;
  } : function (b) {
    return b.nodeName ? b.nodeName : b[0].nodeName;
  };var Xa = function () {
    if (z(Xa.isActive_)) return Xa.isActive_;var b = !(!X.querySelector("[ng-csp]") && !X.querySelector("[data-ng-csp]"));
    if (!b) try {
      new Function("");
    } catch (a) {
      b = !0;
    }return Xa.isActive_ = b;
  },
      Yc = /[A-Z]/g,
      ad = { full: "1.2.25", major: 1, minor: 2, dot: 25, codeName: "hypnotic-gesticulation" };S.expando = "ng339";var ab = S.cache = {},
      ne = 1,
      sb = W.document.addEventListener ? function (b, a, c) {
    b.addEventListener(a, c, !1);
  } : function (b, a, c) {
    b.attachEvent("on" + a, c);
  },
      $a = W.document.removeEventListener ? function (b, a, c) {
    b.removeEventListener(a, c, !1);
  } : function (b, a, c) {
    b.detachEvent("on" + a, c);
  };S._data = function (b) {
    return this.cache[b[this.expando]] || {};
  };var ie = /([\:\-\_]+(.))/g,
      je = /^moz([A-Z])/,
      Hb = D("jqLite"),
      ke = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
      Ib = /<|&#?\w+;/,
      le = /<([\w:]+)/,
      me = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
      ea = { option: [1, '<select multiple="multiple">', "</select>"], thead: [1, "<table>", "</table>"], col: [2, "<table><colgroup>", "</colgroup></table>"], tr: [2, "<table><tbody>", "</tbody></table>"], td: [3, "<table><tbody><tr>", "</tr></tbody></table>"], _default: [0, "", ""] };ea.optgroup = ea.option;ea.tbody = ea.tfoot = ea.colgroup = ea.caption = ea.thead;ea.th = ea.td;var La = S.prototype = { ready: function (b) {
      function a() {
        c || (c = !0, b());
      }var c = !1;"complete" === X.readyState ? setTimeout(a) : (this.on("DOMContentLoaded", a), S(W).on("load", a));
    }, toString: function () {
      var b = [];r(this, function (a) {
        b.push("" + a);
      });return "[" + b.join(", ") + "]";
    }, eq: function (b) {
      return 0 <= b ? v(this[b]) : v(this[this.length + b]);
    }, length: 0, push: Me, sort: [].sort, splice: [].splice },
      qb = {};r("multiple selected checked disabled readOnly required open".split(" "), function (b) {
    qb[M(b)] = b;
  });var rc = {};r("input select option textarea button form details".split(" "), function (b) {
    rc[Ia(b)] = !0;
  });r({ data: Mb, removeData: Lb }, function (b, a) {
    S[a] = b;
  });r({ data: Mb, inheritedData: pb, scope: function (b) {
      return v.data(b, "$scope") || pb(b.parentNode || b, ["$isolateScope", "$scope"]);
    }, isolateScope: function (b) {
      return v.data(b, "$isolateScope") || v.data(b, "$isolateScopeNoTemplate");
    }, controller: oc, injector: function (b) {
      return pb(b, "$injector");
    }, removeAttr: function (b, a) {
      b.removeAttribute(a);
    }, hasClass: Nb, css: function (b, a, c) {
      a = Za(a);if (z(c)) b.style[a] = c;else {
        var d;8 >= Q && (d = b.currentStyle && b.currentStyle[a], "" === d && (d = "auto"));d = d || b.style[a];8 >= Q && (d = "" === d ? t : d);return d;
      }
    }, attr: function (b, a, c) {
      var d = M(a);if (qb[d]) {
        if (z(c)) c ? (b[a] = !0, b.setAttribute(a, d)) : (b[a] = !1, b.removeAttribute(d));else return b[a] || (b.attributes.getNamedItem(a) || F).specified ? d : t;
      } else if (z(c)) b.setAttribute(a, c);else if (b.getAttribute) return b = b.getAttribute(a, 2), null === b ? t : b;
    }, prop: function (b, a, c) {
      if (z(c)) b[a] = c;else return b[a];
    }, text: function () {
      function b(b, d) {
        var e = a[b.nodeType];if (y(d)) return e ? b[e] : "";b[e] = d;
      }var a = [];9 > Q ? (a[1] = "innerText", a[3] = "nodeValue") : a[1] = a[3] = "textContent";b.$dv = "";return b;
    }(), val: function (b, a) {
      if (y(a)) {
        if ("SELECT" === Ma(b) && b.multiple) {
          var c = [];r(b.options, function (a) {
            a.selected && c.push(a.value || a.text);
          });return 0 === c.length ? null : c;
        }return b.value;
      }b.value = a;
    }, html: function (b, a) {
      if (y(a)) return b.innerHTML;for (var c = 0, d = b.childNodes; c < d.length; c++) Ja(d[c]);b.innerHTML = a;
    }, empty: pc }, function (b, a) {
    S.prototype[a] = function (a, d) {
      var e,
          f,
          g = this.length;if (b !== pc && (2 == b.length && b !== Nb && b !== oc ? a : d) === t) {
        if (T(a)) {
          for (e = 0; e < g; e++) if (b === Mb) b(this[e], a);else for (f in a) b(this[e], f, a[f]);return this;
        }e = b.$dv;g = e === t ? Math.min(g, 1) : g;for (f = 0; f < g; f++) {
          var k = b(this[f], a, d);e = e ? e + k : k;
        }return e;
      }for (e = 0; e < g; e++) b(this[e], a, d);return this;
    };
  });r({ removeData: Lb, dealoc: Ja, on: function a(c, d, e, f) {
      if (z(f)) throw Hb("onargs");var g = oa(c, "events"),
          k = oa(c, "handle");g || oa(c, "events", g = {});k || oa(c, "handle", k = oe(c, g));r(d.split(" "), function (d) {
        var f = g[d];if (!f) {
          if ("mouseenter" == d || "mouseleave" == d) {
            var l = X.body.contains || X.body.compareDocumentPosition ? function (a, c) {
              var d = 9 === a.nodeType ? a.documentElement : a,
                  e = c && c.parentNode;return a === e || !!(e && 1 === e.nodeType && (d.contains ? d.contains(e) : a.compareDocumentPosition && a.compareDocumentPosition(e) & 16));
            } : function (a, c) {
              if (c) for (; c = c.parentNode;) if (c === a) return !0;return !1;
            };g[d] = [];a(c, { mouseleave: "mouseout", mouseenter: "mouseover" }[d], function (a) {
              var c = a.relatedTarget;c && (c === this || l(this, c)) || k(a, d);
            });
          } else sb(c, d, k), g[d] = [];f = g[d];
        }f.push(e);
      });
    }, off: nc, one: function (a, c, d) {
      a = v(a);a.on(c, function f() {
        a.off(c, d);a.off(c, f);
      });a.on(c, d);
    }, replaceWith: function (a, c) {
      var d,
          e = a.parentNode;Ja(a);r(new S(c), function (c) {
        d ? e.insertBefore(c, d.nextSibling) : e.replaceChild(c, a);d = c;
      });
    }, children: function (a) {
      var c = [];r(a.childNodes, function (a) {
        1 === a.nodeType && c.push(a);
      });return c;
    }, contents: function (a) {
      return a.contentDocument || a.childNodes || [];
    }, append: function (a, c) {
      r(new S(c), function (c) {
        1 !== a.nodeType && 11 !== a.nodeType || a.appendChild(c);
      });
    }, prepend: function (a, c) {
      if (1 === a.nodeType) {
        var d = a.firstChild;r(new S(c), function (c) {
          a.insertBefore(c, d);
        });
      }
    }, wrap: function (a, c) {
      c = v(c)[0];var d = a.parentNode;d && d.replaceChild(c, a);c.appendChild(a);
    }, remove: function (a) {
      Ja(a);var c = a.parentNode;c && c.removeChild(a);
    }, after: function (a, c) {
      var d = a,
          e = a.parentNode;r(new S(c), function (a) {
        e.insertBefore(a, d.nextSibling);d = a;
      });
    }, addClass: ob, removeClass: nb, toggleClass: function (a, c, d) {
      c && r(c.split(" "), function (c) {
        var f = d;y(f) && (f = !Nb(a, c));(f ? ob : nb)(a, c);
      });
    }, parent: function (a) {
      return (a = a.parentNode) && 11 !== a.nodeType ? a : null;
    }, next: function (a) {
      if (a.nextElementSibling) return a.nextElementSibling;
      for (a = a.nextSibling; null != a && 1 !== a.nodeType;) a = a.nextSibling;return a;
    }, find: function (a, c) {
      return a.getElementsByTagName ? a.getElementsByTagName(c) : [];
    }, clone: Kb, triggerHandler: function (a, c, d) {
      var e, f;e = c.type || c;var g = (oa(a, "events") || {})[e];g && (e = { preventDefault: function () {
          this.defaultPrevented = !0;
        }, isDefaultPrevented: function () {
          return !0 === this.defaultPrevented;
        }, stopPropagation: F, type: e, target: a }, c.type && (e = J(e, c)), c = ha(g), f = d ? [e].concat(d) : [e], r(c, function (c) {
        c.apply(a, f);
      }));
    } }, function (a, c) {
    S.prototype[c] = function (c, e, f) {
      for (var g, k = 0; k < this.length; k++) y(g) ? (g = a(this[k], c, e, f), z(g) && (g = v(g))) : Jb(g, a(this[k], c, e, f));return z(g) ? g : this;
    };S.prototype.bind = S.prototype.on;S.prototype.unbind = S.prototype.off;
  });bb.prototype = { put: function (a, c) {
      this[Ka(a, this.nextUid)] = c;
    }, get: function (a) {
      return this[Ka(a, this.nextUid)];
    }, remove: function (a) {
      var c = this[a = Ka(a, this.nextUid)];delete this[a];return c;
    } };var qe = /^function\s*[^\(]*\(\s*([^\)]*)\)/m,
      re = /,/,
      se = /^\s*(_?)(\S+?)\1\s*$/,
      pe = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
      cb = D("$injector"),
      Ne = D("$animate"),
      Md = ["$provide", function (a) {
    this.$$selectors = {};this.register = function (c, d) {
      var e = c + "-animation";if (c && "." != c.charAt(0)) throw Ne("notcsel", c);this.$$selectors[c.substr(1)] = e;a.factory(e, d);
    };this.classNameFilter = function (a) {
      1 === arguments.length && (this.$$classNameFilter = a instanceof RegExp ? a : null);return this.$$classNameFilter;
    };this.$get = ["$timeout", "$$asyncCallback", function (a, d) {
      return { enter: function (a, c, g, k) {
          g ? g.after(a) : (c && c[0] || (c = g.parent()), c.append(a));k && d(k);
        }, leave: function (a, c) {
          a.remove();c && d(c);
        }, move: function (a, c, d, k) {
          this.enter(a, c, d, k);
        }, addClass: function (a, c, g) {
          c = A(c) ? c : I(c) ? c.join(" ") : "";r(a, function (a) {
            ob(a, c);
          });g && d(g);
        }, removeClass: function (a, c, g) {
          c = A(c) ? c : I(c) ? c.join(" ") : "";r(a, function (a) {
            nb(a, c);
          });g && d(g);
        }, setClass: function (a, c, g, k) {
          r(a, function (a) {
            ob(a, c);nb(a, g);
          });k && d(k);
        }, enabled: F };
    }];
  }],
      ja = D("$compile");ic.$inject = ["$provide", "$$sanitizeUriProvider"];var we = /^(x[\:\-_]|data[\:\-_])/i,
      yc = D("$interpolate"),
      Oe = /^([^\?#]*)(\?([^#]*))?(#(.*))?$/,
      ze = { http: 80, https: 443, ftp: 21 },
      Sb = D("$location");Ub.prototype = Tb.prototype = Bc.prototype = { $$html5: !1, $$replace: !1, absUrl: tb("$$absUrl"), url: function (a) {
      if (y(a)) return this.$$url;a = Oe.exec(a);a[1] && this.path(decodeURIComponent(a[1]));(a[2] || a[1]) && this.search(a[3] || "");this.hash(a[5] || "");return this;
    }, protocol: tb("$$protocol"), host: tb("$$host"), port: tb("$$port"), path: Cc("$$path", function (a) {
      a = a ? a.toString() : "";return "/" == a.charAt(0) ? a : "/" + a;
    }), search: function (a, c) {
      switch (arguments.length) {case 0:
          return this.$$search;
        case 1:
          if (A(a) || ib(a)) a = a.toString(), this.$$search = ec(a);else if (T(a)) r(a, function (c, e) {
            null == c && delete a[e];
          }), this.$$search = a;else throw Sb("isrcharg");break;default:
          y(c) || null === c ? delete this.$$search[a] : this.$$search[a] = c;}this.$$compose();return this;
    }, hash: Cc("$$hash", function (a) {
      return a ? a.toString() : "";
    }), replace: function () {
      this.$$replace = !0;return this;
    } };var la = D("$parse"),
      Fc = {},
      wa,
      Pe = Function.prototype.call,
      Qe = Function.prototype.apply,
      Qc = Function.prototype.bind,
      gb = { "null": function () {
      return null;
    },
    "true": function () {
      return !0;
    }, "false": function () {
      return !1;
    }, undefined: F, "+": function (a, c, d, e) {
      d = d(a, c);e = e(a, c);return z(d) ? z(e) ? d + e : d : z(e) ? e : t;
    }, "-": function (a, c, d, e) {
      d = d(a, c);e = e(a, c);return (z(d) ? d : 0) - (z(e) ? e : 0);
    }, "*": function (a, c, d, e) {
      return d(a, c) * e(a, c);
    }, "/": function (a, c, d, e) {
      return d(a, c) / e(a, c);
    }, "%": function (a, c, d, e) {
      return d(a, c) % e(a, c);
    }, "^": function (a, c, d, e) {
      return d(a, c) ^ e(a, c);
    }, "=": F, "===": function (a, c, d, e) {
      return d(a, c) === e(a, c);
    }, "!==": function (a, c, d, e) {
      return d(a, c) !== e(a, c);
    }, "==": function (a, c, d, e) {
      return d(a, c) == e(a, c);
    }, "!=": function (a, c, d, e) {
      return d(a, c) != e(a, c);
    }, "<": function (a, c, d, e) {
      return d(a, c) < e(a, c);
    }, ">": function (a, c, d, e) {
      return d(a, c) > e(a, c);
    }, "<=": function (a, c, d, e) {
      return d(a, c) <= e(a, c);
    }, ">=": function (a, c, d, e) {
      return d(a, c) >= e(a, c);
    }, "&&": function (a, c, d, e) {
      return d(a, c) && e(a, c);
    }, "||": function (a, c, d, e) {
      return d(a, c) || e(a, c);
    }, "&": function (a, c, d, e) {
      return d(a, c) & e(a, c);
    }, "|": function (a, c, d, e) {
      return e(a, c)(a, c, d(a, c));
    }, "!": function (a, c, d) {
      return !d(a, c);
    } },
      Re = { n: "\n", f: "\f", r: "\r",
    t: "\t", v: "\v", "'": "'", '"': '"' },
      Wb = function (a) {
    this.options = a;
  };Wb.prototype = { constructor: Wb, lex: function (a) {
      this.text = a;this.index = 0;this.ch = t;this.lastCh = ":";for (this.tokens = []; this.index < this.text.length;) {
        this.ch = this.text.charAt(this.index);if (this.is("\"'")) this.readString(this.ch);else if (this.isNumber(this.ch) || this.is(".") && this.isNumber(this.peek())) this.readNumber();else if (this.isIdent(this.ch)) this.readIdent();else if (this.is("(){}[].,;:?")) this.tokens.push({ index: this.index, text: this.ch }), this.index++;else if (this.isWhitespace(this.ch)) {
          this.index++;continue;
        } else {
          a = this.ch + this.peek();var c = a + this.peek(2),
              d = gb[this.ch],
              e = gb[a],
              f = gb[c];f ? (this.tokens.push({ index: this.index, text: c, fn: f }), this.index += 3) : e ? (this.tokens.push({ index: this.index, text: a, fn: e }), this.index += 2) : d ? (this.tokens.push({ index: this.index, text: this.ch, fn: d }), this.index += 1) : this.throwError("Unexpected next character ", this.index, this.index + 1);
        }this.lastCh = this.ch;
      }return this.tokens;
    }, is: function (a) {
      return -1 !== a.indexOf(this.ch);
    },
    was: function (a) {
      return -1 !== a.indexOf(this.lastCh);
    }, peek: function (a) {
      a = a || 1;return this.index + a < this.text.length ? this.text.charAt(this.index + a) : !1;
    }, isNumber: function (a) {
      return "0" <= a && "9" >= a;
    }, isWhitespace: function (a) {
      return " " === a || "\r" === a || "\t" === a || "\n" === a || "\v" === a || "\u00a0" === a;
    }, isIdent: function (a) {
      return "a" <= a && "z" >= a || "A" <= a && "Z" >= a || "_" === a || "$" === a;
    }, isExpOperator: function (a) {
      return "-" === a || "+" === a || this.isNumber(a);
    }, throwError: function (a, c, d) {
      d = d || this.index;c = z(c) ? "s " + c + "-" + this.index + " [" + this.text.substring(c, d) + "]" : " " + d;throw la("lexerr", a, c, this.text);
    }, readNumber: function () {
      for (var a = "", c = this.index; this.index < this.text.length;) {
        var d = M(this.text.charAt(this.index));if ("." == d || this.isNumber(d)) a += d;else {
          var e = this.peek();if ("e" == d && this.isExpOperator(e)) a += d;else if (this.isExpOperator(d) && e && this.isNumber(e) && "e" == a.charAt(a.length - 1)) a += d;else if (!this.isExpOperator(d) || e && this.isNumber(e) || "e" != a.charAt(a.length - 1)) break;else this.throwError("Invalid exponent");
        }this.index++;
      }a *= 1;this.tokens.push({ index: c, text: a, literal: !0, constant: !0, fn: function () {
          return a;
        } });
    }, readIdent: function () {
      for (var a = this, c = "", d = this.index, e, f, g, k; this.index < this.text.length;) {
        k = this.text.charAt(this.index);if ("." === k || this.isIdent(k) || this.isNumber(k)) "." === k && (e = this.index), c += k;else break;this.index++;
      }if (e) for (f = this.index; f < this.text.length;) {
        k = this.text.charAt(f);if ("(" === k) {
          g = c.substr(e - d + 1);c = c.substr(0, e - d);this.index = f;break;
        }if (this.isWhitespace(k)) f++;else break;
      }d = { index: d, text: c };if (gb.hasOwnProperty(c)) d.fn = gb[c], d.literal = !0, d.constant = !0;else {
        var m = Ec(c, this.options, this.text);d.fn = J(function (a, c) {
          return m(a, c);
        }, { assign: function (d, e) {
            return ub(d, c, e, a.text, a.options);
          } });
      }this.tokens.push(d);g && (this.tokens.push({ index: e, text: "." }), this.tokens.push({ index: e + 1, text: g }));
    }, readString: function (a) {
      var c = this.index;this.index++;for (var d = "", e = a, f = !1; this.index < this.text.length;) {
        var g = this.text.charAt(this.index),
            e = e + g;if (f) "u" === g ? (f = this.text.substring(this.index + 1, this.index + 5), f.match(/[\da-f]{4}/i) || this.throwError("Invalid unicode escape [\\u" + f + "]"), this.index += 4, d += String.fromCharCode(parseInt(f, 16))) : d += Re[g] || g, f = !1;else if ("\\" === g) f = !0;else {
          if (g === a) {
            this.index++;this.tokens.push({ index: c, text: e, string: d, literal: !0, constant: !0, fn: function () {
                return d;
              } });return;
          }d += g;
        }this.index++;
      }this.throwError("Unterminated quote", c);
    } };var fb = function (a, c, d) {
    this.lexer = a;this.$filter = c;this.options = d;
  };fb.ZERO = J(function () {
    return 0;
  }, { constant: !0 });fb.prototype = { constructor: fb, parse: function (a) {
      this.text = a;this.tokens = this.lexer.lex(a);a = this.statements();0 !== this.tokens.length && this.throwError("is an unexpected token", this.tokens[0]);a.literal = !!a.literal;a.constant = !!a.constant;return a;
    }, primary: function () {
      var a;if (this.expect("(")) a = this.filterChain(), this.consume(")");else if (this.expect("[")) a = this.arrayDeclaration();else if (this.expect("{")) a = this.object();else {
        var c = this.expect();(a = c.fn) || this.throwError("not a primary expression", c);a.literal = !!c.literal;a.constant = !!c.constant;
      }for (var d; c = this.expect("(", "[", ".");) "(" === c.text ? (a = this.functionCall(a, d), d = null) : "[" === c.text ? (d = a, a = this.objectIndex(a)) : "." === c.text ? (d = a, a = this.fieldAccess(a)) : this.throwError("IMPOSSIBLE");return a;
    }, throwError: function (a, c) {
      throw la("syntax", c.text, a, c.index + 1, this.text, this.text.substring(c.index));
    }, peekToken: function () {
      if (0 === this.tokens.length) throw la("ueoe", this.text);return this.tokens[0];
    }, peek: function (a, c, d, e) {
      if (0 < this.tokens.length) {
        var f = this.tokens[0],
            g = f.text;if (g === a || g === c || g === d || g === e || !(a || c || d || e)) return f;
      }return !1;
    }, expect: function (a, c, d, e) {
      return (a = this.peek(a, c, d, e)) ? (this.tokens.shift(), a) : !1;
    }, consume: function (a) {
      this.expect(a) || this.throwError("is unexpected, expecting [" + a + "]", this.peek());
    }, unaryFn: function (a, c) {
      return J(function (d, e) {
        return a(d, e, c);
      }, { constant: c.constant });
    }, ternaryFn: function (a, c, d) {
      return J(function (e, f) {
        return a(e, f) ? c(e, f) : d(e, f);
      }, { constant: a.constant && c.constant && d.constant });
    }, binaryFn: function (a, c, d) {
      return J(function (e, f) {
        return c(e, f, a, d);
      }, { constant: a.constant && d.constant });
    }, statements: function () {
      for (var a = [];;) if (0 < this.tokens.length && !this.peek("}", ")", ";", "]") && a.push(this.filterChain()), !this.expect(";")) return 1 === a.length ? a[0] : function (c, d) {
        for (var e, f = 0; f < a.length; f++) {
          var g = a[f];g && (e = g(c, d));
        }return e;
      };
    }, filterChain: function () {
      for (var a = this.expression(), c;;) if (c = this.expect("|")) a = this.binaryFn(a, c.fn, this.filter());else return a;
    }, filter: function () {
      for (var a = this.expect(), c = this.$filter(a.text), d = [];;) if (a = this.expect(":")) d.push(this.expression());else {
        var e = function (a, e, k) {
          k = [k];for (var m = 0; m < d.length; m++) k.push(d[m](a, e));return c.apply(a, k);
        };return function () {
          return e;
        };
      }
    }, expression: function () {
      return this.assignment();
    }, assignment: function () {
      var a = this.ternary(),
          c,
          d;return (d = this.expect("=")) ? (a.assign || this.throwError("implies assignment but [" + this.text.substring(0, d.index) + "] can not be assigned to", d), c = this.ternary(), function (d, f) {
        return a.assign(d, c(d, f), f);
      }) : a;
    }, ternary: function () {
      var a = this.logicalOR(),
          c,
          d;if (this.expect("?")) {
        c = this.assignment();
        if (d = this.expect(":")) return this.ternaryFn(a, c, this.assignment());this.throwError("expected :", d);
      } else return a;
    }, logicalOR: function () {
      for (var a = this.logicalAND(), c;;) if (c = this.expect("||")) a = this.binaryFn(a, c.fn, this.logicalAND());else return a;
    }, logicalAND: function () {
      var a = this.equality(),
          c;if (c = this.expect("&&")) a = this.binaryFn(a, c.fn, this.logicalAND());return a;
    }, equality: function () {
      var a = this.relational(),
          c;if (c = this.expect("==", "!=", "===", "!==")) a = this.binaryFn(a, c.fn, this.equality());return a;
    },
    relational: function () {
      var a = this.additive(),
          c;if (c = this.expect("<", ">", "<=", ">=")) a = this.binaryFn(a, c.fn, this.relational());return a;
    }, additive: function () {
      for (var a = this.multiplicative(), c; c = this.expect("+", "-");) a = this.binaryFn(a, c.fn, this.multiplicative());return a;
    }, multiplicative: function () {
      for (var a = this.unary(), c; c = this.expect("*", "/", "%");) a = this.binaryFn(a, c.fn, this.unary());return a;
    }, unary: function () {
      var a;return this.expect("+") ? this.primary() : (a = this.expect("-")) ? this.binaryFn(fb.ZERO, a.fn, this.unary()) : (a = this.expect("!")) ? this.unaryFn(a.fn, this.unary()) : this.primary();
    }, fieldAccess: function (a) {
      var c = this,
          d = this.expect().text,
          e = Ec(d, this.options, this.text);return J(function (c, d, k) {
        return e(k || a(c, d));
      }, { assign: function (e, g, k) {
          (k = a(e, k)) || a.assign(e, k = {});return ub(k, d, g, c.text, c.options);
        } });
    }, objectIndex: function (a) {
      var c = this,
          d = this.expression();this.consume("]");return J(function (e, f) {
        var g = a(e, f),
            k = d(e, f),
            m;ka(k, c.text);if (!g) return t;(g = va(g[k], c.text)) && g.then && c.options.unwrapPromises && (m = g, "$$v" in g || (m.$$v = t, m.then(function (a) {
          m.$$v = a;
        })), g = g.$$v);return g;
      }, { assign: function (e, f, g) {
          var k = ka(d(e, g), c.text);(g = va(a(e, g), c.text)) || a.assign(e, g = {});return g[k] = f;
        } });
    }, functionCall: function (a, c) {
      var d = [];if (")" !== this.peekToken().text) {
        do d.push(this.expression()); while (this.expect(","));
      }this.consume(")");var e = this;return function (f, g) {
        for (var k = [], m = c ? c(f, g) : f, h = 0; h < d.length; h++) k.push(va(d[h](f, g), e.text));h = a(f, g, m) || F;va(m, e.text);var l = e.text;if (h) {
          if (h.constructor === h) throw la("isecfn", l);if (h === Pe || h === Qe || Qc && h === Qc) throw la("isecff", l);
        }k = h.apply ? h.apply(m, k) : h(k[0], k[1], k[2], k[3], k[4]);return va(k, e.text);
      };
    }, arrayDeclaration: function () {
      var a = [],
          c = !0;if ("]" !== this.peekToken().text) {
        do {
          if (this.peek("]")) break;var d = this.expression();a.push(d);d.constant || (c = !1);
        } while (this.expect(","));
      }this.consume("]");return J(function (c, d) {
        for (var g = [], k = 0; k < a.length; k++) g.push(a[k](c, d));return g;
      }, { literal: !0, constant: c });
    }, object: function () {
      var a = [],
          c = !0;if ("}" !== this.peekToken().text) {
        do {
          if (this.peek("}")) break;
          var d = this.expect(),
              d = d.string || d.text;this.consume(":");var e = this.expression();a.push({ key: d, value: e });e.constant || (c = !1);
        } while (this.expect(","));
      }this.consume("}");return J(function (c, d) {
        for (var e = {}, m = 0; m < a.length; m++) {
          var h = a[m];e[h.key] = h.value(c, d);
        }return e;
      }, { literal: !0, constant: c });
    } };var Vb = {},
      xa = D("$sce"),
      ga = { HTML: "html", CSS: "css", URL: "url", RESOURCE_URL: "resourceUrl", JS: "js" },
      Y = X.createElement("a"),
      Hc = ua(W.location.href, !0);mc.$inject = ["$provide"];Ic.$inject = ["$locale"];Kc.$inject = ["$locale"];
  var Nc = ".",
      Je = { yyyy: $("FullYear", 4), yy: $("FullYear", 2, 0, !0), y: $("FullYear", 1), MMMM: vb("Month"), MMM: vb("Month", !0), MM: $("Month", 2, 1), M: $("Month", 1, 1), dd: $("Date", 2), d: $("Date", 1), HH: $("Hours", 2), H: $("Hours", 1), hh: $("Hours", 2, -12), h: $("Hours", 1, -12), mm: $("Minutes", 2), m: $("Minutes", 1), ss: $("Seconds", 2), s: $("Seconds", 1), sss: $("Milliseconds", 3), EEEE: vb("Day"), EEE: vb("Day", !0), a: function (a, c) {
      return 12 > a.getHours() ? c.AMPMS[0] : c.AMPMS[1];
    }, Z: function (a) {
      a = -1 * a.getTimezoneOffset();return a = (0 <= a ? "+" : "") + (Xb(Math[0 < a ? "floor" : "ceil"](a / 60), 2) + Xb(Math.abs(a % 60), 2));
    } },
      Ie = /((?:[^yMdHhmsaZE']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|d+|H+|h+|m+|s+|a|Z))(.*)/,
      He = /^\-?\d+$/;Jc.$inject = ["$locale"];var Fe = ba(M),
      Ge = ba(Ia);Lc.$inject = ["$parse"];var dd = ba({ restrict: "E", compile: function (a, c) {
      8 >= Q && (c.href || c.name || c.$set("href", ""), a.append(X.createComment("IE fix")));if (!c.href && !c.xlinkHref && !c.name) return function (a, c) {
        var f = "[object SVGAnimatedString]" === za.call(c.prop("href")) ? "xlink:href" : "href";c.on("click", function (a) {
          c.attr(f) || a.preventDefault();
        });
      };
    } }),
      Fb = {};r(qb, function (a, c) {
    if ("multiple" != a) {
      var d = pa("ng-" + c);Fb[d] = function () {
        return { priority: 100, link: function (a, f, g) {
            a.$watch(g[d], function (a) {
              g.$set(c, !!a);
            });
          } };
      };
    }
  });r(["src", "srcset", "href"], function (a) {
    var c = pa("ng-" + a);Fb[c] = function () {
      return { priority: 99, link: function (d, e, f) {
          var g = a,
              k = a;"href" === a && "[object SVGAnimatedString]" === za.call(e.prop("href")) && (k = "xlinkHref", f.$attr[k] = "xlink:href", g = null);f.$observe(c, function (c) {
            c ? (f.$set(k, c), Q && g && e.prop(g, f[k])) : "href" === a && f.$set(k, null);
          });
        } };
    };
  });var yb = { $addControl: F, $removeControl: F, $setValidity: F, $setDirty: F, $setPristine: F };Oc.$inject = ["$element", "$attrs", "$scope", "$animate"];var Rc = function (a) {
    return ["$timeout", function (c) {
      return { name: "form", restrict: a ? "EAC" : "E", controller: Oc, compile: function () {
          return { pre: function (a, e, f, g) {
              if (!f.action) {
                var k = function (a) {
                  a.preventDefault ? a.preventDefault() : a.returnValue = !1;
                };sb(e[0], "submit", k);e.on("$destroy", function () {
                  c(function () {
                    $a(e[0], "submit", k);
                  }, 0, !1);
                });
              }var m = e.parent().controller("form"),
                  h = f.name || f.ngForm;h && ub(a, h, g, h);if (m) e.on("$destroy", function () {
                m.$removeControl(g);h && ub(a, h, t, h);J(g, yb);
              });
            } };
        } };
    }];
  },
      ed = Rc(),
      rd = Rc(!0),
      Se = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
      Te = /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
      Ue = /^\s*(\-|\+)?(\d+|(\d*(\.\d*)))\s*$/,
      Sc = { text: Ab, number: function (a, c, d, e, f, g) {
      Ab(a, c, d, e, f, g);e.$parsers.push(function (a) {
        var c = e.$isEmpty(a);if (c || Ue.test(a)) return e.$setValidity("number", !0), "" === a ? null : c ? a : parseFloat(a);e.$setValidity("number", !1);return t;
      });Ke(e, "number", Ve, null, e.$$validityState);e.$formatters.push(function (a) {
        return e.$isEmpty(a) ? "" : "" + a;
      });d.min && (a = function (a) {
        var c = parseFloat(d.min);return sa(e, "min", e.$isEmpty(a) || a >= c, a);
      }, e.$parsers.push(a), e.$formatters.push(a));d.max && (a = function (a) {
        var c = parseFloat(d.max);return sa(e, "max", e.$isEmpty(a) || a <= c, a);
      }, e.$parsers.push(a), e.$formatters.push(a));e.$formatters.push(function (a) {
        return sa(e, "number", e.$isEmpty(a) || ib(a), a);
      });
    }, url: function (a, c, d, e, f, g) {
      Ab(a, c, d, e, f, g);a = function (a) {
        return sa(e, "url", e.$isEmpty(a) || Se.test(a), a);
      };e.$formatters.push(a);e.$parsers.push(a);
    }, email: function (a, c, d, e, f, g) {
      Ab(a, c, d, e, f, g);a = function (a) {
        return sa(e, "email", e.$isEmpty(a) || Te.test(a), a);
      };e.$formatters.push(a);e.$parsers.push(a);
    }, radio: function (a, c, d, e) {
      y(d.name) && c.attr("name", hb());c.on("click", function () {
        c[0].checked && a.$apply(function () {
          e.$setViewValue(d.value);
        });
      });e.$render = function () {
        c[0].checked = d.value == e.$viewValue;
      };
      d.$observe("value", e.$render);
    }, checkbox: function (a, c, d, e) {
      var f = d.ngTrueValue,
          g = d.ngFalseValue;A(f) || (f = !0);A(g) || (g = !1);c.on("click", function () {
        a.$apply(function () {
          e.$setViewValue(c[0].checked);
        });
      });e.$render = function () {
        c[0].checked = e.$viewValue;
      };e.$isEmpty = function (a) {
        return a !== f;
      };e.$formatters.push(function (a) {
        return a === f;
      });e.$parsers.push(function (a) {
        return a ? f : g;
      });
    }, hidden: F, button: F, submit: F, reset: F, file: F },
      Ve = ["badInput"],
      jc = ["$browser", "$sniffer", function (a, c) {
    return { restrict: "E", require: "?ngModel",
      link: function (d, e, f, g) {
        g && (Sc[M(f.type)] || Sc.text)(d, e, f, g, c, a);
      } };
  }],
      wb = "ng-valid",
      xb = "ng-invalid",
      Oa = "ng-pristine",
      zb = "ng-dirty",
      We = ["$scope", "$exceptionHandler", "$attrs", "$element", "$parse", "$animate", function (a, c, d, e, f, g) {
    function k(a, c) {
      c = c ? "-" + mb(c, "-") : "";g.removeClass(e, (a ? xb : wb) + c);g.addClass(e, (a ? wb : xb) + c);
    }this.$modelValue = this.$viewValue = Number.NaN;this.$parsers = [];this.$formatters = [];this.$viewChangeListeners = [];this.$pristine = !0;this.$dirty = !1;this.$valid = !0;this.$invalid = !1;this.$name = d.name;var m = f(d.ngModel),
        h = m.assign;if (!h) throw D("ngModel")("nonassign", d.ngModel, ia(e));this.$render = F;this.$isEmpty = function (a) {
      return y(a) || "" === a || null === a || a !== a;
    };var l = e.inheritedData("$formController") || yb,
        n = 0,
        p = this.$error = {};e.addClass(Oa);k(!0);this.$setValidity = function (a, c) {
      p[a] !== !c && (c ? (p[a] && n--, n || (k(!0), this.$valid = !0, this.$invalid = !1)) : (k(!1), this.$invalid = !0, this.$valid = !1, n++), p[a] = !c, k(c, a), l.$setValidity(a, c, this));
    };this.$setPristine = function () {
      this.$dirty = !1;this.$pristine = !0;g.removeClass(e, zb);g.addClass(e, Oa);
    };this.$setViewValue = function (d) {
      this.$viewValue = d;this.$pristine && (this.$dirty = !0, this.$pristine = !1, g.removeClass(e, Oa), g.addClass(e, zb), l.$setDirty());r(this.$parsers, function (a) {
        d = a(d);
      });this.$modelValue !== d && (this.$modelValue = d, h(a, d), r(this.$viewChangeListeners, function (a) {
        try {
          a();
        } catch (d) {
          c(d);
        }
      }));
    };var q = this;a.$watch(function () {
      var c = m(a);if (q.$modelValue !== c) {
        var d = q.$formatters,
            e = d.length;for (q.$modelValue = c; e--;) c = d[e](c);q.$viewValue !== c && (q.$viewValue = c, q.$render());
      }return c;
    });
  }],
      Gd = function () {
    return { require: ["ngModel", "^?form"], controller: We, link: function (a, c, d, e) {
        var f = e[0],
            g = e[1] || yb;g.$addControl(f);a.$on("$destroy", function () {
          g.$removeControl(f);
        });
      } };
  },
      Id = ba({ require: "ngModel", link: function (a, c, d, e) {
      e.$viewChangeListeners.push(function () {
        a.$eval(d.ngChange);
      });
    } }),
      kc = function () {
    return { require: "?ngModel", link: function (a, c, d, e) {
        if (e) {
          d.required = !0;var f = function (a) {
            if (d.required && e.$isEmpty(a)) e.$setValidity("required", !1);else return e.$setValidity("required", !0), a;
          };e.$formatters.push(f);e.$parsers.unshift(f);d.$observe("required", function () {
            f(e.$viewValue);
          });
        }
      } };
  },
      Hd = function () {
    return { require: "ngModel", link: function (a, c, d, e) {
        var f = (a = /\/(.*)\//.exec(d.ngList)) && RegExp(a[1]) || d.ngList || ",";e.$parsers.push(function (a) {
          if (!y(a)) {
            var c = [];a && r(a.split(f), function (a) {
              a && c.push(aa(a));
            });return c;
          }
        });e.$formatters.push(function (a) {
          return I(a) ? a.join(", ") : t;
        });e.$isEmpty = function (a) {
          return !a || !a.length;
        };
      } };
  },
      Xe = /^(true|false|\d+)$/,
      Jd = function () {
    return { priority: 100,
      compile: function (a, c) {
        return Xe.test(c.ngValue) ? function (a, c, f) {
          f.$set("value", a.$eval(f.ngValue));
        } : function (a, c, f) {
          a.$watch(f.ngValue, function (a) {
            f.$set("value", a);
          });
        };
      } };
  },
      jd = ya({ compile: function (a) {
      a.addClass("ng-binding");return function (a, d, e) {
        d.data("$binding", e.ngBind);a.$watch(e.ngBind, function (a) {
          d.text(a == t ? "" : a);
        });
      };
    } }),
      ld = ["$interpolate", function (a) {
    return function (c, d, e) {
      c = a(d.attr(e.$attr.ngBindTemplate));d.addClass("ng-binding").data("$binding", c);e.$observe("ngBindTemplate", function (a) {
        d.text(a);
      });
    };
  }],
      kd = ["$sce", "$parse", function (a, c) {
    return { compile: function (d) {
        d.addClass("ng-binding");return function (d, f, g) {
          f.data("$binding", g.ngBindHtml);var k = c(g.ngBindHtml);d.$watch(function () {
            return (k(d) || "").toString();
          }, function (c) {
            f.html(a.getTrustedHtml(k(d)) || "");
          });
        };
      } };
  }],
      md = Yb("", !0),
      od = Yb("Odd", 0),
      nd = Yb("Even", 1),
      pd = ya({ compile: function (a, c) {
      c.$set("ngCloak", t);a.removeClass("ng-cloak");
    } }),
      qd = [function () {
    return { scope: !0, controller: "@", priority: 500 };
  }],
      lc = {},
      Ye = { blur: !0, focus: !0 };r("click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste".split(" "), function (a) {
    var c = pa("ng-" + a);lc[c] = ["$parse", "$rootScope", function (d, e) {
      return { compile: function (f, g) {
          var k = d(g[c]);return function (c, d) {
            d.on(a, function (d) {
              var f = function () {
                k(c, { $event: d });
              };Ye[a] && e.$$phase ? c.$evalAsync(f) : c.$apply(f);
            });
          };
        } };
    }];
  });var td = ["$animate", function (a) {
    return { transclude: "element", priority: 600, terminal: !0, restrict: "A", $$tlb: !0, link: function (c, d, e, f, g) {
        var k, m, h;c.$watch(e.ngIf, function (f) {
          Ua(f) ? m || (m = c.$new(), g(m, function (c) {
            c[c.length++] = X.createComment(" end ngIf: " + e.ngIf + " ");k = { clone: c };a.enter(c, d.parent(), d);
          })) : (h && (h.remove(), h = null), m && (m.$destroy(), m = null), k && (h = Eb(k.clone), a.leave(h, function () {
            h = null;
          }), k = null));
        });
      } };
  }],
      ud = ["$http", "$templateCache", "$anchorScroll", "$animate", "$sce", function (a, c, d, e, f) {
    return { restrict: "ECA", priority: 400, terminal: !0, transclude: "element", controller: Va.noop, compile: function (g, k) {
        var m = k.ngInclude || k.src,
            h = k.onload || "",
            l = k.autoscroll;return function (g, k, q, r, E) {
          var u = 0,
              t,
              v,
              R,
              w = function () {
            v && (v.remove(), v = null);t && (t.$destroy(), t = null);
            R && (e.leave(R, function () {
              v = null;
            }), v = R, R = null);
          };g.$watch(f.parseAsResourceUrl(m), function (f) {
            var m = function () {
              !z(l) || l && !g.$eval(l) || d();
            },
                q = ++u;f ? (a.get(f, { cache: c }).success(function (a) {
              if (q === u) {
                var c = g.$new();r.template = a;a = E(c, function (a) {
                  w();e.enter(a, null, k, m);
                });t = c;R = a;t.$emit("$includeContentLoaded");g.$eval(h);
              }
            }).error(function () {
              q === u && w();
            }), g.$emit("$includeContentRequested")) : (w(), r.template = null);
          });
        };
      } };
  }],
      Kd = ["$compile", function (a) {
    return { restrict: "ECA", priority: -400, require: "ngInclude",
      link: function (c, d, e, f) {
        d.html(f.template);a(d.contents())(c);
      } };
  }],
      vd = ya({ priority: 450, compile: function () {
      return { pre: function (a, c, d) {
          a.$eval(d.ngInit);
        } };
    } }),
      wd = ya({ terminal: !0, priority: 1E3 }),
      xd = ["$locale", "$interpolate", function (a, c) {
    var d = /{}/g;return { restrict: "EA", link: function (e, f, g) {
        var k = g.count,
            m = g.$attr.when && f.attr(g.$attr.when),
            h = g.offset || 0,
            l = e.$eval(m) || {},
            n = {},
            p = c.startSymbol(),
            q = c.endSymbol(),
            s = /^when(Minus)?(.+)$/;r(g, function (a, c) {
          s.test(c) && (l[M(c.replace("when", "").replace("Minus", "-"))] = f.attr(g.$attr[c]));
        });r(l, function (a, e) {
          n[e] = c(a.replace(d, p + k + "-" + h + q));
        });e.$watch(function () {
          var c = parseFloat(e.$eval(k));if (isNaN(c)) return "";c in l || (c = a.pluralCat(c - h));return n[c](e, f, !0);
        }, function (a) {
          f.text(a);
        });
      } };
  }],
      yd = ["$parse", "$animate", function (a, c) {
    var d = D("ngRepeat");return { transclude: "element", priority: 1E3, terminal: !0, $$tlb: !0, link: function (e, f, g, k, m) {
        var h = g.ngRepeat,
            l = h.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/),
            n,
            p,
            q,
            s,
            t,
            u,
            B = { $id: Ka };if (!l) throw d("iexp", h);g = l[1];k = l[2];(l = l[3]) ? (n = a(l), p = function (a, c, d) {
          u && (B[u] = a);B[t] = c;B.$index = d;return n(e, B);
        }) : (q = function (a, c) {
          return Ka(c);
        }, s = function (a) {
          return a;
        });l = g.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);if (!l) throw d("iidexp", g);t = l[3] || l[1];u = l[2];var z = {};e.$watchCollection(k, function (a) {
          var g,
              k,
              l = f[0],
              n,
              B = {},
              C,
              x,
              H,
              A,
              F,
              D,
              y,
              I = [];if (Pa(a)) D = a, F = p || q;else {
            F = p || s;D = [];for (H in a) a.hasOwnProperty(H) && "$" != H.charAt(0) && D.push(H);D.sort();
          }C = D.length;k = I.length = D.length;for (g = 0; g < k; g++) if (H = a === D ? g : D[g], A = a[H], n = F(H, A, g), Da(n, "`track by` id"), z.hasOwnProperty(n)) y = z[n], delete z[n], B[n] = y, I[g] = y;else {
            if (B.hasOwnProperty(n)) throw r(I, function (a) {
              a && a.scope && (z[a.id] = a);
            }), d("dupes", h, n, na(A));I[g] = { id: n };B[n] = !1;
          }for (H in z) z.hasOwnProperty(H) && (y = z[H], g = Eb(y.clone), c.leave(g), r(g, function (a) {
            a.$$NG_REMOVED = !0;
          }), y.scope.$destroy());g = 0;for (k = D.length; g < k; g++) {
            H = a === D ? g : D[g];A = a[H];y = I[g];I[g - 1] && (l = I[g - 1].clone[I[g - 1].clone.length - 1]);if (y.scope) {
              x = y.scope;n = l;do n = n.nextSibling; while (n && n.$$NG_REMOVED);
              y.clone[0] != n && c.move(Eb(y.clone), null, v(l));l = y.clone[y.clone.length - 1];
            } else x = e.$new();x[t] = A;u && (x[u] = H);x.$index = g;x.$first = 0 === g;x.$last = g === C - 1;x.$middle = !(x.$first || x.$last);x.$odd = !(x.$even = 0 === (g & 1));y.scope || m(x, function (a) {
              a[a.length++] = X.createComment(" end ngRepeat: " + h + " ");c.enter(a, null, v(l));l = a;y.scope = x;y.clone = a;B[y.id] = y;
            });
          }z = B;
        });
      } };
  }],
      zd = ["$animate", function (a) {
    return function (c, d, e) {
      c.$watch(e.ngShow, function (c) {
        a[Ua(c) ? "removeClass" : "addClass"](d, "ng-hide");
      });
    };
  }],
      sd = ["$animate", function (a) {
    return function (c, d, e) {
      c.$watch(e.ngHide, function (c) {
        a[Ua(c) ? "addClass" : "removeClass"](d, "ng-hide");
      });
    };
  }],
      Ad = ya(function (a, c, d) {
    a.$watch(d.ngStyle, function (a, d) {
      d && a !== d && r(d, function (a, d) {
        c.css(d, "");
      });a && c.css(a);
    }, !0);
  }),
      Bd = ["$animate", function (a) {
    return { restrict: "EA", require: "ngSwitch", controller: ["$scope", function () {
        this.cases = {};
      }], link: function (c, d, e, f) {
        var g = [],
            k = [],
            m = [],
            h = [];c.$watch(e.ngSwitch || e.on, function (d) {
          var n, p;n = 0;for (p = m.length; n < p; ++n) m[n].remove();n = m.length = 0;for (p = h.length; n < p; ++n) {
            var q = k[n];h[n].$destroy();m[n] = q;a.leave(q, function () {
              m.splice(n, 1);
            });
          }k.length = 0;h.length = 0;if (g = f.cases["!" + d] || f.cases["?"]) c.$eval(e.change), r(g, function (d) {
            var e = c.$new();h.push(e);d.transclude(e, function (c) {
              var e = d.element;k.push(c);a.enter(c, e.parent(), e);
            });
          });
        });
      } };
  }],
      Cd = ya({ transclude: "element", priority: 800, require: "^ngSwitch", link: function (a, c, d, e, f) {
      e.cases["!" + d.ngSwitchWhen] = e.cases["!" + d.ngSwitchWhen] || [];e.cases["!" + d.ngSwitchWhen].push({ transclude: f, element: c });
    } }),
      Dd = ya({ transclude: "element", priority: 800, require: "^ngSwitch", link: function (a, c, d, e, f) {
      e.cases["?"] = e.cases["?"] || [];e.cases["?"].push({ transclude: f, element: c });
    } }),
      Fd = ya({ link: function (a, c, d, e, f) {
      if (!f) throw D("ngTransclude")("orphan", ia(c));f(function (a) {
        c.empty();c.append(a);
      });
    } }),
      fd = ["$templateCache", function (a) {
    return { restrict: "E", terminal: !0, compile: function (c, d) {
        "text/ng-template" == d.type && a.put(d.id, c[0].text);
      } };
  }],
      Ze = D("ngOptions"),
      Ed = ba({ terminal: !0 }),
      gd = ["$compile", "$parse", function (a, c) {
    var d = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/,
        e = { $setViewValue: F };return { restrict: "E", require: ["select", "?ngModel"], controller: ["$element", "$scope", "$attrs", function (a, c, d) {
        var m = this,
            h = {},
            l = e,
            n;m.databound = d.ngModel;m.init = function (a, c, d) {
          l = a;n = d;
        };m.addOption = function (c) {
          Da(c, '"option value"');h[c] = !0;l.$viewValue == c && (a.val(c), n.parent() && n.remove());
        };
        m.removeOption = function (a) {
          this.hasOption(a) && (delete h[a], l.$viewValue == a && this.renderUnknownOption(a));
        };m.renderUnknownOption = function (c) {
          c = "? " + Ka(c) + " ?";n.val(c);a.prepend(n);a.val(c);n.prop("selected", !0);
        };m.hasOption = function (a) {
          return h.hasOwnProperty(a);
        };c.$on("$destroy", function () {
          m.renderUnknownOption = F;
        });
      }], link: function (e, g, k, m) {
        function h(a, c, d, e) {
          d.$render = function () {
            var a = d.$viewValue;e.hasOption(a) ? (A.parent() && A.remove(), c.val(a), "" === a && u.prop("selected", !0)) : y(a) && u ? c.val("") : e.renderUnknownOption(a);
          };
          c.on("change", function () {
            a.$apply(function () {
              A.parent() && A.remove();d.$setViewValue(c.val());
            });
          });
        }function l(a, c, d) {
          var e;d.$render = function () {
            var a = new bb(d.$viewValue);r(c.find("option"), function (c) {
              c.selected = z(a.get(c.value));
            });
          };a.$watch(function () {
            Aa(e, d.$viewValue) || (e = ha(d.$viewValue), d.$render());
          });c.on("change", function () {
            a.$apply(function () {
              var a = [];r(c.find("option"), function (c) {
                c.selected && a.push(c.value);
              });d.$setViewValue(a);
            });
          });
        }function n(e, f, g) {
          function k() {
            var a = { "": [] },
                c = [""],
                d,
                h,
                s,
                t,
                w;s = g.$modelValue;t = u(e) || [];var A = n ? Zb(t) : t,
                F,
                L,
                x;L = {};x = !1;if (q) if (h = g.$modelValue, v && I(h)) for (x = new bb([]), d = {}, w = 0; w < h.length; w++) d[m] = h[w], x.put(v(e, d), h[w]);else x = new bb(h);w = x;var C, J;for (x = 0; F = A.length, x < F; x++) {
              h = x;if (n) {
                h = A[x];if ("$" === h.charAt(0)) continue;L[n] = h;
              }L[m] = t[h];d = p(e, L) || "";(h = a[d]) || (h = a[d] = [], c.push(d));q ? d = z(w.remove(v ? v(e, L) : r(e, L))) : (v ? (d = {}, d[m] = s, d = v(e, d) === v(e, L)) : d = s === r(e, L), w = w || d);C = l(e, L);C = z(C) ? C : "";h.push({ id: v ? v(e, L) : n ? A[x] : x, label: C, selected: d });
            }q || (E || null === s ? a[""].unshift({ id: "", label: "", selected: !w }) : w || a[""].unshift({ id: "?", label: "", selected: !0 }));L = 0;for (A = c.length; L < A; L++) {
              d = c[L];h = a[d];y.length <= L ? (s = { element: D.clone().attr("label", d), label: h.label }, t = [s], y.push(t), f.append(s.element)) : (t = y[L], s = t[0], s.label != d && s.element.attr("label", s.label = d));C = null;x = 0;for (F = h.length; x < F; x++) d = h[x], (w = t[x + 1]) ? (C = w.element, w.label !== d.label && C.text(w.label = d.label), w.id !== d.id && C.val(w.id = d.id), C[0].selected !== d.selected && (C.prop("selected", w.selected = d.selected), Q && C.prop("selected", w.selected))) : ("" === d.id && E ? J = E : (J = B.clone()).val(d.id).prop("selected", d.selected).attr("selected", d.selected).text(d.label), t.push({ element: J, label: d.label, id: d.id, selected: d.selected }), C ? C.after(J) : s.element.append(J), C = J);for (x++; t.length > x;) t.pop().element.remove();
            }for (; y.length > L;) y.pop()[0].element.remove();
          }var h;if (!(h = s.match(d))) throw Ze("iexp", s, ia(f));var l = c(h[2] || h[1]),
              m = h[4] || h[6],
              n = h[5],
              p = c(h[3] || ""),
              r = c(h[2] ? h[1] : m),
              u = c(h[7]),
              v = h[8] ? c(h[8]) : null,
              y = [[{ element: f,
            label: "" }]];E && (a(E)(e), E.removeClass("ng-scope"), E.remove());f.empty();f.on("change", function () {
            e.$apply(function () {
              var a,
                  c = u(e) || [],
                  d = {},
                  h,
                  l,
                  p,
                  s,
                  w,
                  z,
                  x;if (q) for (l = [], s = 0, z = y.length; s < z; s++) for (a = y[s], p = 1, w = a.length; p < w; p++) {
                if ((h = a[p].element)[0].selected) {
                  h = h.val();n && (d[n] = h);if (v) for (x = 0; x < c.length && (d[m] = c[x], v(e, d) != h); x++);else d[m] = c[h];l.push(r(e, d));
                }
              } else if (h = f.val(), "?" == h) l = t;else if ("" === h) l = null;else if (v) for (x = 0; x < c.length; x++) {
                if (d[m] = c[x], v(e, d) == h) {
                  l = r(e, d);break;
                }
              } else d[m] = c[h], n && (d[n] = h), l = r(e, d);g.$setViewValue(l);k();
            });
          });g.$render = k;e.$watchCollection(u, k);e.$watchCollection(function () {
            var a = {},
                c = u(e);if (c) {
              for (var d = Array(c.length), f = 0, g = c.length; f < g; f++) a[m] = c[f], d[f] = l(e, a);return d;
            }
          }, k);q && e.$watchCollection(function () {
            return g.$modelValue;
          }, k);
        }if (m[1]) {
          var p = m[0];m = m[1];var q = k.multiple,
              s = k.ngOptions,
              E = !1,
              u,
              B = v(X.createElement("option")),
              D = v(X.createElement("optgroup")),
              A = B.clone();k = 0;for (var w = g.children(), F = w.length; k < F; k++) if ("" === w[k].value) {
            u = E = w.eq(k);break;
          }p.init(m, E, A);q && (m.$isEmpty = function (a) {
            return !a || 0 === a.length;
          });s ? n(e, g, m) : q ? l(e, g, m) : h(e, g, m, p);
        }
      } };
  }],
      id = ["$interpolate", function (a) {
    var c = { addOption: F, removeOption: F };return { restrict: "E", priority: 100, compile: function (d, e) {
        if (y(e.value)) {
          var f = a(d.text(), !0);f || e.$set("value", d.text());
        }return function (a, d, e) {
          var h = d.parent(),
              l = h.data("$selectController") || h.parent().data("$selectController");l && l.databound ? d.prop("selected", !1) : l = c;f ? a.$watch(f, function (a, c) {
            e.$set("value", a);a !== c && l.removeOption(c);l.addOption(a);
          }) : l.addOption(e.value);d.on("$destroy", function () {
            l.removeOption(e.value);
          });
        };
      } };
  }],
      hd = ba({ restrict: "E", terminal: !0 });W.angular.bootstrap ? console.log("WARNING: Tried to load angular more than once.") : ((Ea = W.jQuery) && Ea.fn.on ? (v = Ea, J(Ea.fn, { scope: La.scope, isolateScope: La.isolateScope, controller: La.controller, injector: La.injector, inheritedData: La.inheritedData }), Gb("remove", !0, !0, !1), Gb("empty", !1, !1, !1), Gb("html", !1, !1, !0)) : v = S, Va.element = v, $c(Va), v(X).ready(function () {
    Xc(X, fc);
  }));
})(window, document);
!window.angular.$$csp() && window.angular.element(document).find("head").prepend('<style type="text/css">@charset "UTF-8";[ng\\:cloak],[ng-cloak],[data-ng-cloak],[x-ng-cloak],.ng-cloak,.x-ng-cloak,.ng-hide{display:none !important;}ng\\:form{display:block;}.ng-animate-block-transitions{transition:0s all!important;-webkit-transition:0s all!important;}.ng-hide-add-active,.ng-hide-remove{display:block!important;}</style>');

},{}],5:[function(require,module,exports){
var Configs = {
	router: function ($stateProvider, $urlRouterProvider, USER_ROLES) {

		this.home = {
			name: 'home',
			url: '/',
			templateUrl: 'views/home.html',
			controller: 'HomeCtrl'
			//resolve: load('./controllers/scroll.js'),
			/*
   resolve: {
   	loadPlugin: function ($ocLazyLoad) {
   		return $ocLazyLoad.load([
   			{
                            files: ['assets/vendor/revslider/js/jquery.themepunch.tools.min.js']
                        },
   			{
   				name: 'revslider',
                         files: ["assets/vendor/revslider/js/jquery.themepunch.revolution.min.js"]
   			}
   		]);
   	}
   }
   */
		};
		$urlRouterProvider.otherwise('/');
		$stateProvider.state(this.home);
	}
};

module.exports = Configs;

},{}],6:[function(require,module,exports){
function HomeCtrl($scope, watchID, Socket) {
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
        console.log(position);
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
        console.log(coord);
        // Emit a message event
        Socket.emit('coord', coord);
    }

    /* geoLoc.watchPosition event error handler */
    function watchError(err) {
        alert('Error' + err.code + ' msg: ' + err.message);
    }
};

module.exports = HomeCtrl;

},{}],7:[function(require,module,exports){
var angular = require('angular-last');
var ocLazyLoad = require('ocLazyLoad');
var modules = [require('angular-ui-router'), 'oc.lazyLoad'];
var app = angular.module('app', modules);

/* VALUES */

app.value("map", {}).value("watchID", null);
app.config(function ($provide, $httpProvider, $locationProvider, $ocLazyLoadProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
  $ocLazyLoadProvider.config({
    debug: false
  });
});

app.config(['$stateProvider', '$urlRouterProvider', require('./configs').router]);
app.service('Socket', ['$state', '$timeout', function ($state, $timeout) {
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
}]);
app.controller('HomeCtrl', ['$scope', 'watchID', 'Socket', require('./controllers/HomeCtrl.js')]);
angular.element(document).ready(function () {
  angular.bootstrap(document, ['app']);
});

},{"./configs":5,"./controllers/HomeCtrl.js":6,"angular-last":3,"angular-ui-router":1,"ocLazyLoad":2}]},{},[7]);
