import { mkdir, mkdtemp, cp, copyFile, access, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
if(args.length>1 || (args.length && !/^--base=\/(?:[A-Za-z0-9_-]+\/)*$/.test(args[0]))) {
 throw new Error('Kullanım: npm run release -- --base=/ veya --base=/comind-arena/');
}
const base=args[0]?.slice(7) || '/comind-arena/';
await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build',`--base=${base}`],{cwd:root,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Derleme başarısız: ${code}`)));
});
// Each release gets a fresh folder, so an earlier upload/config is never overwritten.
const releases=path.join(root,'release');await mkdir(releases,{recursive:true});
const target=await mkdtemp(path.join(releases,'comind-arena-'));
for(const folder of ['dist','server','deploy']) await cp(path.join(root,folder),path.join(target,folder),{recursive:true,filter:source=>folder!=='dist'||!source.endsWith('.md')});
await mkdir(path.join(target,'src'));
for(const file of ['game.js','match-rules.js','game-worlds.js']) await copyFile(path.join(root,'src',file),path.join(target,'src',file));
for(const file of ['package.json','package-lock.json','Dockerfile','.dockerignore']) await copyFile(path.join(root,file),path.join(target,file));
await copyFile(path.join(root,'deploy/.env.production.example'),path.join(target,'.env.example'));
await copyFile(path.join(root,'deploy/README.md'),path.join(target,'README.md'));
await writeFile(path.join(target,'DEPLOYMENT.txt'),`Build base: ${base}\nAPP_URL must use the same path.\nRun npm ci --omit=dev, npm run db:migrate, npm start (see README.md).\n`);
await access(path.join(target,'server/migrations/001-accounts.sql'));
// Do not include .env, local databases, test users, dependencies or design masters.
const meta=JSON.parse(await readFile(path.join(target,'dist/deployment.json'),'utf8'));
if(meta.base!==base)throw new Error('Derleme yolu doğrulanamadı.');
console.log(`\nYayın paketi hazır: ${target}\nYol: ${base}\nGizli bilgiler ve yerel veritabanı pakete eklenmedi.`);
