// client-registration-test.js
//
// Test the client registration API
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
    Step = require('step'),
    _ = require('underscore'),
    httputil = require('./lib/http');

var ignore = function(err) {};

var suite = vows.describe('client registration API');

var assoc = function(params) {
    return function() {
        httputil.post('localhost',
                      4815,
                      '/api/client/register',
                      params,
                      this.callback);
    };
};

var update = function(initial, params) {
    return function() {
        var cb = this.callback;
        Step(
            function() {
                httputil.post('localhost',
                              4815,
                              '/api/client/register',
                              initial,
                              this);
            },
            function(err, res, body) {
                if (err) throw err;
                if (res.statusCode !== 200) throw new Error("Bad assoc");
                var reg = JSON.parse(body);
                params = _.extend(params, {client_id: reg.client_id,
                                           client_secret: reg.client_secret});
                httputil.post('localhost',
                              4815,
                              '/api/client/register',
                              params,
                              this);
            },
            function(err, res, body) {
                if (err) {
                    cb(err, null, null);
                } else {
                    cb(null, res, body);
                }
            }
        );
    };
};

var assocFail = function(params) {
    return {
        topic: assoc(params),
        'it fails correctly': function(err, res, body) {
            assert.ifError(err);
            assert.equal(res.statusCode, 400);
        }
    };
};

var updateFail = function(initial, params) {
    return {
        topic: update(params),
        'it fails correctly': function(err, res, body) {
            assert.ifError(err);
            assert.equal(res.statusCode, 400);
        }
    };
};

var updateSucceed = function(initial, params) {
    return {
        topic: update(params),
        'it works': function(err, res, body) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
        },
        'it has the right results': function(err, res, body) {
            var parsed = JSON.parse(body);
            assert.ifError(err);
            assert.include(parsed, 'client_id');
            assert.include(parsed, 'client_secret');
            assert.include(parsed, 'expires_at');
        }
    };
};

var assocSucceed = function(params) {
    return {
        topic: assoc(params),
        'it works': function(err, res, body) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
        },
        'it has the right results': function(err, res, body) {
            var parsed = JSON.parse(body);
            assert.ifError(err);
            assert.include(parsed, 'client_id');
            assert.include(parsed, 'client_secret');
            assert.include(parsed, 'expires_at');
        }
    };
};

