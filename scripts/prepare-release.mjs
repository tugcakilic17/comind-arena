import { mkdir, cp, copyFile, access, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
if(args.length>1 || (args.length && !/^--base=\/(?:[A-Za-z0-9_-]+\/)*$/.test(args[0]))) {
 throw new Error('Kullanım: npm run release -- --base=/ veya --base=/comind-arena/');
}
const base=args[0]?.slice(7) || '/';
await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build',`--base=${base}`],{cwd:root,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Derleme başarısız: ${code}`)));
});
const releases=path.join(root,'release');await mkdir(releases,{recursive:true});
const destination=path.join(releases,'comind-arena');
try{await access(path.join(destination,'.env'));throw new Error('release/comind-arena içinde sunucu .env ayarı var; bu klasörde yayın paketi üretmeyin.');}
catch(error){if(error.code!=='ENOENT')throw error;}
const target=destination;
await mkdir(target,{recursive:true});
// Empty only the previous generated dist files; keep directory handles intact on Windows.
const oldDist=path.join(target,'dist');
async function clearDistFiles(folder){
 let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
 for(const entry of entries){
  const file=path.resolve(folder,entry.name);
  if(!file.startsWith(path.resolve(oldDist)+path.sep)||entry.isSymbolicLink())throw new Error('Geçersiz derleme dosyası.');
  if(entry.isDirectory())await clearDistFiles(file);else await rm(file);
 }
}
await clearDistFiles(oldDist);
for(const folder of ['dist','server','deploy']) await cp(path.join(root,folder),path.join(target,folder),{recursive:true,filter:source=>folder!=='dist'||!source.endsWith('.md')});
await mkdir(path.join(target,'src'),{recursive:true});
for(const file of ['game.js','match-rules.js','game-worlds.js']) await copyFile(path.join(root,'src',file),path.join(target,'src',file));
for(const file of ['package.json','package-lock.json','Dockerfile','.dockerignore']) await copyFile(path.join(root,file),path.join(target,file));
await copyFile(path.join(root,'deploy/.env.production.example'),path.join(target,'.env.example'));
await copyFile(path.join(root,'deploy/README.md'),path.join(target,'README.md'));
await writeFile(path.join(target,'DEPLOYMENT.txt'),`Build base: ${base}\nAPP_URL must use the same path.\nRun npm ci --omit=dev, npm run db:migrate, npm start (see README.md).\n`);
await access(path.join(target,'server/migrations/001-accounts.sql'));
// Do not include .env, local databases, test users, dependencies or design masters.
const meta=JSON.parse(await readFile(path.join(target,'dist/deployment.json'),'utf8'));
if(meta.base!==base)throw new Error('Derleme yolu doğrulanamadı.');
// An archive from an earlier build must never be mistaken for the current release.
await rm(path.join(releases,'comind-arena-yayin.zip'),{force:true});
console.log(`\nYayın paketi hazır: ${destination}\nYol: ${base}\nGizli bilgiler ve yerel veritabanı pakete eklenmedi.\nHer derleme aynı klasörü günceller; eski ZIP kaldırılır.`);
