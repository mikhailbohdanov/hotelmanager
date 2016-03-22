'use strict';
var CONTROLLERS = {
    login           : 'users',
    options         : 'options',
    hotels          : 'hotels',
    hotelNumbers    : 'hotelNumbers',
    users           : 'users'
};


var TEMPLATES   = {};
$('script[type="angular/template"]').each(function(i, element) {
    element = $(element);
    TEMPLATES[element.attr('id')]   = element.text();
});

var storage = angular.module('Storage', ['firebase']);
storage.factory(
    'hotelStorage',
    [
        '$firebase',
        function($fireBase) {
            var storage,
                cache   = {},
                link    = new Firebase('https://hotel-manager.firebaseio.com/');

            try {
                return storage = {
                    getStorage  : function(name, model, secondary) {
                        var _cache;
                        if (!cache[name]) {
                            model.push({name:'id',type:'string',auto:true});

                            cache[name] = _cache = {
                                model       : model
                            };

                            if (secondary === true) {
                                _cache.secondary    = true;
                                _cache.storage      = {};
                                return true;
                            } else if (angular.isUndefined(secondary)) {
                                _cache.storage      = $fireBase(link.child(name)).$asArray();
                            }
                        }

                        if (cache[name].secondary) {
                            if (!cache[name].storage[model]) {
                                cache[name].storage[model]  = $fireBase(link.child(name + '_' + model)).$asArray();
                            }

                            return cache[name].storage[model];
                        } else {
                            return cache[name].storage;
                        }
                    },
                    create      : function(name) {
                        if (!cache[name]) {
                            return false;
                        }

                        var element = {};

                        angular.forEach(cache[name].model, function (variable) {
                            var value;

                            switch (variable.type) {
                                case 'string':
                                    if (variable.auto) {
                                        value   = 'id' + Date.now();
                                    } else {
                                        value   = '';
                                    }
                                    break;
                                case 'boolean':
                                    value   = false;
                                    break;
                                case 'int':
                                    value   = 0;
                                    break;
                                case 'float':
                                    value   = 0.0;
                                    break;
                                case 'array':
                                    value   = [];
                                    break;
                            }

                            element[variable.name]  = value;
                        });

                        return element;
                    },
                    get         : function(name, $scope, src) {
                        if (!cache[name]) {
                            return false;
                        }

                        if (angular.isUndefined(src)) {
                            src = {};
                        }

                        angular.forEach(cache[name].model, function(variable) {
                            switch (variable.type) {
                                case 'string':
                                case 'boolean':
                                case 'int':
                                case 'float':
                                    src[variable.name]  = $scope[variable.name];
                                    break;
                                case 'array':
                                    var arr     = src[variable.name];

                                    if (!arr) {
                                        arr         = src[variable.name] = [];
                                    } else {
                                        arr.length  = 0;
                                    }

                                    storage.getStorage(variable.extend).forEach(function(e) {
                                        if ($scope[variable.name].indexOf(e.id) >= 0) {
                                            arr.push(e.id);
                                        }
                                    });
                                    break;
                            }
                        });

                        return src;
                    },
                    set         : function(name, $scope, src) {
                        if (!cache[name] || !src) {
                            return false;
                        }

                        angular.forEach(cache[name].model, function(variable) {
                            $scope[variable.name]  = src[variable.name];
                        });
                    },
                    save        : function(name, $scope) {
                        if (!cache[name]) {
                            return false;
                        }

                        var element;

                        $scope[name].forEach(function (e) {
                            if (e.id === $scope.id) {
                                element = storage.get(name, $scope, e);
                            }
                        });

                        if (!element) {
                            $scope[name].$add(storage.get(name, $scope));
                        } else {
                            $scope[name].$save(element);
                        }
                    },
                    delete      : function(name, $scope, src) {
                        $scope[name].$remove(src);
                    }
                };
            } finally {
                storage.getStorage(CONTROLLERS.users, [
                    {name:'login',type:'string'},
                    {name:'password',type:'string'},
                    {name:'firstName',type:'string'},
                    {name:'lastName',type:'string'}
                ]);

                storage.getStorage(CONTROLLERS.options, [
                    {name:'optionName',type:'string'},
                    {name:'optionPrice',type:'float'}
                ]);

                storage.getStorage(CONTROLLERS.hotelNumbers, [
                    {name:'numberName',type:'int'},
                    {name:'numberPosition',type:'string'},
                    {name:'numberType',type:'string'},
                    {name:'numberPlaces',type:'int'},
                    {name:'numberPrice',type:'float'}
                ], true);

                storage.getStorage(CONTROLLERS.hotels, [
                    {name:'hotelName',type:'string'},
                    {name:'hotelAddress',type:'string'},
                    {name:'hotelDirector',type:'string'},
                    {name:'hotelPhone',type:'string'},
                    {name:'hotelNumbers',type:'array',extend:CONTROLLERS.hotelNumbers},
                    {name:'hotelOptions',type:'array',extend:CONTROLLERS.options}
                ]);


            }
        }
    ]
);

var controllers = angular.module('Controllers', ['ngRoute', 'Storage']);

controllers.config(
    [
        '$routeProvider',
        function($routeProvider) {
            $routeProvider
                .when('/login', {
                    template    : TEMPLATES.login,
                    controller  : 'Login'
                })
                .when('/options', {
                    template    : TEMPLATES.options,
                    controller  : 'Options'
                })

                .when('/hotels', {
                    template    : TEMPLATES.hotels,
                    controller  : 'Hotels'
                })
                .when('/hotels/numbers/:hotelId', {
                    template    : TEMPLATES.hotelNumbers,
                    controller  : 'Numbers'
                })

                .when('/users', {
                    template    : TEMPLATES.users,
                    controller  : 'Users'
                })

                .when('/orders', {
                    template    : TEMPLATES.orders,
                    controller  : 'Orders'
                });
        }
    ]
);

