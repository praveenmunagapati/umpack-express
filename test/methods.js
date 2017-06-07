var chai = require('chai');
var should = chai.should();
var chaiHttp = require('chai-http');

var httpMocks = require('node-mocks-http');

var config = require('config');
var Promise = require('bluebird');
var crypto = require('crypto');

var umpack = require('./helpers/umpack');
var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;

var utils = require('./helpers/utils');

var usersCollection = 'users';
var rolesCollection = 'roleactions';
var username = 'test';
var password = '123456';

global.Promise = Promise;
chai.use(chaiHttp);

describe('umpack methods', function() {

  beforeEach(function() {

    return mongoose.connection.db.collection(usersCollection).remove();

  });

  describe('#filterUsersByRole()', function() {

    it(
      'should return users that contains this role. users have multiple roles',
      function() {

        var users = [{
            metaData: {},
            userName: 'one',
            password: utils.passwordHash(password),
            email: 'one@test.com',
            isActivated: true,
            roles: ['admin', 'user'],
            '__v': 0
          },
          {
            userName: 'two',
            password: utils.passwordHash(password),
            email: 'two@test.com',
            isActivated: true,
            roles: ['user'],
            '__v': 0
          },
          {
            userName: 'three',
            password: utils.passwordHash(password),
            email: 'three@test.com',
            isActivated: true,
            roles: ['test'],
            '__v': 0
          },
          {
            userName: 'four',
            password: utils.passwordHash(password),
            email: 'four@test.com',
            isActivated: true,
            roles: [],
            '__v': 0
          }
        ];

        return insertUsers(users)
          .then(function() {
            return umpack.filterUsersByRole('user');
          })
          .then(function(users) {
            should.exist(users);

            users.should.have.lengthOf(2);

            users.forEach(function(user) {
              user.should.contain.all.keys(['id', 'userName',
                'email', 'isActivated', 'roles'
              ]);

              user.userName.should.be.oneOf(['one', 'two']);
            });

          });


      });


    it(
      'should return empty list when noone has specified role',
      function() {

        var users = [{
            metaData: {},
            userName: 'one',
            password: utils.passwordHash(password),
            email: 'one@test.com',
            isActivated: true,
            roles: ['admin', 'test'],
            '__v': 0
          },
          {
            userName: 'two',
            password: utils.passwordHash(password),
            email: 'two@test.com',
            isActivated: true,
            roles: [],
            '__v': 0
          },
          {
            userName: 'three',
            password: utils.passwordHash(password),
            email: 'three@test.com',
            isActivated: true,
            roles: ['test'],
            '__v': 0
          }
        ];

        return insertUsers(users)
          .then(function() {
            return umpack.filterUsersByRole('user');
          })
          .then(function(users) {
            should.exist(users);

            users.should.have.lengthOf(0);

          });


      });



  });

  describe('#filterUsersByMetaData()', function() {

    it('should filter users on first level key and return list',
      function() {
        var users = [{
            metaData: {},
            userName: 'one',
            password: utils.passwordHash(password),
            email: 'one@test.com',
            isActivated: true,
            roles: ['user'],
            '__v': 0
          },
          {
            userName: 'two',
            password: utils.passwordHash(password),
            email: 'two@test.com',
            isActivated: true,
            roles: ['user'],
            '__v': 0
          },
          {
            userName: 'three',
            password: utils.passwordHash(password),
            email: 'three@test.com',
            isActivated: true,
            roles: ['test'],
            metaData: {
              key: 1,
              other: 2
            },
            '__v': 0
          },
          {
            userName: 'four',
            password: utils.passwordHash(password),
            email: 'four@test.com',
            isActivated: true,
            roles: [],
            metaData: {
              key: 2,
              other: 2
            },
            '__v': 0
          }
        ];

        return insertUsers(users)
          .then(function() {
            return umpack.filterUsersByMetaData('key', 1);
          })
          .then(function(users) {
            should.exist(users);

            users.should.have.length(1);

            users[0].userName.should.equal('three');
          });
      });

    it('should filter users on deep level key and return list',
      function() {
        var users = [{
            metaData: {},
            userName: 'one',
            password: utils.passwordHash(password),
            email: 'one@test.com',
            isActivated: true,
            roles: ['user'],
            '__v': 0
          },
          {
            userName: 'two',
            password: utils.passwordHash(password),
            email: 'two@test.com',
            isActivated: true,
            roles: ['user'],
            '__v': 0
          },
          {
            userName: 'three',
            password: utils.passwordHash(password),
            email: 'three@test.com',
            isActivated: true,
            roles: ['test'],
            metaData: {
              key: 1,
              other: 2
            },
            '__v': 0
          },
          {
            userName: 'four',
            password: utils.passwordHash(password),
            email: 'four@test.com',
            isActivated: true,
            roles: [],
            metaData: {
              key: 2,
              complex: {
                two: 2
              }
            },
            '__v': 0
          }
        ];

        return insertUsers(users)
          .then(function() {
            return umpack.filterUsersByMetaData('complex.two', 2);
          })
          .then(function(users) {
            should.exist(users);

            users.should.have.length(1);

            users[0].userName.should.equal('four');
          });
      });

  });

  describe('#getFullName()', function() {
    it('should get full name', function() {
      var firstname = 'firstname';
      var lastname = 'last name';

      return insertUser({
          userName: username,
          password: utils.passwordHash(password),
          email: 'one@test.com',
          isActivated: true,
          roles: ['user'],
          firstName: firstname,
          lastName: lastname
        })
        .then(function() {
          return umpack.getFullName(username);
        })
        .then(function(name) {
          should.exist(name);

          name.should.equal(firstname + ' ' + lastname);
        });
    });
  });

  describe('#getFullUserObject()', function() {

    it('should get user object when user exists', function() {
      return insertUser({
          userName: username,
          password: utils.passwordHash(password),
          isActivated: false,
          roles: [],
          firstName: 'test',
          lastName: 'last name'
        })
        .then(function() {
          return umpack.getFullUserObject(username);
        })
        .then(function(user) {
          should.exist(user);

          user.should.have.property('id');
          user.should.have.property('userName', username);
          user.should.have.property('firstName', 'test');
          user.should.have.property('lastName');
          user.should.have.property('isActivated', false);
          user.should.have.property('roles');
        });
    });

    it('should return null when user does not exist', function() {
      return umpack.getFullUserObject(username)
        .then(function(user) {
          should.not.exist(user);
        });
    });
  });

  describe('#getFullUserObjectFromRequest()', function() {

    var app = require('./helpers/app');

    it('should return user', function() {
      return insertUser({
          userName: username,
          password: utils.passwordHash(password),
          isActivated: true,
          roles: ['user'],
          firstName: 'test'
        })
        .then(function() {
          return chai.request(app)
            .post('/um/login')
            .send({
              userName: username,
              password: password
            });
        })
        .then(function(res) {
          var request = httpMocks.createRequest({
            method: 'GET',
            url: '/api/something',
            headers: {
              authorization: res.text
            }
          });

          return umpack.getFullUserObjectFromRequest(request);
        })
        .then(function(user) {
          should.exist(user);

          user.should.have.property('id');
          user.should.have.property('userName', username);
          user.should.have.property('firstName', 'test');
        });
    });
  });

  describe('#getUserRolesByUserName()', function() {
    it('should return userName and roles', function() {
      return insertUser({
          userName: username,
          password: utils.passwordHash(password),
          roles: ['user', 'admin']
        })
        .then(function() {
          return umpack.getUserRolesByUserName(username);
        })
        .then(function(user) {
          should.exist(user);

          user.should.have.property('userName', username);
          user.should.have.property('roles');

          user.roles.should.have.length(2);
        });
    });
  });
});

function insertUser(user) {
  return mongoose.connection.collection(usersCollection).insert(user);
}

function insertUsers(users) {
  return Promise.map(users, insertUser);
}
