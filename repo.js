/**
 * Functions to work with GitHub
 */

const axios = require('axios');

const uploadToGithub = require('./upload')
const downloadFromGithub = require('./download')

const token = process.env['GITHUB_TOKEN'];
const maxBlockSizeMB = parseInt(process.env['BLOCK_SIZE_MB']) || 1000;
const maxFileSizeMB = parseInt(process.env['MAX_FILE_SIZE_MB']) || 50;
const isRepoPrivate = process.env['IS_PRIVATE'] || false;
let API_URL;

// Global state
const gitState = {
  workingBlock: 0,
  blockLetter: 'localb',
  pattern: /localb\d+/,
  username: process.env['GITHUB_USERNAME'] || null
}

if (process.env['GITHUB_ORGANIZATION']) {
  API_URL = `https://api.github.com/orgs/${process.env['GITHUB_ORGANIZATION']}`;
  gitState.blockLetter = 'orgb';
  gitState.pattern = new RegExp(/orgb\d+/);
} else {
  API_URL = "https://api.github.com/user";
}

let items_perpage = 1000


// Run once at server initialization
function connectToGitHub() {
  return new Promise((resolve, reject) => {
    switchToNextBlock()
    .then(() => {
      console.log(`[connectToGithub]: New working block is ${gitState.blockLetter}${gitState.workingBlock}`);
      resolve();
    })
    .catch(error => {
      console.log(error);
      reject();
    })
  });
}

// Run on POST /stats
function getStats() {
  return getRepoInfo().then(info => ({
    currentBlock: gitState.workingBlock,
    currentBlockSize: info.currentBlockSize,
    maxBlockSizeMB: maxBlockSizeMB,
    totalUploaded: info.totalUploaded
}));
}

function getRepoInfo() {
  let currentBlockSize = null;
  let totalUploaded = 0;

  return new Promise(resolve => {
    getAllBlocks()
    .then(blocks => {
      Object.keys(blocks).forEach(blockName => {
        const block = blocks[blockName];
        totalUploaded += block.size;
      });

      currentBlockSize = blocks[gitState.blockLetter + gitState.workingBlock].size;

      resolve({
        currentBlockSize,
        totalUploaded
      });
    });
  });
}

function createBlock(blockNum) {
  blockNum = parseInt(blockNum);

  console.log(`Creating block ${gitState.blockLetter}${blockNum}`);
  const DATA = {
    name: `${gitState.blockLetter}${blockNum}`,
    description: `Block ${blockNum}`,
    homepage: "",
    private: isRepoPrivate,
    has_issues: false,
    has_projects: false,
    has_wiki: false,
    license_template: "unlicense"
  };

  return new Promise((resolve, reject) => {
    let headers = {'Authorization': `token ${token}`}
    axios.post(`${API_URL}/repos?per_page=${items_perpage}&page=1`, DATA, { headers: headers })
    .then(response => {
      console.log('✅ Block was created');

      // Getting repo owner
      if (!gitState.username) {
        gitState.username = response.data.owner.login;
        console.log('😎 Set up owner:', response.data.owner.login);
      }
      
      resolve('✅ Block was created');
    })
    .catch(({ message }) => {
      reject(`⚠️  Block was not created, errorMessage=${message}`);
    });
  });
}

function switchToNextBlock() {
  return new Promise((resolve, reject) => {
    getAllBlocks()
    .then(blocks => {
      let needToCreateThisBlock = false;

      // Just for test
      // blocks['b1'].size = 1000000;
      // blocks['b2'].size = 1000000;
      // blocks['b3'].size = 1000000;
      // blocks['b4'].size = 1000000;

      // Selecting next working block
      let nextBlock = gitState.workingBlock;
      while (true) {
        nextBlock += 1;

        // If block exists
        const selectedBlock = blocks[gitState.blockLetter + nextBlock];
        if (selectedBlock) {

          if (hasEnoughSpace(selectedBlock)) {
            console.log(`[SwitchBlocks]: Selecting ${gitState.blockLetter}${nextBlock}`);
            gitState.workingBlock = nextBlock;
            break;
          } else {
            console.log(`[SwitchBlocks]: Block ${gitState.blockLetter}${nextBlock} is full`);
          }
        } else {
          console.log(`[SwitchBlocks]: Need to create ${gitState.blockLetter} ${nextBlock}`);
          gitState.workingBlock = nextBlock;
          needToCreateThisBlock = true;
          break;
        }
      }

      if (needToCreateThisBlock) {
        createBlock(nextBlock)
        .then(() => {
          resolve('✅ New working block selected');
        })
        .catch((error) => {
          console.log(error);
          reject('🛑 Error in selecting next block');
        })
      } else {
        resolve('✅ New working block selected');
      }
    });
  });
}

// Returns True if we can use block for uploads, otherwise - False
function hasEnoughSpace(block) {
  return block.size < (maxBlockSizeMB - maxFileSizeMB) * 1000;
}

// Returns Object with all block {'b1': repo}
function getAllBlocks() {
  return new Promise((resolve, reject) => {
    let blocks = {};

    let headers = {'Authorization': `token ${token}`}
    axios.get(`${API_URL}/repos?per_page=${items_perpage}&page=1`, { headers: headers })
    .then(gitResponse => {

      gitResponse.data = gitResponse.data.sort(function (a, b) { return (a["description"] && b["description"] && parseInt(a["description"].replace(/\D/g, '')) > parseInt(b["description"].replace(/\D/g, ''))) ? 1 : -1; });

      // Going through each repo
      gitResponse.data.forEach(repo => {

        // It this repo is block
        if (gitState.pattern.test(repo.name)) {
          console.log('[getAllBlocks]: Found repo', repo.full_name);
          blocks[repo.name] = repo;

          if (!gitState.username) {
            gitState.username = repo.owner.login;
            console.log('😎 Set up owner:', repo.owner.login);
          }
        }
      });

      resolve(blocks);
    })
    .catch(error => {
      console.log(error);
      reject('🛑 Unable to get All Blocks from GitHub');
    });
  });
}

function uploadToCurrentBlock(filePath) {
  return uploadToGithub(gitState.username, `${gitState.blockLetter}${gitState.workingBlock}`, filePath);
}

async function uploadToNextBlock(filePath) {
  console.log('[uploadToNextBlock]:', '-> switching to next block')
  await switchToNextBlock()

  return await uploadToCurrentBlock(filePath)
}

async function upload(filePath) {
  console.log('[upload]:', 'uploading', filePath)

  try {
    console.log('[upload]:', '== trying upload to current block')

    return await uploadToCurrentBlock(filePath)
  } catch ({ error }) {
    if (error !== 'no free space') {
      console.error('[upload]:', 'xxx error:', error)
      throw error
    }

    console.log('[upload]:', '== trying upload to next block')

    return uploadToNextBlock(filePath)
  }
}

function downloadFile(fileUrlPath) {
  console.log('[download]:', 'downloading', fileUrlPath)
  return downloadFromGithub(fileUrlPath)
}

function uploadFiles(files) {
  return files.reduce(
    (load, file) => load.then(async (urls) => {
      console.log("[uploadFiles]: File was saved at:", file.path);

      try {
        const file_url = await upload(file.path);

        return [ ...urls, file_url ];
      } catch (err) {
        console.error("[uploadFiles]:", 'Error uploading file', file.path);
        console.error(err);

        return [ ...urls, '' ];
      }
    }),
    Promise.resolve([])
  );
}

module.exports = {
  gitState,
  connectToGitHub,
  getStats,
  uploadFiles,
  downloadFile
};
