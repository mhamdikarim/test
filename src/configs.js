var Configs = {
	router: function($stateProvider, $urlRouterProvider,USER_ROLES) {

		this.home = {
			name: 'home',
			url: '/',
			templateUrl: 'views/home.html',
			controller: 'HomeCtrl'
			/*
			resolve: {
				loadPlugin: function ($ocLazyLoad) {
					return $ocLazyLoad.load([
						{
                            files: ['']
                        },
						{
							name: 'revslider',
	                        files: [""]
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
 