# TUTORIAL 1

The online tutorial 1 is at: [https://myinfo-api.app.gov.sg/dev/tutorial1](https://myinfo-api.app.gov.sg/dev/tutorial1)

### Step 1: Invoke the Sandbox Person API

Click on the URL link below,

[https://myinfo.api.gov.sg/dev/L0/v1/person/S9203266C/](https://myinfo.api.gov.sg/dev/L0/v1/person/S9203266C/)


`S9203266C` is the UINFIN (NRIC or FIN) parameter of the person.

Try to invoke the API again by using the following UINFIN :

* F9477325W
* S5062854Z
* T0066846F


MyInfo API Specs : [MyInfo Developer & Partner Portal](https://myinfo-api.app.gov.sg)


# Getting Started
1. Open cmd or terminal
2. Change your directory to myinfo-tutorial-app root folder
3. Run "npm install" (If you have not done so)

# Login Credentials

UINFIN: S9812381D  
Password: MyInfo2o15

# TUTORIAL 2

The online tutorial 2 is at: [https://myinfo-api.app.gov.sg/dev/tutorial2](https://myinfo-api.app.gov.sg/dev/tutorial2)

### Step 1: Function for calling Authorise API
Paste below codes to: `views/html/index.html` - `t2step1`

```javascript
var authoriseUrl = authApiUrl +
  "?client_id=" + clientId +
  "&attributes=" + attributes +
  "&purpose=" + purpose +
  "&state=" + state +
  "&redirect_uri=" + redirectUrl;

window.location = authoriseUrl;
```

Save or restart app

### Step 2: Call the Token API (with the authorisation code)
Paste below codes to: `routes/index.js` - `t2step2`

```javascript
request = createTokenRequest(code);
request
  .buffer(true)
  .end(function(callErr, callRes) {
    if (callErr) {
      // ERROR
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
```

Save or restart app

### Step 3: function to prepare request for TOKEN API
Paste below codes to: `routes/index.js` - `t2step3`

```javascript
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

// Add Authorisation headers for connecting to API Gateway
// t3step2 PASTE CODE BELOW

// t3step2 END PASTE CODE


console.log("\x1b[32m", "Request Header for Token API:", "\x1b[0m");
console.log(JSON.stringify(headers));

var request = restClient.post(_tokenApiUrl);

// Set headers
if (!_.isUndefined(headers) && !_.isEmpty(headers))
  request.set(headers);

// Set Params
if (!_.isUndefined(params) && !_.isEmpty(params))
  request.send(params);
```

Save or restart app


### Step 4: validate and decode token to get UINFIN
Paste below codes to: `routes/index.js` - `t2step4`

```javascript
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
```

Save or restart app

### Step 5: Call Person API using accessToken
Paste below codes to: `routes/index.js` - `t2step5`

```javascript
var request = createPersonRequest(uinfin, accessToken);

// Invoke asynchronous call
request
  .buffer(true)
  .end(function(callErr, callRes) {
    if (callErr) {
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
      // t3step4 REPLACE CODE BELOW
      var personJWS = data.text;
      if (personJWS == undefined || personJWS == null) {
        res.jsonp({
          status: "ERROR",
          msg: "PERSON DATA NOT FOUND"
        });
      } else {
        console.log("\x1b[32m", "Person Data (JWS):", "\x1b[0m");
        console.log(personJWS);

        var personData;
        // verify signature & decode JWS to get the person data in JSON
        personData = securityHelper.verifyJWS(personJWS, _publicCertContent);
      // t3step4 END REPLACE CODE

        if (personData == undefined || personData == null)
          res.jsonp({
            status: "ERROR",
            msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA"
          });
        personData.uinfin = uinfin; // add the uinfin into the data to display on screen

        console.log("\x1b[32m", "Person Data (Decoded):", "\x1b[0m");
        console.log(JSON.stringify(personData));
        // successful. return data back to frontend
        res.jsonp({
          status: "OK",
          text: personData
        });
      }
    }
  });
```

Save or restart app


### Step 6: function to prepare request for PERSON API
Paste below codes to: `routes/index.js` - `t2step6`

```javascript
var strParams = "client_id=" + _clientId +
  "&attributes=" + _attributes;
var params = querystring.parse(strParams);

// assemble headers for Person API
var strHeaders = "Cache-Control=" + cacheCtl;
var headers = querystring.parse(strHeaders);

// Add Authorisation headers for connecting to API Gateway
// t3step3 REPLACE CODE BELOW


// NOTE: include access token in Authorization header as "Bearer " (with space behind)
  _.set(headers, "Authorization", "Bearer " + validToken);
// t3step3 END REPLACE CODE


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
```

Save or restart app

# TUTORIAL 3

The online tutorial 3 is at: [https://myinfo-api.app.gov.sg/dev/tutorial3](https://myinfo-api.app.gov.sg/dev/tutorial3)

>Tutorial 2 must be completed in order to proceed with Tutorial 3.

### Step 1: Switching to Secured API

Uncomment L2 APIs

Linux/Mac OS - `start.sh`  
Windows - `start.bat`

Close and restart app

### Step 2: Signing Token request
Paste below codes to: `routes/index.js` - `t3step2`

```javascript
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
```

Save or restart app

#### Code Walkthrough - Signing Your Request
Let's take a closer look at the `generateSHA256withRSAHeader()` function in `lib/security/security.js`

```javascript
function generateSHA256withRSAHeader(url, params, method, strContentType, appId, keyCertContent, keyCertPassphrase, realm) {
  var nonceValue = nonce();
  var timestamp = (new Date).getTime();

  // A) Construct the Authorisation Token
  var defaultApexHeaders = {
    "apex_l2_eg_app_id": appId,
    "apex_l2_eg_nonce": nonceValue,
    "apex_l2_eg_signature_method": "SHA256withRSA",
    "apex_l2_eg_timestamp": timestamp,
    "apex_l2_eg_version": "1.0"
  };

  // Remove params unless Content-Type is "application/x-www-form-urlencoded"
  if (method == "POST" && strContentType != "application/x-www-form-urlencoded") {
    params = {};
  }

  // B) Forming the Signature Base String

  // i) Normalize request parameters
  var baseParams = sortJSON(_.merge(defaultApexHeaders, params));

  var baseParamsStr = qs.stringify(baseParams);
  baseParamsStr = qs.unescape(baseParamsStr);

  // ii) construct request URL ---> url is passed in to this function

  // iii) concatenate request elements
  var baseString = method.toUpperCase() + "&" + url + "&" + baseParamsStr;

  console.log("\x1b[32m", "Base String:");
  console.log("\x1b[0m", baseString);

  // C) Signing Base String to get Digital Signature
  var signWith = {
    key: fs.readFileSync(keyCertContent, 'utf8')
  };

  if (!_.isUndefined(keyCertPassphrase) && !_.isEmpty(keyCertPassphrase)) _.set(signWith, "passphrase", keyCertPassphrase);

  // Load pem file containing the x509 cert & private key & sign the base string with it.
  var signature = crypto.createSign('RSA-SHA256')
        .update(baseString)
        .sign(signWith, 'base64');

  // D) Assembling the Header
  var strApexHeader = "apex_l2_eg realm=\"" + realm + "\",apex_l2_eg_timestamp=\"" + timestamp +
    "\",apex_l2_eg_nonce=\"" + nonceValue + "\",apex_l2_eg_app_id=\"" + appId +
    "\",apex_l2_eg_signature_method=\"SHA256withRSA\",apex_l2_eg_version=\"1.0\",apex_l2_eg_signature=\"" + signature +
    "\"";

  return strApexHeader;
};
```

### Step 3: Signing Person request
Paste below codes to: `routes/index.js` - `t3step3`

```javascript
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

if (!_.isEmpty(authHeaders)) {
  _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
}
```

Save or restart app

### Step 4: Decrypting JWE Response

Copy below codes to replace codes at: routes/index.js - t3step4

```javascript
var personJWE = data.text;
if (personJWE == undefined || personJWE == null) {
  res.jsonp({
    status: "ERROR",
    msg: "PERSON DATA NOT FOUND"
  });
} else {
  console.log("\x1b[32m", "Person Data (JWE):", "\x1b[0m");
  console.log(personJWE);

  var personData;
  // Decrypt JWE to get the person data in JSON
  personData = securityHelper.decryptJWE(personJWE, _privateKeyContent);
  ```

  Save or restart app
