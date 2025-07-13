const crypto = require('crypto');

// Implement exactly what the PHP example shows
function phpStyleAuth() {
  const token = "test123"; // Using the simple token you just set
  const salt = 123456; // Fixed salt for testing
  
  console.log('=== PHP Style Authentication ===');
  console.log('Token:', token);
  console.log('Salt:', salt);
  
  // Exactly like PHP: $str2hash = $salt . "/". $key;
  const str2hash = salt + "/" + token;
  console.log('String to hash:', str2hash);
  
  // PHP: $md5raw = md5($str2hash, true);
  const md5raw = crypto.createHash('md5').update(str2hash).digest();
  console.log('MD5 raw (hex):', md5raw.toString('hex'));
  
  // PHP: $base64hash = base64_encode($md5raw);
  const base64hash = md5raw.toString('base64');
  console.log('Base64 hash:', base64hash);
  
  // Build URL exactly like PHP
  const url = `http://37.27.201.26:8082/manage/server_status?salt=${salt}&hash=${encodeURIComponent(base64hash)}`;
  console.log('Final URL:', url);
  
  return { salt, hash: base64hash };
}

phpStyleAuth();