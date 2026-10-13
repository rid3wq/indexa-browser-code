const fs=require('fs');
const pkg=require('../package.json');
const file='renderer/config.js';
if(fs.existsSync(file)&&!process.env.INDEXA_API_KEY)process.exit(0);
const cfg={
 API:process.env.INDEXA_API||'https://indexa-console.pages.dev',
 KEY:process.env.INDEXA_API_KEY||'pk_76b1841ceb6dd874beabe2d014536737',
 VERSION:pkg.version,
 UPDATE_URL:process.env.INDEXA_UPDATE_URL||'https://runtimedata.web.app/index/version.json'
};
fs.writeFileSync(file,'window.CFG='+JSON.stringify(cfg)+';\n');
