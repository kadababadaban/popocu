const { exec } = require('child_process');
const cryptoEncryptor = require('./crypto')
const http = require('http'); // or 'https' for https:// URLs
const fs = require('fs');
const tmp = require('tmp');
var request = require('request');

const download = (uri, filename, callback) => {
  request.head(uri, (err, res, body) => {
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);

      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

module.exports = (fileUrlPath) => new Promise((resolve, reject) => {

  const tmpobj = tmp.fileSync();
  // const w = fs.createWriteStream(tmpobj.name);
  // const request = http.get(fileUrlPath, function(response) {
  //   // if (response.statusCode == 200)
  //   const downlaodedWritableStream = response.pipe(tmpobj.name);

  //   downlaodedWritableStream.on()
  //   const decryptedFileStream = cryptoEncryptor.decryptFile(tmpobj.name)


  // });

  download(fileUrlPath, tmpobj.name, () => {    
    cryptoEncryptor.decryptFile({fileBuffer: require('fs').readFileSync(tmpobj.name)}).then(decryptedFileName => {
      resolve(decryptedFileName)
    })
    .catch( error => {
      console.log("error ocured", error)
    });
  });


});
