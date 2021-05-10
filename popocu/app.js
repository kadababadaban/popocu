const http = require('http');
const express = require('express');
const stringify = require('json-stringify-safe')
require('dotenv').config()

const multer  = require('multer')
const path = require('path');
const { mkdir, fstat } = require('fs');
const cors = require('cors');
const fs = require('fs')

const { gitState, connectToGitHub, getStats, uploadFiles, downloadFile } = require('./repo');

const app = express();
const server = http.createServer(app);

// CONSTANTS
const port = process.env.PORT || 4000;
const publicPath = path.join(__dirname, './client/build');
const FILES_LIMIT = 5;
const MAX_FILE_SIZE_MB = parseInt(process.env['MAX_FILE_SIZE_MB']) || 100;

app.use(cors());
// app.options('*', cors());
app.use(express.static(publicPath));
app.use(function(req, res, next){
  req.setTimeout(500000, function(){
      console.log('custom error Request timeout')
  });
  next();
});

// Custom function to handle uploads
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    mkdir(path.join(__dirname + '/uploads'), () => {
      cb(null, path.join(__dirname + '/uploads'));
    });
  },
  filename: function (req, file, cb) {
    // Get extention of uploaded file
    const extension = path.parse(file.originalname).ext;
    console.log('received', file.originalname);

    // Save file using format
    cb(null, file.originalname);
  }
});

// Applying custom upload handler
const upload = multer({ storage: storage })



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});


app.post('/initialInfo', (req, res) => {
  res.send({
    FILES_LIMIT: FILES_LIMIT,
    MAX_FILE_SIZE_MB: MAX_FILE_SIZE_MB
  });
});


app.post('/stats', async (req, res) => {
  getStats()
  .then(stats => {
    res.send(stringify(stats))
  });
});

app.post('/upload', upload.array('somefiles', FILES_LIMIT), (req, res) => {
  let tokenHeader = req.header('Custom-Auth')
  if (!tokenHeader || (tokenHeader.length && tokenHeader != process.env.API_KEY))
    return res.status(500).json(`token error`)

  uploadFiles(req.files)
  .then(links => {
    res.send(links);
  })
  .catch(err => {
    res.status(500).json(err.message);
  });
});

app.post('/file', upload.array('file', FILES_LIMIT), (req, res) => {
  let tokenHeader = req.header('Custom-Auth')
  if (!tokenHeader || (tokenHeader.length && tokenHeader != process.env.API_KEY))
    return res.status(500).json(`token error`)

  uploadFiles(req.files)
  .then(links => {
    res.send(links[0]);
    cleanTMP(res)
  })
  .catch(err => {
    res.status(500).json(err.message);
    cleanTMP(res)
  });
});

app.get('/downloadfile', (req, res) => {
  let tokenHeader = req.header('Custom-Auth')
  if (!tokenHeader || (tokenHeader.length && tokenHeader != process.env.API_KEY))
    return res.status(500).json(`token error`)

  downloadFile(req.query.filename)
  .then(file => {
    // res.send(stream);
    // res.download(file)
    fix res downlaod with buffer send
    cleanTMP(res)
    // var file = __dirname + '/upload-folder/dramaticpenguin.MOV';

    // var filename = path.basename(file);
    // var mimetype = mime.lookup(file);
  
    // res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    // res.setHeader('Content-type', mimetype);
  
    // var filestream = fs.createReadStream(file);
    // filestream.pipe(res);
    // https://itnext.io/sharing-aes-256-encrypted-data-between-node-js-and-python-3-d0c87eae212b
    // https://stackoverflow.com/questions/10548973/encrypting-and-decrypting-with-python-and-nodejs
    // https://nodejs.org/en/knowledge/advanced/streams/how-to-use-stream-pipe/
    // https://gist.github.com/chris-rock/335f92742b497256982a
    // https://stackoverflow.com/questions/62994333/how-to-encrypt-a-stream-in-node-js
  })
  .catch(err => {
    res.status(500).json(err.message);
    cleanTMP(res)
  });
});

app.post('/encrypttest', upload.any('file'), (req, res) => {
  let tokenHeader = req.header('Custom-Auth')
  if (!tokenHeader || (tokenHeader.length && tokenHeader != process.env.API_KEY))
    return res.status(500).json(`token error`)

    const cryptoEncryptor = require('./crypto')
    cryptoEncryptor.ecnryptFile(req.files[0].path)
    .then(tmpFileEncrypted => cryptoEncryptor.decryptFile({fileBuffer: fs.readFileSync(tmpFileEncrypted)}))
  .then(links => {
    res.send(links + fs.readFileSync(links));
    // res.send(links);
  })
  .catch(err => {
    res.status(500).json(err.message);
  });
});

/**
 * Server Initialization
 */ 
connectToGitHub()
.then(() => {
  console.log(`[Server]: Working with ${gitState.blockLetter}${gitState.workingBlock}`);

  server.listen(port, () => {
    console.log(`[Server]: App is open on port ${port}`);
  });

});

function cleanTMP(res) {
  res.on('finish', function() {
    let files = require("glob").sync("/tmp/tmp-*");
    files.forEach(item => {
      if(fs.existsSync(item)) fs.unlinkSync(item);
    });
  });
  res.on('close', function() {
    let files = require("glob").sync("/tmp/tmp-*");
    files.forEach(item => {
      if(fs.existsSync(item)) fs.unlinkSync(item);
    });
  })
  res.on('error', function() {
    let files = require("glob").sync("/tmp/tmp-*");
    files.forEach(item => {
      if(fs.existsSync(item)) fs.unlinkSync(item);
    });
  });
}

