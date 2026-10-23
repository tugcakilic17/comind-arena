import QRCode from 'qrcode';

let cachedUrl='',cachedSvg='';
export function inviteQr(url) {
  if (url===cachedUrl) return cachedSvg;
  const {modules}=QRCode.create(url,{errorCorrectionLevel:'M'});
  const size=modules.size+8;
  let path='';
  for(let y=0;y<modules.size;y++) for(let x=0;x<modules.size;x++) {
    if(modules.get(y,x)) path+=`M${x+4} ${y+4}h1v1h-1z`;
  }
  // Keep a four-module white quiet zone and crisp, high-contrast modules.
  cachedUrl=url;
  cachedSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Odanın davet QR kodu" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#254a3b"/></svg>`;
  return cachedSvg;
}
