# TUTORIAL 1

### Step 1: Invoke the Sandbox Person API

Copy the URL below.

`https://myinfo.api.gov.sg/dev/L0/v1/person/S9203266C/`


`S9203266C` is the UINFIN (NRIC or FIN) parameter of the person.

Try to invoke the API again by using the following UINFIN :

* F9477325W
* S5062854Z
* T0066846F


MyInfo API Specs : [MyInfo Developer & Partner Portal](https://myinfo-api.app.gov.sg)

# TUTORIAL 2


## Getting Started
1. Open cmd or terminal
2. Change your directory to myinfo-tutorial-app root folder
3. Run "npm install -g nodemon" (If you have not done so)
4. Run "npm install" (If you have not done so)

## To Start The Sample App
Windows - `start.bat`

Linux/Mac - `./start.sh`

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

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

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

### Step 2: Call the Token API (with the authorisation code)
Paste below codes to: `routes/index.js` - `t2step2`

```javascript
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
```

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

// Sign request and add Authorization Headers
// t3step2a PASTE CODE BELOW

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
```

Save or restart app

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

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

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

### Step 5: Call Person API using accessToken
Paste below codes to: `routes/index.js` - `t2step5`

```javascript
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
      // t3step3 REPLACE CODE BELOW
      var personJWS = data.text;
      if (personJWS == undefined || personJWS == null) {
        res.jsonp({
          status: "ERROR",
          msg: "PERSON DATA NOT FOUND"
        });
      } else {
        console.log("\x1b[32m", "Response from Person API:", "\x1b[0m");
        console.log(personJWS);

        var personData;
        // verify signature & decode JWS to get the person data in JSON
        personData = securityHelper.verifyJWS(personJWS, _publicCertContent);
      // t3step3 END REPLACE CODE

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
      }
    }
  });
```

### Step 6: function to prepare request for PERSON API
Paste below codes to: `routes/index.js` - `t2step6`

```javascript
var strParams = "client_id=" + _clientId +
  "&attributes=" + _attributes;
var params = querystring.parse(strParams);

// assemble headers for Person API
var strHeaders = "Cache-Control=" + cacheCtl;
var headers = querystring.parse(strHeaders);

// Sign request and add Authorization Headers
// t3step2b REPLACE CODE BELOW


// NOTE: include access token in Authorization header as "Bearer " (with space behind)
  _.set(headers, "Authorization", "Bearer " + validToken);
// t3step2b END REPLACE CODE


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

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

### Step 7: function to fill the form with person data
Paste below codes to: `views/html/index.html` - `t2step7`

```javascript
var formValues = {
  "uinfin": data.uinfin,
  "name": data.name.value,
  "sex": data.sex.value,
  "race": data.race.value,
  // "nationality": data.nationality.value,
  // "dob": data.dob.value,
  // "email": data.email.value,
  // "mobileno": toStr(data.mobileno, 'PHONENUMLOCAL'),
  // "regadd": toStr(data.regadd, 'ADDRESSLOCAL'),
  // "housingtype": toStr(data, 'HOUSINGTYPE'),
  // "marital": data.marital.value,
  // "edulevel": data.edulevel.value,
  // "assessableincome": toStr(data.assessableincome, 'MONEY'),
};
```

Save or restart app

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15


# TUTORIAL 3

### Step 1: Switching to Secured API

Linux/Mac OS - `start.sh`  
Windows - `start.bat`

Uncomment L2 APIs
Comment L0 APIs

Close and restart app

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15

### Step 2: Signing Token & Person request

##### a) Signing the Token Request

Paste below codes to: `routes/index.js` - `t3step2a`

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
###### b) Signing the Person Request
Paste below codes to: `routes/index.js` - `t3step2b`

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

#### Login Credentials
>UINFIN: S9812381D  
>Password: MyInfo2o15


### Step 3: Decrypting JWE Response

Copy below codes to replace codes at: routes/index.js - t3step3

```javascript
var personJWE = data.text;
if (personJWE == undefined || personJWE == null) {
  res.jsonp({
    status: "ERROR",
    msg: "PERSON DATA NOT FOUND"
  });
} else {
  console.log("\x1b[32m", "Response from Person API:", "\x1b[0m");
  console.log(personJWE);

  // header.encryptedKey.iv.ciphertext.tag
  var jweParts = personJWE.split(".");
  var personData = securityHelper.decryptJWE(jweParts[0], jweParts[1], jweParts[2], jweParts[3], jweParts[4], _privateKeyContent);
  ```

  Save or restart app

  #### Login Credentials
  >UINFIN: S9812381D  
  >Password: MyInfo2o15
