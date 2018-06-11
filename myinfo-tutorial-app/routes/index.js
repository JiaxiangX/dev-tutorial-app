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
var _attributes = "name,sex,race,nationality,dob,email,mobileno,regadd,housingtype,hdbtype,marital,edulevel";

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
  request = createTokenRequest(code);
  request
    .buffer(true)
    .end(function(callErr, callRes) {
      if (callErr) {
        // ERROR
        console.log("\x1b[31m", "Error from Token API:", "\x1b[0m");
        console.log(callErr.status);
        console.log(callErr.response.req.res.text);
        res.jsonp({
          status: "ERROR",
          msg: callErr
        });
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };
        console.log("\x1b[32m", "Response from Token API:", "\x1b[0m");
        console.log(JSON.stringify(data.body));

        var accessToken = data.body.access_token;
        if (accessToken == undefined || accessToken == null) {
          res.jsonp({
            status: "ERROR",
            msg: "ACCESS TOKEN NOT FOUND"
          });
        }

        // everything ok, call person API
        callPersonAPI(accessToken, res);
      }
    });
  // t2step2 END PASTE CODE

});

function callPersonAPI(accessToken, res) {
  // validate and decode token to get UINFIN
  // t2step4 PASTE CODE BELOW
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
  // t2step4 END PASTE CODE

  // **** CALL PERSON API ****
  // Call Person API using accessToken
  // t2step5 PASTE CODE BELOW
  var request = createPersonRequest(uinfin, accessToken);

  // Invoke asynchronous call
  request
    .buffer(true)
    .end(function(callErr, callRes) {
      if (callErr) {
        console.log("\x1b[31m", "Error from Person API:", "\x1b[0m");
        console.log(callErr.status);
        console.log(callErr.response.req.res.text);
        res.jsonp({
          status: "ERROR",
          msg: callErr
        });
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };

        var personData = data.text;
        if (personData == undefined || personData == null) {
          res.jsonp({
            status: "ERROR",
            msg: "PERSON DATA NOT FOUND"
          });
        }
        else {
          if (_authLevel == "L0") {
            personData = JSON.parse(personData);
            personData.uinfin = uinfin; // add the uinfin into the data to display on screen

            console.log("Person Data :".green);
            console.log(JSON.stringify(personData));
            // successful. return data back to frontend
            res.jsonp({
              status: "OK",
              text: personData
            });

          }
          //t3step3 PASTE CODE BELOW
          else if (_authLevel == "L2") {
            console.log("\x1b[32m", "Response from Person API:", "\x1b[0m");
            console.log(personData);

            // header.encryptedKey.iv.ciphertext.tag
            var jweParts = personData.split(".");

            securityHelper.decryptJWE(jweParts[0], jweParts[1], jweParts[2], jweParts[3], jweParts[4], _privateKeyContent)
              .then(personData => {
                if (personData == undefined || personData == null)
                  res.jsonp({
                    status: "ERROR",
                    msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA"
                  });
                personData.uinfin = uinfin; // add the uinfin into the data to display on screen

                console.log("\x1b[32m", "Person Data (Decoded/Decrypted):", "\x1b[0m");
                console.log(JSON.stringify(personData));
                // successful. return data back to frontend
                res.jsonp({
                  status: "OK",
                  text: personData
                });
              })
              .catch(error => {
                console.error("Error with decrypting JWE: %s".red, error);
              })
          }
          //t3step3 END PASTE CODE
          else {
            throw new Error("Unknown Auth Level");
          }
        } // end else
      }
    }); // end asynchronous call
  // t2step5 END PASTE CODE

}

// function to prepare request for TOKEN API
function createTokenRequest(code) {
  console.log("\x1b[32m%s\x1b[0m", "******************************");
  console.log("\x1b[32m%s\x1b[0m", "**** Create Token Request ****");
  console.log("\x1b[32m%s\x1b[0m", "******************************");
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var method = "POST";
  var request = null;

  // preparing the request with header and parameters
  // t2step3 PASTE CODE BELOW
  // assemble params for Token API
  var strParams = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + _redirectUrl +
    "&client_id=" + _clientId +
    "&client_secret=" + _clientSecret;
  var params = querystring.parse(strParams);


  // assemble headers for Token API
  var strHeaders = "Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Sign request and add Authorization Headers
  // t3step2a PASTE CODE BELOW
  var authHeaders = securityHelper.generateAuthorizationHeader(
    _tokenApiUrl,
    params,
    method,
    contentType,
    _authLevel,
    _clientId,
    _privateKeyContent,
    _clientSecret,
    _realm
  );

  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders);
  }

  // t3step2a END PASTE CODE


  console.log("\x1b[32m", "Request Header for Token API:", "\x1b[0m");
  console.log(JSON.stringify(headers));

  var request = restClient.post(_tokenApiUrl);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers))
    request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params))
    request.send(params);
  // t2step3 END PASTE CODE

  console.log("\x1b[32m%s\x1b[0m", "Sending Token Request >>>");
  return request;
}

// function to prepare request for PERSON API
function createPersonRequest(uinfin, validToken) {
  console.log("\x1b[32m%s\x1b[0m", "******************************");
  console.log("\x1b[32m%s\x1b[0m", "**** Create Person Request ***");
  console.log("\x1b[32m%s\x1b[0m", "******************************");
  var url = _personApiUrl + "/" + uinfin + "/";
  var cacheCtl = "no-cache";
  var method = "GET";
  var request = null;
  // assemble params for Person API
  // t2step6 PASTE CODE BELOW
  var strParams = "client_id=" + _clientId +
    "&attributes=" + _attributes;
  var params = querystring.parse(strParams);

  // assemble headers for Person API
  var strHeaders = "Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Sign request and add Authorization Headers
  // t3step2b PASTE CODE BELOW

  var authHeaders = securityHelper.generateAuthorizationHeader(
    url,
    params,
    method,
    "", // no content type needed for GET
    _authLevel,
    _clientId,
    _privateKeyContent,
    _clientSecret,
    _realm
  );
  // t3step2b END PASTE CODE
  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
  }
  else {
    // NOTE: include access token in Authorization header as "Bearer " (with space behind)
      _.set(headers, "Authorization", "Bearer " + validToken);
  }

  console.log("\x1b[32m", "Request Header for Person API:", "\x1b[0m");
  console.log(JSON.stringify(headers));

  // invoke token API
  var request = restClient.get(url);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers))
    request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params))
    request.query(params);
  // t2step6 END PASTE CODE
  console.log("\x1b[32m%s\x1b[0m", "Sending Person Request >>>");
  return request;
}

module.exports = router;