controllers.controller(
    'Login',
    [
        '$rootScope',
        '$scope',
        'hotelStorage',
        '$location',
        function($rootScope, $scope, hotelStorage, $location) {
            var users   = hotelStorage.getStorage(CONTROLLERS.users);

            angular.extend($scope, {
                users       : users,
                action      : '',
                signin      : function() {
                    var user;

                    if ($scope.login !== 'admin') {
                        users.forEach(function(_user) {
                            if (_user.login === $scope.login) {
                                user    = _user;
                            }
                        });

                        if (user) {
                            if ($scope.password === user.password) {
                                $location.path('/hotels');
                                $scope.$apply();
                                $rootScope.currentUser  = user;
                            }
                        } else {
                            $scope.action   = 'register';
                        }
                    } else {
                        if ($scope.password === 'admin') {
                            $location.path('/hotels');

                            $rootScope.isAdmin  = true;
                        }
                    }
                },
                register    : function() {
                    hotelStorage.save(
                        CONTROLLERS.users,
                        $scope
                    );

                    $scope.action   = '';

                    setTimeout($scope.signin, 100);
                }
            }, hotelStorage.create(CONTROLLERS.users));
        }
    ]
);
controllers.controller(
    'Options',
    [
        '$scope',
        'hotelStorage',
        function($scope, hotelStorage) {
            var options      = hotelStorage.getStorage(CONTROLLERS.options);

            angular.extend($scope, {
                options     : options,
                active      : '',
                fnCreate    : function() {
                    hotelStorage.set(
                        CONTROLLERS.options,
                        $scope,
                        hotelStorage.create(CONTROLLERS.options)
                    );

                    $scope.active   = 'create';
                },
                fnEdit      : function(model) {
                    hotelStorage.set(
                        CONTROLLERS.options,
                        $scope,
                        model
                    );

                    $scope.active   = 'edit';
                },
                fnSave      : function() {
                    hotelStorage.save(
                        CONTROLLERS.options,
                        $scope
                    );

                    $scope.active   = '';
                },
                fnDelete    : function(model) {
                    hotelStorage.delete(CONTROLLERS.options, $scope, model);
                },
                fnCancel    : function() {
                    $scope.active   = '';
                }
            });
        }
    ]
);
controllers.controller(
    'Hotels',
    [
        '$scope',
        'hotelStorage',
        function($scope, hotelStorage) {
            var hotels      = hotelStorage.getStorage(CONTROLLERS.hotels),
                options     = hotelStorage.getStorage(CONTROLLERS.options);

            angular.extend($scope, {
                hotels      : hotels,
                options     : options,
                active      : '',
                fnCreate    : function() {
                    hotelStorage.set(
                        CONTROLLERS.hotels,
                        $scope,
                        hotelStorage.create(CONTROLLERS.hotels)
                    );

                    $scope.active   = 'create';
                },
                fnEdit      : function(model) {
                    hotelStorage.set(
                        CONTROLLERS.hotels,
                        $scope,
                        model
                    );

                    $scope.active   = 'edit';
                },
                fnSave      : function() {
                    hotelStorage.save(
                        CONTROLLERS.hotels,
                        $scope
                    );

                    $scope.active   = '';
                },
                fnDelete    : function(model) {
                    hotelStorage.delete(CONTROLLERS.hotels, $scope, model);
                },
                fnCancel    : function() {
                    $scope.active   = '';
                }
            });
        }
    ]
);
controllers.controller(
    'Numbers',
    [
        '$scope',
        'hotelStorage',
        '$routeParams',
        function ($scope, hotelStorage, $routeParams) {
            var numbers     = hotelStorage.getStorage(CONTROLLERS.hotelNumbers, $routeParams.hotelId);

            angular.extend($scope, {
                hotelNumbers: numbers,
                active      : '',
                fnCreate    : function() {
                    hotelStorage.set(
                        CONTROLLERS.hotelNumbers,
                        $scope,
                        hotelStorage.create(CONTROLLERS.hotelNumbers)
                    );

                    $scope.active   = 'create';
                },
                fnEdit      : function(model) {
                    hotelStorage.set(
                        CONTROLLERS.hotelNumbers,
                        $scope,
                        model
                    );

                    $scope.active   = 'edit';
                },
                fnSave      : function() {
                    hotelStorage.save(
                        CONTROLLERS.hotelNumbers,
                        $scope,
                        $routeParams.hotelId
                    );

                    $scope.active   = '';
                },
                fnDelete    : function(model) {
                    hotelStorage.delete(CONTROLLERS.hotelNumbers, $scope, model);
                },
                fnCancel    : function() {
                    $scope.active   = '';
                }
            });
        }
    ]
);



controllers.controller(
    'Users',
    [
        '$scope',
        'hotelStorage',
        function($scope, hotelStorage) {

        }
    ]
);
controllers.controller(
    'Orders',
    [
        function() {

        }
    ]
);


var app = angular.module('app', ['ngRoute', 'Controllers']);
app.config(
    [
        '$routeProvider',
        function($routeProvider) {
            $routeProvider
                .otherwise({
                    redirectTo  : '/login'
                });
        }
    ]
);

app.controller(
    'Main',
    [
        '$rootScope',
        '$routeParams',
        function($rootScope, $routeParams) {
            $rootScope.currentUser  = null;
            $rootScope.isAdmin      = false;

            $rootScope.currency     = 22.1;
        }
    ]
);



