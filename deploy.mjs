import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('GITHUB_TOKEN not provided in environment');
  process.exit(1);
}

const OWNER = 'yathaarthj03-blip';
const REPO = 'calmcap';
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}`;

const headers = {
  Authorization: `token ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'CalmCap-Deployer',
};

async function ghRequest(urlPath, method = 'GET', body = null) {
  const url = `${BASE_URL}${urlPath}`;
  const options = {
    method,
    headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API Error ${res.status} on ${method} ${urlPath}: ${text}`);
  }
  return res.json();
}

async function createBlob(content, isBase64 = false) {
  const res = await ghRequest('/git/blobs', 'POST', {
    content,
    encoding: isBase64 ? 'base64' : 'utf-8',
  });
  return res.sha;
}

function getFilesRecursively(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
      results = results.concat(getFilesRecursively(fullPath, baseDir));
    } else {
      if (file === 'deploy.js') continue;
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function deployBranch(branchName, files, commitMessage) {
  console.log(`\n--- Deploying to ${branchName} (${files.length} files) ---`);

  // 1. Get branch ref
  let parentCommitSha = null;
  try {
    const ref = await ghRequest(`/git/ref/heads/${branchName}`);
    parentCommitSha = ref.object.sha;
    console.log(`Current ${branchName} tip: ${parentCommitSha}`);
  } catch (err) {
    console.log(`Branch ${branchName} might not exist yet, will create.`);
  }

  // 2. Upload blobs in chunks
  const treeEntries = [];
  for (let i = 0; i < files.length; i++) {
    const { fullPath, relPath, contentOverride } = files[i];
    let sha;
    if (contentOverride !== undefined) {
      sha = await createBlob(contentOverride);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'].includes(ext);
      if (isBinary) {
        const base64 = fs.readFileSync(fullPath).toString('base64');
        sha = await createBlob(base64, true);
      } else {
        const text = fs.readFileSync(fullPath, 'utf-8');
        sha = await createBlob(text, false);
      }
    }
    treeEntries.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha,
    });
    if ((i + 1) % 10 === 0 || i === files.length - 1) {
      console.log(`Uploaded ${i + 1}/${files.length} blobs...`);
    }
  }

  // 3. Create tree
  console.log('Creating tree...');
  const tree = await ghRequest('/git/trees', 'POST', {
    tree: treeEntries,
  });
  console.log(`Tree created: ${tree.sha}`);

  // 4. Create commit
  console.log('Creating commit...');
  const commit = await ghRequest('/git/commits', 'POST', {
    message: commitMessage,
    tree: tree.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  });
  console.log(`Commit created: ${commit.sha}`);

  // 5. Update ref
  console.log(`Updating ref heads/${branchName}...`);
  if (parentCommitSha) {
    await ghRequest(`/git/refs/heads/${branchName}`, 'PATCH', {
      sha: commit.sha,
      force: true,
    });
  } else {
    await ghRequest('/git/refs', 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: commit.sha,
    });
  }
  console.log(`Successfully updated ${branchName} to ${commit.sha}`);
}

async function run() {
  try {
    // 1. Build dist files for gh-pages
    const distFiles = getFilesRecursively(path.resolve('./dist'));
    // Add .nojekyll to ensure GitHub Pages serves all assets
    distFiles.push({
      relPath: '.nojekyll',
      contentOverride: '',
    });

    await deployBranch('gh-pages', distFiles, 'Deploy: fix React error 185, infinite loop & memoize selectors');

    // 2. Build source files for main
    const sourceFiles = getFilesRecursively(path.resolve('.'));
    await deployBranch('main', sourceFiles, 'Fix: React error 185 (Maximum update depth exceeded) & stabilize selectors');

    console.log('\nDeployment completed successfully to both main and gh-pages!');
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

run();
