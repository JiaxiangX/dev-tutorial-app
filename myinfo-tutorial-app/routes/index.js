var express = require('express');
var router = express.Router();

const restClient = require('superagent-bluebird-promise');
const path = require('path');
const url = require('url');
const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const querystring = require('querystring');
const securityHelper = require('../lib/security/security');
const crypto = require('crypto');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// ####################
// Setup Configuration
// ####################

// LOADED FRON ENV VARIABLE: public key from MyInfo Consent Platform given to you during onboarding for RSA digital signature
var _publicCertContent = process.env.MYINFO_CONSENTPLATFORM_SIGNATURE_CERT_PUBLIC_CERT;
// LOADED FRON ENV VARIABLE: your private key for RSA digital signature
var _privateKeyContent = process.env.MYINFO_APP_SIGNATURE_CERT_PRIVATE_KEY;
// LOADED FRON ENV VARIABLE: your client_id provided to you during onboarding
var _clientId = process.env.MYINFO_APP_CLIENT_ID;
// LOADED FRON ENV VARIABLE: your client_secret provided to you during onboarding
var _clientSecret = process.env.MYINFO_APP_CLIENT_SECRET;
// redirect URL for your web application
var _redirectUrl = process.env.MYINFO_APP_REDIRECT_URL;
// default realm for your web application
var _realm = process.env.MYINFO_APP_REALM;

// URLs for MyInfo APIs
var _authLevel = process.env.AUTH_LEVEL;

var _authApiUrl = process.env.MYINFO_API_AUTHORISE;
var _tokenApiUrl = process.env.MYINFO_API_TOKEN;
var _personApiUrl = process.env.MYINFO_API_PERSON;

// Requested attributes
var _attributes = "name,sex,race,nationality,dob,email,mobileno,regadd,housingtype,hdbtype,marital,edulevel,assessableincome";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

// callback function - directs back to home page
router.get('/callback', function(req, res, next) {
  res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

// function for getting environment variables to the frontend
router.get('/getEnv', function(req, res, next) {
  if (_clientId == undefined || _clientId == null)
    res.jsonp({
      status: "ERROR",
      msg: "client_id not found"
    });
  else
    res.jsonp({
      status: "OK",
      clientId: _clientId,
      redirectUrl: _redirectUrl,
      authApiUrl: _authApiUrl,
      attributes: _attributes,
      authLevel: _authLevel
    });
});

// function for frontend to call backend
router.post('/getPersonData', function(req, res, next) {
  // get variables from frontend
  var code = req.body.code;

  var data;
  var request;

  // **** CALL TOKEN API ****
  // Call the Token API (with the authorisation code)
  // t2step2 PASTE CODE BELOW

  // t2step2 END PASTE CODE

});

function callPersonAPI(accessToken, res) {
  // validate and decode token to get UINFIN
  // t2step4 PASTE CODE BELOW

  // t2step4 END PASTE CODE
  var decoded = securityHelper.verifyJWS(accessToken, _publicCertContent);
  if (decoded == undefined || decoded == null) {
    res.jsonp({
      status: "ERROR",
      msg: "INVALID TOKEN"
    })
  }

  console.log("\x1b[32m", "Decoded Access Token:", "\x1b[0m");
  console.log(JSON.stringify(decoded));

  var uinfin = decoded.sub;
  if (uinfin == undefined || uinfin == null) {
    res.jsonp({
      status: "ERROR",
      msg: "UINFIN NOT FOUND"
    });
  }
  // **** CALL PERSON API ****
  // Call Person API using accessToken
  // t2step5 PASTE CODE BELOW

  // t2step5 END PASTE CODE

}

// function to prepare request for TOKEN API
function createTokenRequest(code) {
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var method = "POST";
  var request = null;

  // preparing the request with header and parameters
  // t2step3 PASTE CODE BELOW

  // t2step3 END PASTE CODE

  return request;
}

// function to prepare request for PERSON API
function createPersonRequest(uinfin, validToken) {
  var url = _personApiUrl + "/" + uinfin + "/";
  var cacheCtl = "no-cache";
  var method = "GET";
  var request = null;
  // assemble params for Person API
  // t2step6 PASTE CODE BELOW

  // t2step6 END PASTE CODE
  return request;
}

module.exports = router;
