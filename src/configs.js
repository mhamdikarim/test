var Configs = {
	router: function($stateProvider, $urlRouterProvider,USER_ROLES) {

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
	 	$stateProvider
		.state(this.home)
	}
}

module.exports = Configs;
 