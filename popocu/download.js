const { exec } = require('child_process');
const cryptoEncryptor = require('./crypto')
const http = require('http'); // or 'https' for https:// URLs
const fs = require('fs');
const tmp = require('tmp');
var request = require('request');

module.exports = (fileUrlPath) => new Promise((resolve, reject) => {

  // const tmpobj = tmp.fileSync();
  // const w = fs.createWriteStream(tmpobj.name);
  // const request = http.get(fileUrlPath, function(response) {
  //   // if (response.statusCode == 200)
  //   const downlaodedWritableStream = response.pipe(tmpobj.name);

  //   downlaodedWritableStream.on()
  //   const decryptedFileStream = cryptoEncryptor.decryptFile(tmpobj.name)


  // });
  
  cryptoEncryptor.decryptFile({fileStream: request(fileUrlPath)}).then(decryptedFileName => {
    // fs.unlinkSync(tmpobj.name);
    resolve(decryptedFileName)
  })
  .catch( error => {
    // fs.unlinkSync(tmpobj.name);
    console.log("error ocured", error)
  });


});
