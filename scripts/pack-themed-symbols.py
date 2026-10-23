"""Pack source images without resampling their pixels.

Original supplied PNGs are copied whole. Freshly generated sprites are separated
at native resolution into padded cells; the reference photograph is never used
as production pixels. Only diagnostic thumbnails are resized.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, shutil

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / 'design/symbols-v2'
manifest = json.loads((DESIGN / 'manifest.json').read_text(encoding='utf-8'))
ASSETS = ROOT / 'public/assets/game-ui'
REVIEWS = ROOT / 'test-results/symbol-review'
REVIEWS.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
heading = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 28)

def generated_regions(image, spec):
    width,height=image.size
    pixels=bytearray(image.getchannel('A').point(lambda v:255 if v>=32 else 0).tobytes())
    components=[]
    for start in range(len(pixels)):
        if not pixels[start]: continue
        pixels[start]=0;stack=[start];count=0
        x0,y0,x1,y1=width,height,0,0
        while stack:
            index=stack.pop();x,y=index%width,index//width;count+=1
            x0,y0,x1,y1=min(x0,x),min(y0,y),max(x1,x),max(y1,y)
            for neighbor in (index-1 if x else -1,index+1 if x+1<width else -1,index-width if y else -1,index+width if y+1<height else -1):
                if neighbor>=0 and pixels[neighbor]:pixels[neighbor]=0;stack.append(neighbor)
        if count>1500:components.append((max(0,x0-8),max(0,y0-8),min(width,x1+9),min(height,y1+9)))
    assert len(components)==len(spec['names']), (len(components),spec['names'])
    return sorted(components,key=lambda box:(int((box[1]+box[3])/2/(height/spec['rows'])),box[0]))

def shape_bounds(image, region):
    # Region is metadata only: the complete source image is packed below.
    a = image.getchannel('A')
    region_alpha = a.crop(region)
    bounds = region_alpha.point(lambda v: 255 if v >= 24 else 0).getbbox()
    if not bounds:
        raise ValueError(f'Empty symbol region: {region}')
    x0, y0, x1, y1 = bounds
    x0, y0, x1, y1 = x0+region[0], y0+region[1], x1+region[0], y1+region[1]
    x0, y0 = max(region[0], x0-4), max(region[1], y0-4)
    x1, y1 = min(region[2], x1+4), min(region[3], y1+4)
    width, height = x1-x0, y1-y0
    pixels = a.load()
    points = [((x-x0)/width, (y-y0)/height) for y in range(y0,y1,3) for x in range(x0,x1,3) if pixels[x,y] >= 16]
    polygon = [[0.,0.],[1.,0.],[1.,1.],[0.,1.]]
    for angle in range(0,360,45):
        nx,ny = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        limit = max(nx*x+ny*y for x,y in points)+.008
        clipped=[]
        for a1,b in zip(polygon,polygon[1:]+polygon[:1]):
            da,db=nx*a1[0]+ny*a1[1]-limit,nx*b[0]+ny*b[1]-limit
            if da<=0: clipped.append(a1)
            if (da<=0)!=(db<=0):
                t=da/(da-db)
                clipped.append([a1[0]+(b[0]-a1[0])*t,a1[1]+(b[1]-a1[1])*t])
        polygon=clipped
    return [x0,y0,width,height], [[round(x,6),round(y,6)] for x,y in polygon]

sets={}
for theme,spec in manifest['themes'].items():
    sources=DESIGN/'sources'/theme
    sources.mkdir(parents=True,exist_ok=True)
    generated_path=sources/'generated-sheet.png'
    if not generated_path.exists(): shutil.copy2(Path(manifest['generatedFolder'])/spec['sheet'],generated_path)
    sheet=Image.open(generated_path).convert('RGBA')
    assert sheet.getchannel('A').getextrema()[0]==0, 'Generated background must be transparent'
    sw,sh=sheet.size
    atlas=Image.new('RGBA',(3680,2240))
    frames=[];outlines=[];names=list(spec['names']);provenance=[]
    for index,(name,region) in enumerate(zip(spec['names'],generated_regions(sheet,spec))):
        sprite=sheet.crop(region)
        ox,oy=24+(index%5)*736,24+(index//5)*736
        atlas.paste(sprite,(ox,oy))
        rect,outline=shape_bounds(sprite,(0,0,*sprite.size))
        rect[0]+=ox;rect[1]+=oy
        frames.append(rect);outlines.append(outline)
        provenance.append({'name':name,'source':'generated-sheet.png','generated':True})
    for index,(filename,name) in enumerate(spec['existing']):
        target=sources/f'{filename}.png'
        if not target.exists(): shutil.copy2(Path(manifest['sourceFolder'])/f'{filename}.png',target)
        original=Image.open(target).convert('RGBA')
        assert max(original.size)<=688, original.size
        position=len(spec['names'])+index
        ox,oy=24+(position%5)*736,24+(position//5)*736
        atlas.paste(original,(ox,oy))
        rect,outline=shape_bounds(original,(0,0,*original.size))
        rect[0]+=ox;rect[1]+=oy
        frames.append(rect);outlines.append(outline);names.append(name)
        provenance.append({'name':name,'source':target.name,'generated':False})
    assert len(names)==15 and len(set(names))==15
    png=DESIGN/f'{theme}-symbols-atlas-v2.png'
    webp=ASSETS/f'{theme}-symbols-atlas-v2.webp'
    atlas.save(png)
    atlas.save(webp,lossless=True,method=6,exact=True)
    sets[theme]={'file':webp.name,'width':atlas.width,'height':atlas.height,'rects':frames,'outlines':outlines,'names':names}
    spec['provenance']=provenance
    preview=Image.new('RGB',(1100,760),'#faf7ec');draw=ImageDraw.Draw(preview)
    draw.text((24,16),f'{theme.upper()} · 15 simge',font=heading,fill='#365b42')
    for index,(name,rect) in enumerate(zip(names,frames)):
        x,y,w,h=rect
        # Diagnostic preview only; production pixels above are never resampled.
        thumb=atlas.crop((x,y,x+w,y+h));thumb.thumbnail((170,166),Image.Resampling.LANCZOS)
        px,py=20+(index%5)*216,70+(index//5)*225
        preview.paste(thumb,(px+(190-thumb.width)//2,py+(175-thumb.height)//2),thumb)
        draw.text((px+95,py+180),name,font=font,anchor='mt',fill='#365b42')
    preview.save(REVIEWS/f'{theme}-set-v2.png')
    print(f'{theme}: {len(names)} icons, native sheet {sheet.size}, lossless atlas {atlas.size}, {webp.stat().st_size} bytes')
(ROOT/'src/themed-symbols.js').write_text('// Native-resolution themed sprite frames. Rebuild with scripts/pack-themed-symbols.py.\nexport const themedSymbols = '+json.dumps(sets,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(DESIGN/'provenance.json').write_text(json.dumps({key:spec['provenance'] for key,spec in manifest['themes'].items()},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
