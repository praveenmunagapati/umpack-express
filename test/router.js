var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();

var express = require('express');
var bodyParser = require('body-parser');
var config = require('config');
var Promise = require('bluebird');
var crypto = require('crypto');

var umpack = require('../umpack')(config.get('umpack'));
var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;

var usersCollection = 'users';
var rolesCollection = 'roleactions';
var username = 'test';
var password = '123456';

chai.use(chaiHttp);
global.Promise = Promise;

describe('service API', function() {

  var app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: false
  }));

  app.use('/um', umpack.router);

  app.listen(config.get('port'), function() {
    console.log('listening');
  });

  function login() {
    return chai.request(app)
      .post('/um/login')
      .send({
        userName: username,
        password: password
      });
  }

  before(function() {

    return new Promise(function(resolve, reject) {

        mongoose.connection.once('connected', function() {

          resolve(mongoose.connection.db.dropCollection(
            rolesCollection));
        });

      })
      .then(function() {

        return mongoose.connection.collection(rolesCollection).insert({
          "name": "user",
          "actions": [{
            "_id": new ObjectId("58a301b880a92f3930ebfef4"),
            "pattern": "/um/*",
            "name": "um",
            "verbDelete": true,
            "verbPost": true,
            "verbPut": true,
            "verbGet": true
          }],
          "__v": 0
        });

      });

  });

  beforeEach(function() {

    return mongoose.connection.db.dropCollection(usersCollection);

  });

  describe('GET /metadata', function() {

    it('should return metadata', function() {

      return saveRecordWithParameters({
          testKey: 'test value'
        })
        .then(login)
        .then(function(res) {

          res.should.have.status(200);

          return chai.request(app)
            .get('/um/metadata')
            .set('authorization', res.text)
            .set('cookie', '');
        })
        .then(function(res) {
          res.should.have.status(200);

          should.exist(res.body);
          res.body.should.have.property('testKey');
        });

    });

    it('should return empty object on user without metadata', function() {

      return saveRecordWithParameters()
        .then(login)
        .then(function(res) {

          res.should.have.status(200);

          return chai.request(app)
            .get('/um/metadata')
            .set('authorization', res.text)
            .set('cookie', '');
        })
        .then(function(res) {
          res.should.have.status(200);

          should.exist(res.body);
          res.body.should.be.an('object');
          Object.keys(res.body).should.have.length(0);

        });

    });


  });
});

function passwordHash(password) {
  return crypto.createHmac('sha256', config.get('umpack.passwordHashSecret'))
    .update(password)
    .digest('hex');
}

function saveRecordWithParameters(metadata, isActivated, roles) {
  if (isActivated === null || isActivated === undefined) isActivated = true;

  if (!roles) roles = ['user'];

  return mongoose.connection.collection(usersCollection).insert({
    metaData: metadata,
    userName: username,
    password: passwordHash(password),
    email: "test@test.com",
    isActivated: isActivated,
    roles: roles,
    '__v': 0
  });
}