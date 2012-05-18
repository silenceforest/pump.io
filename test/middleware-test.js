// middleware-test.js
//
// Test the middleware module
//
// Copyright 2012, StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var assert = require('assert'),
    vows = require('vows'),
    databank = require('databank'),
    Step = require('step'),
    httpMocks = require('http-mock'),
    schema = require('../lib/schema'),
    URLMaker = require('../lib/urlmaker').URLMaker,
    User = require('../lib/model/user').User,
    methodContext = require('./lib/methods').methodContext,
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject;

vows.describe('middleware module interface').addBatch({

    'When we load the module': {

        topic: function() { 

            var cb = this.callback;
            // Need this to make IDs

            URLMaker.hostname = "example.net";

            // Dummy databank

            var params = {schema: schema};

            var db = Databank.get('memory', params);

            db.connect({}, function(err) {
                var mw;

                DatabankObject.bank = db;

                User.create({nickname: "robby", password: "kangaroo"}, function(err, user) {
                    if (err) {
                        cb(err, null);
                    } else {
                        mw = require('../lib/middleware');
                        cb(null, mw);
                    }
                });
            });
        },
        'there is one': function(err, mw) {
            assert.ifError(err);
            assert.isObject(mw);
        },
        'and we check its methods': methodContext(['maybeAuth',
                                                   'reqUser',
                                                   'mustAuth',
                                                   'sameUser',
                                                   'noUser',
                                                   'checkCredentials',
                                                   'getCurrentUser',
                                                   'getSessionUser']),
        'and we use reqUser with no nickname param': {
            topic: function(mw) {
                var cb = this.callback,
                    req = httpMocks.createRequest({method: 'get',
                                                   url: '/api/user/',
                                                   params: {}
                                                  }),
                    res = httpMocks.createResponse();
                
                mw.reqUser(req, res, function(err) {
                    if (err) {
                        cb(null);
                    } else {
                        cb(new Error("Unexpected success!"));
                    }
                });
            },
            'it fails correctly': function(err) {
                assert.ifError(err);
            }
        },
        'and we use reqUser with an invalid nickname param': {
            topic: function(mw) {
                var cb = this.callback,
                    req = httpMocks.createRequest({method: 'get',
                                                   url: '/api/user/notanickname',
                                                   params: {nickname: "notanickname"}
                                                  }),
                    res = httpMocks.createResponse();
                
                mw.reqUser(req, res, function(err) {
                    if (err) {
                        cb(null);
                    } else {
                        cb(new Error("Unexpected success!"));
                    }
                });
            },
            'it fails correctly': function(err) {
                assert.ifError(err);
            }
        },
        'and we use reqUser with a nickname param only off by case': {
            topic: function(mw) {
                var cb = this.callback,
                    req = httpMocks.createRequest({method: 'get',
                                                   url: '/api/user/Robby',
                                                   params: {nickname: "Robby"}
                                                  }),
                    res = httpMocks.createResponse();
                
                mw.reqUser(req, res, function(err) {
                    if (err) {
                        cb(null);
                    } else {
                        cb(new Error("Unexpected success!"));
                    }
                });
            },
            'it fails correctly': function(err) {
                assert.ifError(err);
            }
        },
        'and we use reqUser with a valid nickname param': {
            topic: function(mw) {
                var cb = this.callback,
                    req = httpMocks.createRequest({method: 'get',
                                                   url: '/api/user/robby',
                                                   params: {nickname: "robby"}
                                                  }),
                    res = httpMocks.createResponse();
                
                mw.reqUser(req, res, function(err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                });
            },
            'it works': function(err) {
                assert.ifError(err);
            }
        }
    }
}).export(module);