suite.addBatch({
    'When we set up the app': {
        topic: function() {
            var cb = this.callback,
                config = {port: 4815,
                          hostname: 'localhost',
                          driver: 'memory',
                          params: {},
                          nologger: true
                         },
                makeApp = require('../lib/app').makeApp;

            makeApp(config, function(err, app) {
                if (err) {
                    cb(err, null);
                } else {
                    app.run(function(err) {
                        if (err) {
                            cb(err, null);
                        } else {
                            cb(null, app);
                        }
                    });
                }
            });
        },
        teardown: function(app) {
            app.close();
        },
        'it works': function(err, app) {
            assert.ifError(err);
        },
        'and we check the client registration endpoint': {
            topic: function() {
                httputil.options('localhost', 4815, '/api/client/register', this.callback);
            },
            'it exists': function(err, allow, res, body) {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
            },
            'it supports POST': function(err, allow, res, body) {
                assert.include(allow, 'POST');
            },
            'and we register with no type': assocFail({application_name: "Typeless"}),
            'and we register with an unknown type': 
            assocFail({application_name: "Frobnicator",
                       type: 'client_frobnicate'
                      }),
            'and we register to associate with a client ID already set': 
            assocFail({application_name: "Jump The Gun",
                       type: 'client_associate',
                       client_id: "I MADE IT MYSELF"
                      }),
            'and we register to associate with a client secret set': 
            assocFail({application_name: "Psst",
                       type: 'client_associate',
                       client_secret: "I hate corn."
                      }),
            'and we register to associate with an unknown application type': 
            assocFail({application_name: "Scoodly",
                       type: 'client_associate',
                       application_type: "unknown"
                      }),
            'and we register to associate with an empty client description':
            assocSucceed({type: 'client_associate'}),
            'and we register to associate with an application name':
            assocSucceed({application_name: "Valiant",
                          type: 'client_associate'}),
            'and we register to associate with application type web':
            assocSucceed({application_name: "Web app",
                          type: 'client_associate',
                          application_type: "web"
                         }),
            'and we register to associate with application type native':
            assocSucceed({application_name: "Native app",
                          type: 'client_associate',
                          application_type: "native"
                         }),
            'and we register to associate with non-email contacts set':
            assocFail({application_name: "Bad Contact",
                       type: 'client_associate',
                       contacts: "http://example.com/contact-form"}),
            'and we register to associate with bad separator in contacts':
            assocFail({application_name: "Comma Contact",
                       type: 'client_associate',
                       contacts: "john@example.com,sue@example.net"}),
            'and we register to associate with a single valid contact':
            assocSucceed({application_name: "One Contact",
                          type: 'client_associate',
                          contacts: "john@example.com"}),
            'and we register to associate with multiple valid contacts':
            assocSucceed({application_name: "Several Contacts",
                          type: 'client_associate',
                          contacts: "john@example.com sue@example.net eric@example.com"}),
            'and we register to associate with an invalid logo_url':
            assocFail({application_name: "Bad Logo URL",
                       type: 'client_associate',
                       logo_url: "BAD URL"}),
            'and we register to associate with a multiple logo URLs':
            assocFail({application_name: "Too many Logo URLs",
                       type: 'client_associate',
                       logo_url: "http://example.com/my-logo-url.jpg http://example.com/my-logo-url.jpg"}),
            'and we register to associate with a valid logo_url':
            assocSucceed({application_name: "Good Logo URL",
                          type: 'client_associate',
                          logo_url: "http://example.com/my-logo-url.jpg"}),
            'and we register to associate with non-url redirect uri set':
            assocFail({application_name: "Bad Redirect",
                       type: 'client_associate',
                       redirect_uris: "validate"}),
            'and we register to associate with bad separator in redirect_uris':
            assocFail({application_name: "Comma Redirect",
                       type: 'client_associate',
                       redirect_uris: "http://example.org/redirect,http://example.org/redirect2"}),
            'and we register to associate with a single valid redirect_uri':
            assocSucceed({application_name: "One Redirect",
                          type: 'client_associate',
                          redirect_uris: "http://example.org/redirect"}),
            'and we register to associate with multiple valid redirect_uris':
            assocSucceed({application_name: "Several Redirects",
                          type: 'client_associate',
                          redirect_uris: "http://example.org/redirect http://example.org/redirect2 http://example.org/redirect3"}),
            'and we try to update without associating first': {
                topic: function() {
                    httputil.post('localhost',
                                  4815,
                                  '/api/client/register',
                                  {application_name: "Not Yet Associated",
                                   type: 'client_update',
                                   client_id: "IMADETHISUP",
                                   client_secret: "MADEUPTHISTOO"},
                                  this.callback);
                },
                'it fails correctly': function(err, res, body) {
                    assert.ifError(err);
                }
            },
            'and we update with no client_secret': {
                topic: function() {
                    var cb = this.callback;
                    Step(
                        function() {
                            httputil.post('localhost',
                                          4815,
                                          '/api/client/register',
                                          {
                                              application_name: 'No Secret',
                                              type: 'client_associate'
                                          },
                                          this);
                        },
                        function(err, res, body) {
                            if (err) throw err;
                            if (res.statusCode != 200) throw new Error("Bad assoc");
                            var reg = JSON.parse(body);
                            httputil.post('localhost',
                                          4815,
                                          '/api/client/register',
                                          {
                                              application_name: 'No Secret',
                                              logo_url: 'http://example.com/my-logo-url.jpg',
                                              type: 'client_update',
                                              client_id: reg.client_id
                                          },
                                          this);
                        },
                        function(err, res, body) {
                            if (err) {
                                cb(err, null, null);
                            } else {
                                cb(null, res, body);
                            }
                        }
                    );
                },
                'it fails correctly': function(err, res, body) {
                    assert.ifError(err);
                }
            },
            'and we update with the wrong client_secret': {
                topic: function() {
                    var cb = this.callback;
                    Step(
                        function() {
                            httputil.post('localhost',
                                          4815,
                                          '/api/client/register',
                                          {
                                              application_name: 'Wrong Secret',
                                              type: 'client_associate'
                                          },
                                          this);
                        },
                        function(err, res, body) {
                            if (err) throw err;
                            if (res.statusCode != 200) throw new Error("Bad assoc");
                            var reg = JSON.parse(body);
                            httputil.post('localhost',
                                          4815,
                                          '/api/client/register',
                                          {
                                              application_name: 'Wrong Secret',
                                              logo_url: 'http://example.com/my-logo-url.jpg',
                                              type: 'client_update',
                                              client_id: reg.client_id,
                                              client_secret: 'SOMECRAP'
                                          },
                                          this);
                        },
                        function(err, res, body) {
                            if (err) {
                                cb(err, null, null);
                            } else {
                                cb(null, res, body);
                            }
                        }
                    );
                },
                'it fails correctly': function(err, res, body) {
                    assert.ifError(err);
                }
            }
        },
        'and we update with the right client information':
        updateSucceed({type: "client_associate",
                       application_name: "Good update"},
                      {type: "client_update",
                       application_name: "Good update",
                       application_type: "native"})
    }
});

suite.export(module);