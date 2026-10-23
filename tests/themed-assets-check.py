"""Check that all themed source pixels survive packing and lossless delivery."""
from pathlib import Path
from PIL import Image, ImageChops
import json, hashlib

ROOT=Path(__file__).resolve().parents[1]
design=ROOT/'design/symbols-v2'
manifest=json.loads((design/'manifest.json').read_text(encoding='utf-8'))
for theme,spec in manifest['themes'].items():
    png=Image.open(design/f'{theme}-symbols-atlas-v2.png').convert('RGBA')
    webp=Image.open(ROOT/f'public/assets/game-ui/{theme}-symbols-atlas-v2.webp').convert('RGBA')
    assert png.size==webp.size==(3680,2240)
    # RGB bytes under fully transparent pixels are irrelevant; visible pixels
    # and every alpha byte must be preserved exactly.
    assert ImageChops.difference(png.getchannel('A'),webp.getchannel('A')).getbbox() is None
    for background in ('white','#543e32'):
        a=Image.new('RGBA',png.size,background);a.alpha_composite(png)
        b=Image.new('RGBA',webp.size,background);b.alpha_composite(webp)
        assert all(high==0 for low,high in ImageChops.difference(a.convert('RGB'),b.convert('RGB')).getextrema())
    for index,(filename,name) in enumerate(spec['existing']):
        original=Path(manifest['sourceFolder'])/f'{filename}.png'
        copied=design/'sources'/theme/f'{filename}.png'
        assert hashlib.sha256(original.read_bytes()).digest()==hashlib.sha256(copied.read_bytes()).digest()
        image=Image.open(copied).convert('RGBA')
        position=len(spec['names'])+index
        x,y=24+(position%5)*736,24+(position//5)*736
        region=png.crop((x,y,x+image.width,y+image.height))
        assert all(high==0 for low,high in ImageChops.difference(image,region).getextrema()), name
    print(f'PASS {theme}: 15 symbols, exact alpha, lossless color, original source resolution preserved')
