import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SINNER_MAP = {
  yisang: 'Yi Sang',
  faust: 'Faust',
  don: 'Don Quixote',
  ryoshu: 'Ryoshu',
  meursault: 'Meursault',
  honglu: 'Hong Lu',
  heathcliff: 'Heathcliff',
  ishmael: 'Ishmael',
  rodion: 'Rodion',
  sinclair: 'Sinclair',
  outis: 'Outis',
  gregor: 'Gregor'
};

async function fetchFandomImageUrl(searchTerm) {
  const queryUrl = `https://limbuscompany.fandom.com/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchTerm + ' Icon')}&srnamespace=6`;
  
  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    https.get(queryUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const searchResults = json.query.search;
          if (searchResults && searchResults.length > 0) {
            const fileName = searchResults[0].title;
            const realFileName = fileName.replace('File:', '');
            
            const infoUrl = `https://limbuscompany.fandom.com/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=File:${encodeURIComponent(realFileName)}`;
            https.get(infoUrl, options, (infoRes) => {
              let infoData = '';
              infoRes.on('data', chunk => infoData += chunk);
              infoRes.on('end', () => {
                try {
                  const infoJson = JSON.parse(infoData);
                  const pages = infoJson.query.pages;
                  const firstPage = Object.values(pages)[0];
                  if (firstPage.imageinfo && firstPage.imageinfo.length > 0) {
                    resolve(firstPage.imageinfo[0].url);
                  } else {
                    resolve(null);
                  }
                } catch (e) { resolve(null); }
              });
            }).on('error', () => resolve(null));
          } else {
            resolve(null);
          }
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function downloadFile(url, filename) {
  const targetPath = path.join(OUTPUT_DIR, filename);
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://limbuscompany.fandom.com/'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(targetPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Starting images downloader using Fandom API...');
  
  const identities = JSON.parse(fs.readFileSync('identities_list.json', 'utf8'));
  
  for (const item of identities) {
    const filename = `${item.id}.png`;
    const targetPath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(targetPath)) {
      console.log(`[Skip] ${filename} already exists`);
      continue;
    }
    
    // Construct search term from ID and Sinner
    // e.g. "yisang_solemn" -> "Yi Sang Solemn Vow"
    const sinnerName = SINNER_MAP[item.sinner] || item.sinner;
    const identityPart = item.id.split('_').slice(1).join(' ');
    const searchTerm = `${sinnerName} ${identityPart}`;
    
    console.log(`[Processing] ${item.id} -> Search: ${searchTerm}`);
    
    const url = await fetchFandomImageUrl(searchTerm);
    if (url) {
      try {
        await downloadFile(url, filename);
        console.log(`[Success] Downloaded ${filename}`);
      } catch (err) {
        console.error(`[Fail] Download error for ${filename}: ${err.message}`);
      }
    } else {
      console.warn(`[Warn] No image found for ${searchTerm}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('All tasks completed.');
}

main().catch(console.error);
