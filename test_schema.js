const https = require('https');

const options = {
  hostname: 'zdvowifsjuyolnsxasuq.supabase.co',
  port: 443,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_m46nSkg25Kc4foFPqnFiMQ_hoUkniPi',
    'Authorization': 'Bearer sb_publishable_m46nSkg25Kc4foFPqnFiMQ_hoUkniPi'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.definitions && parsed.definitions.photo_uploads) {
        console.log(Object.keys(parsed.definitions.photo_uploads.properties));
      } else {
        console.log("photo_uploads not found in definitions");
      }
    } catch(e) {
      console.log('Error parsing', e);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
