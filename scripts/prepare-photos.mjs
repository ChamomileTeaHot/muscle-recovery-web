import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const sharpDir=(await fs.readdir('node_modules/.pnpm')).find(n=>n.startsWith('sharp@'));
if(!sharpDir) throw new Error('The starter sharp dependency is missing.');
const sharp=require(path.resolve('node_modules/.pnpm',sharpDir,'node_modules/sharp'));
const exercises=JSON.parse(await fs.readFile('public/data/exercises.json','utf8'));
const images=[...new Set(exercises.flatMap(e=>e.images))];
let index=0,totalBytes=0;
await Promise.all(Array.from({length:4},async()=>{
  while(index<images.length){
    const relative=images[index++];
    const source=path.resolve('../exercise-ko-patch/images',relative);
    const target=path.resolve('public/images',relative.replace(/\.jpg$/,'.webp'));
    await fs.mkdir(path.dirname(target),{recursive:true});
    const info=await sharp(source).resize({width:640,withoutEnlargement:true}).webp({quality:78}).toFile(target);
    totalBytes+=info.size;
  }
}));
console.log(JSON.stringify({images:images.length,totalBytes}));
