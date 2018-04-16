const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const nonce = require('nonce')();
const crypto = require('crypto');
const qs = require('querystring');
const jwt = require('jsonwebtoken');
const jose = require('jose');
const URLSafeBase64 = require('urlsafe-base64');

var security = {};

// Sorts a JSON object based on the key value in alphabetical order
function sortJSON(json) {
  if (_.isNil(json)) {
    return json;
  }

  var newJSON = {};
  var keys = Object.keys(json);
  keys.sort();

  for (key in keys) {
    newJSON[keys[key]] = json[keys[key]];
  }

  return newJSON;
};

/**
 * @param url Full API URL
 * @param params JSON object of params sent, key/value pair.
 * @param method
 * @param appId ClientId
 * @param keyCertContent Private Key Certificate content
 * @param keyCertPassphrase Private Key Certificate Passphrase
 * @returns {string}
 */
function generateSHA256withRSAHeader(url, params, method, strContentType, appId, keyCertContent, keyCertPassphrase, realm) {
  var nonceValue = nonce();
  var timestamp = (new Date).getTime();

  // A) Construct the Authorisation Token
  var defaultApexHeaders = {
    "apex_l2_eg_app_id": appId, // App ID assigned to your application
    "apex_l2_eg_nonce": nonceValue, // secure random number
    "apex_l2_eg_signature_method": "SHA256withRSA",
    "apex_l2_eg_timestamp": timestamp, // Unix epoch time
    "apex_l2_eg_version": "1.0"
  };

  // B) Forming the Signature Base String
  // Base String is a representation of the entire request (ensures message integrity)

  // i) Normalize request parameters
  var baseParams = sortJSON(_.merge(defaultApexHeaders, params));

  var baseParamsStr = qs.stringify(baseParams);
  baseParamsStr = qs.unescape(baseParamsStr); // url safe

  // ii) construct request URL ---> url is passed in to this function
  // NOTE: need to include the ".e." in order for the security authorisation header to work
  //myinfosgstg.api.gov.sg -> myinfosgstg.e.api.gov.sg
  url = _.replace(url, ".api.gov.sg", ".e.api.gov.sg");

  // iii) concatenate request elements (HTTP method + url + base string parameters)
  var baseString = method.toUpperCase() + "&" + url + "&" + baseParamsStr;

  console.log("\x1b[32m", "Base String:", "\x1b[0m");
  console.log(baseString);

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
  var strApexHeader = "apex_l2_eg realm=\"" + realm + // Authentication Realm
    "\",apex_l2_eg_timestamp=\"" + timestamp +
    "\",apex_l2_eg_nonce=\"" + nonceValue +
    "\",apex_l2_eg_app_id=\"" + appId +
    "\",apex_l2_eg_signature_method=\"SHA256withRSA\"" +
    ",apex_l2_eg_version=\"1.0\"" +
    ",apex_l2_eg_signature=\"" + signature +
    "\"";

  return strApexHeader;
};

/**
 * @param url API URL
 * @param params JSON object of params sent, key/value pair.
 * @param method
 * @param appId API ClientId
 * @param passphrase API Secret or certificate passphrase
 * @returns {string}
 */
security.generateAuthorizationHeader = function(url, params, method, strContentType, authType, appId, keyCertContent, passphrase, realm) {

  if (authType == "L2") {
    return generateSHA256withRSAHeader(url, params, method, strContentType, appId, keyCertContent, passphrase, realm);
  } else {
    return "";
  }

};


// Verify & Decode JWS or JWT
security.verifyJWS = function verifyJWS(jws, publicCert) {
  // verify token
  // ignore notbefore check because it gives errors sometimes if the call is too fast.
  var decoded = jwt.verify(jws, fs.readFileSync(publicCert, 'utf8'), {
    algorithms: ['RS256'],
    ignoreNotBefore: true
  });
  return decoded;
}

// Decrypt JWE
security.decryptJWE = function decryptJWE(header, encryptedKey, iv, cipherText, tag, privateKey) {
  console.log("\x1b[32mDecrypting JWE \x1b[0m(Format: \x1b[40m\x1b[31m%s\x1b[37m%s\x1b[36m%s\x1b[37m%s\x1b[33m%s\x1b[37m%s\x1b[35m%s\x1b[37m%s\x1b[34m%s\x1b[0m)","header",".","encryptedKey",".","iv",".","cipherText",".","tag");
  console.log("\x1b[40m\x1b[31m%s\x1b[37m%s\x1b[36m%s\x1b[37m%s\x1b[33m%s\x1b[37m%s\x1b[35m%s\x1b[37m%s\x1b[34m%s\x1b[0m",header,".",encryptedKey,".",iv,".",cipherText,".",tag);
  header = Buffer.from(header, 'ascii');
  iv = URLSafeBase64.decode(iv);
  cipherText = URLSafeBase64.decode(cipherText);
  tag = Buffer.from(tag, "base64");

  var keytoUnwrap = URLSafeBase64.decode(encryptedKey);
  var rsa = new jose.jwa("RSA1_5");
  var unEncryptedKey = rsa.unwrapKey(keytoUnwrap, fs.readFileSync(privateKey, 'utf8'));

  var aes = new jose.jwa('A128CBC-HS256');
  var plain = aes.decrypt(cipherText, tag, header, iv, unEncryptedKey);

  return JSON.parse(plain);
}

module.exports = security;
