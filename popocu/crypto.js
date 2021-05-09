const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const tempSecretKey = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN : "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3";
const secretKey = crypto.createHash('sha256').update(String(tempSecretKey)).digest('base64').substr(0, 32);
const iv = crypto.randomBytes(16);
const tmp = require('tmp');

const encrypt = (text) => {

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

const decrypt = (hash) => {

    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));

    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

    return decrpyted.toString();
};

const encryptBuffer = (text) => {

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

const decryptBuffer = (hash) => {

    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));

    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

    return decrpyted.toString();
};

const fs = require('fs');
const ecnryptFile = (filePath) => {

    
    return new Promise((resolve, reject) => {
        // input file
        const r = fs.createReadStream(filePath);
      
        // encrypt content
        const encrypt = crypto.createCipheriv(algorithm, secretKey, iv);

        const tmpobj = tmp.fileSync();
      
        // write file
        const w = fs.createWriteStream(tmpobj.name);

        // start pipe
        r.pipe(encrypt).pipe(w);
        
        r.on('error', function (error) {
            console.log("read error")
            reject(error.message)
        })
        encrypt.on('error', function (error) {
            console.log("encrypt error")
            reject(error.message)
        })
        w.on('error', function (error) {
            console.log("write error")
            reject(error.message)
        })
        w.on('close', function () {
            resolve(tmpobj.name)
        })
  })
  

  
  return 
}

const decryptFile = ({filePath = null, fileStream = null}) => {

    return new Promise((resolve, reject) => {
        // input file
        let r = null;
        if (filePath != null) r= fs.createReadStream(filePath)
        else r = fileStream;
      
        // decrypt content
        const decrypt = crypto.createDecipheriv(algorithm, secretKey, iv);

        const tmpobj = tmp.fileSync();
      
        // write file
        let w = null
        if (filePath != null) w = fs.createWriteStream(filePath);
        else  w = fs.createWriteStream(tmpobj.name);
        

        // start pipe
        r.pipe(decrypt).pipe(w);
        
        r.on('error', function (error) {
            console.log("read error")
            reject(error.message)
        })
        decrypt.on('error', function (error) {
            console.log("decrypt error")
            reject(error.message)
        })
        w.on('error', function (error) {
            console.log("write error")
            reject(error.message)
        })
        w.on('close', function () {
            if (filePath != null ) resolve(filePath)
            else resolve(tmpobj.name)
        })
    })
}

module.exports = {
    encryptBuffer,
    decryptBuffer,
    ecnryptFile,
    decryptFile
};