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

  // A) Construct the Authorisation Token Parameters
  var defaultApexHeaders = {
    "apex_l2_eg_app_id": appId, // App ID assigned to your application
    "apex_l2_eg_nonce": nonceValue, // secure random number
    "apex_l2_eg_signature_method": "SHA256withRSA",
    "apex_l2_eg_timestamp": timestamp, // Unix epoch time
    "apex_l2_eg_version": "1.0"
  };

  // B) Forming the Base String
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
  }; // Provides private key

  // Load pem file containing the x509 cert & private key & sign the base string with it to produce the Digital Signature
  var signature = crypto.createSign('RSA-SHA256')
    .update(baseString)
    .sign(signWith, 'base64');

  // D) Assembling the Authorization Header
  var strApexHeader = "apex_l2_eg realm=\"" + realm + // Defaults to 1st part of incoming request hostname
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
  try {
    var decoded = jwt.verify(jws, fs.readFileSync(publicCert, 'utf8'), {
      algorithms: ['RS256'],
      ignoreNotBefore: true
    });
    return decoded;
  }
  catch(error) {
    console.error("\x1b[31mError with verifying and decoding JWS:\x1b[0m %s", error);
    throw("Error with verifying and decoding JWS");
  }
}

// Decrypt JWE using private key
security.decryptJWE = function decryptJWE(header, encryptedKey, iv, cipherText, tag, privateKey) {
  console.log("\x1b[32mDecrypting JWE \x1b[0m(Format: \x1b[31m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[36m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[32m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[35m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[33m%s\x1b[0m)","header",".","encryptedKey",".","iv",".","cipherText",".","tag");
  console.log("\x1b[31m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[36m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[32m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[35m%s\x1b[0m\x1b[1m%s\x1b[0m\x1b[33m%s\x1b[0m",header,".",encryptedKey,".",iv,".",cipherText,".",tag);
  try {
    // Additional Authentication Data (aad) - ensures integrity of cipherText
    var aad = Buffer.from(header, 'ascii');
    // header contains the algorithms
    header = JSON.parse(URLSafeBase64.decode(header));
    // initialisation vector - secure random value
    iv = URLSafeBase64.decode(iv);
    // encrypted payload
    cipherText = URLSafeBase64.decode(cipherText);
    // authentication tag - ensures integrity of cipherText and aad
    tag = Buffer.from(tag, "base64");
    // encryptedKey contains CEK (Content Encryption Key)
    encryptedKey = URLSafeBase64.decode(encryptedKey);

    // specify algorithm for encryptedKey ("RSA1_5")
    var rsa = new jose.jwa(header.alg);
    // => decrypt encryptedKey using private key, to get CEK (Content Encryption Key)
    var contentEncryptionKey = rsa.unwrapKey(encryptedKey, fs.readFileSync(privateKey, 'utf8'));

    // specify algorithm for cipherText ("A128CBC-HS256")
    var aes = new jose.jwa(header.enc);
    // => decrypt cipherText using contentEncryptionKey + iv, and validates against aad & tag
    var plain = aes.decrypt(cipherText, tag, aad, iv, contentEncryptionKey);

    return JSON.parse(plain);
  }
  catch(error) {
    console.error("\x1b[31mError with decrypting JWE:\x1b[0m %s", error);
    throw("Error with decrypting JWE");
  }
}

module.exports = security;
