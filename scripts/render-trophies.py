"""Author the original layered SVG prize collection. No external assets or runtime scripts.

Run from the project root: python3 scripts/render-trophies.py
Stable core/orbit/accents groups reserve independent motion layers for a later release.
"""
from math import sin, cos, pi
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'trophies'
OUT.mkdir(exist_ok=True)

def path(d, fill='gold', **attrs):
    fill = f'url(#{fill})' if fill in ['gold', 'silver', 'violet', 'ice', 'rose', 'ruby', 'onyx', 'teal'] else fill
    return f'<path d="{d}" fill="{fill}" '+ ' '.join(f'{k.replace("_", "-")}="{v}"' for k,v in attrs.items())+'/>'
def line(d, stroke='#FFE7AE', width=.9, **attrs):
    return path(d, 'none', stroke=stroke, stroke_width=width, stroke_linecap='round', stroke_linejoin='round', **attrs)
def ellipse(x,y,rx,ry,stroke='#DDB96C',width=.8,opacity=1,rotate=0):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="none" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}" transform="rotate({rotate} {x} {y})"/>'
def circle(x,y,r,fill,**attrs):
    fill=f'url(#{fill})' if fill in ['gold','silver','violet','ice','rose','ruby','onyx','teal'] else fill
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" '+ ' '.join(f'{k.replace("_", "-")}="{v}"' for k,v in attrs.items())+'/>'
def star(x,y,r=5,color='#F8E1B0'):
    return path(f'M{x} {y-r} Q{x+.8} {y-.8} {x+r} {y} Q{x+.8} {y+.8} {x} {y+r} Q{x-.8} {y+.8} {x-r} {y} Q{x-.8} {y-.8} {x} {y-r}Z',color)
def facet(points,fill): return path('M'+' '.join(f'{x},{y}' for x,y in points)+'Z',fill)
def laurel(x=160,y=145,scale=1,metal='gold'):
    leaves=''
    for sign in [-1,1]:
        leaves+=line(f'M{160+sign*9} 233 C{160+sign*94} 203 {160+sign*101} 111 {160+sign*44} 68','#D9BF82',1.3)
        for i in range(8):
            a=(23+i*14)*pi/180
            cx=160+sign*82*sin(a); cy=148+83*cos(a)
            ang=sign*(i*13-60)
            leaf=path('M0 0 C-11-9-9-23 0-31 C9-20 10-8 0 0Z',metal)
            leaves+=f'<g transform="translate({cx:.1f} {cy:.1f}) rotate({ang})">{leaf}{line("M0-2V-27", "#FFF1C8", .6, opacity=".6")}</g>'
    return f'<g transform="translate({x-160*scale} {y-145*scale}) scale({scale})">{leaves}</g>'
DEFS='''<defs>
<linearGradient id="gold" x1=".12" y1="0" x2=".83" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#FFF2CA"/><stop offset=".2" stop-color="#D6A84D"/><stop offset=".42" stop-color="#FFDD8B"/><stop offset=".61" stop-color="#B07929"/><stop offset=".8" stop-color="#E7BF6A"/><stop offset="1" stop-color="#795022"/></linearGradient>
<linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FAFFFF"/><stop offset=".25" stop-color="#A5CDDF"/><stop offset=".43" stop-color="#E8F9FF"/><stop offset=".6" stop-color="#527E9C"/><stop offset=".79" stop-color="#A8C5D8"/><stop offset="1" stop-color="#2E4D70"/></linearGradient>
<linearGradient id="ice" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#F6FDFF"/><stop offset=".32" stop-color="#A4EBFF"/><stop offset=".63" stop-color="#5E8ED7"/><stop offset="1" stop-color="#5953AC"/></linearGradient>
<linearGradient id="violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EBDFFF"/><stop offset=".27" stop-color="#BFA1F5"/><stop offset=".6" stop-color="#7254B6"/><stop offset="1" stop-color="#302957"/></linearGradient>
<linearGradient id="rose" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFE3CE"/><stop offset=".35" stop-color="#E4AF9C"/><stop offset=".56" stop-color="#A96465"/><stop offset=".8" stop-color="#F8C9AE"/><stop offset="1" stop-color="#6C404B"/></linearGradient>
<linearGradient id="ruby" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFC6CF"/><stop offset=".3" stop-color="#D66789"/><stop offset=".6" stop-color="#9A315D"/><stop offset="1" stop-color="#431C48"/></linearGradient>
<linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#BFFFF1"/><stop offset=".33" stop-color="#6FC9BA"/><stop offset=".67" stop-color="#2B827F"/><stop offset="1" stop-color="#244C69"/></linearGradient>
<linearGradient id="onyx" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#576580"/><stop offset=".25" stop-color="#293958"/><stop offset=".5" stop-color="#19283F"/><stop offset=".72" stop-color="#506079"/><stop offset="1" stop-color="#101C30"/></linearGradient>
<radialGradient id="aura"><stop stop-color="#8EBDEB" stop-opacity=".16"/><stop offset=".55" stop-color="#B5A1F2" stop-opacity=".06"/><stop offset="1" stop-color="#8EBDEB" stop-opacity="0"/></radialGradient>
<filter id="bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2"/></filter>
</defs>'''

def award(key, label, core, orbit='', accents='', color='#C5B3ED'):
    # No rectangle, disc backing, platform, lettering, stroke outline, or baked-in motion.
    aura='<g id="aura" aria-hidden="true"><ellipse cx="160" cy="151" rx="119" ry="125" fill="url(#aura)"/></g>'
    foot=ellipse(160,268,39,5,color,.6,.38)+ellipse(160,268,21,2,color,.7,.45)+path('M160 257 163 261 160 265 157 261Z',color)
    particles=''.join(circle(x,y,r,color,opacity=o) for x,y,r,o in [(54,117,1,.6),(251,148,1,.6),(226,63,1.3,.8),(74,211,.8,.4)])
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="none" role="img" aria-labelledby="title"><title id="title">{label}</title>{DEFS}{aura}<g id="orbit">{orbit}</g><g id="core">{core}</g><g id="accents">{accents}{particles}{foot}</g></svg>\n'
    (OUT/f'{key}-relic.svg').write_text(svg)

# FANTASY — impossible, suspended relics; asymmetric details and translucent facets.
award('crown','Aether laurel',
    laurel()+path('M148 64 160 36 172 64 160 88Z','violet')+facet([(160,36),(160,88),(148,64)],'ice')+line('M160 39V84','#F3EEFF',.7)+
    path('M160 107 174 139 160 172 146 139Z','ice')+facet([(160,107),(160,172),(146,139)],'violet')+line('M160 111V166','#EBF6FF',.7)+
    path('M146 232 160 219 174 232 160 244Z','gold')+circle(160,232,3,'violet'),
    ellipse(160,143,105,39,'#B7A1E8',.7,.6,-29)+ellipse(160,143,67,104,'#D7BB7C',.5,.35,18),
    star(99,58,6)+star(245,173,5,'#CAB7F5')+line('M122 225Q160 211 198 225','#E2C48B',.65)+circle(209,66,2,'#F2E1B0'))

dragon=path('M85 205C55 172 63 128 101 105L108 76 136 89 158 55 163 81 195 69 185 92 219 102 197 120 173 116 159 133C143 148 159 169 183 166L211 153 201 183 183 196C139 221 121 173 133 145 112 160 101 186 120 205 140 224 176 216 196 203 172 237 110 237 85 205Z','silver')
dragon+=path('M110 115 78 73 85 142 103 129 100 161 130 132 152 107Z','violet')+path('M78 73 109 122 100 161 93 121Z','ice')+line('M80 77 102 125 101 155M103 126 127 133','#D9CBFC',.7)
dragon+=path('M157 55 163 81 176 88 154 98 137 91Z','gold')+path('M197 120 170 112 149 133 159 107 185 92 219 102Z','ice')+line('M171 104 196 107','#EEFCFF',1.1)+circle(180,101,1.8,'#DDFBFF')
dragon+=path('M85 205Q127 242 196 203 171 222 135 217 102 213 85 205Z','gold')+line('M142 154Q132 190 160 196','#CAE8F4',.7)
award('dragon','Wyrmheart relic',dragon,ellipse(156,148,105,105,'#BAC4E8',.6,.3)+ellipse(158,149,115,34,'#A595CE',.7,.5,-38),star(215,76,5)+path('M231 163 235 170 232 178 227 171Z','violet')+star(80,206,4,'#AFE8FF'))

crystal=path('M161 51 197 108 180 196 157 229 125 184 115 103Z','violet')+facet([(161,51),(151,114),(115,103)],'ice')+facet([(161,51),(197,108),(151,114)],'#D6C6FF')+facet([(151,114),(197,108),(180,196),(157,229)],'violet')+facet([(151,114),(157,229),(125,184),(115,103)],'ice')+facet([(151,114),(180,196),(157,229)],'#7B65BE')+line('M161 54 151 114 158 224M117 104 151 114 194 108M151 114 179 195','#F1EAFF',.7,opacity='.8')
for x,y,scale,rot in [(92,151,.42,-24),(222,136,.39,21),(129,55,.18,-18),(205,215,.23,30)]:
    crystal+=f'<g transform="translate({x} {y}) rotate({rot}) scale({scale})">'+path('M0-48 19-16 9 30 0 48-15 18-20-18Z','ice')+path('M0-48V48L19-16Z','violet')+line('M0-46V44','#F5EAFF',1.3)+'</g>'
award('crystal','Prismatic heart',crystal,ellipse(161,151,104,27,'#C4AAF4',1,.7,-17)+ellipse(161,151,67,102,'#B0D9F9',.6,.3,31),star(208,63,6,'#D3BEFF')+star(84,185,4)+line('M149 242 160 248 172 241','#B3DAF3',.7))

book=path('M77 101 144 80 167 92 239 83 230 194 166 218 145 205 82 220Z','gold')+path('M80 91 144 74 166 89 240 74 232 184 166 206 143 192 84 207Z','onyx')+path('M87 92 143 80 160 93 158 195 140 185 91 195Z','silver')+path('M166 94 234 80 225 178 166 198Z','violet')+path('M143 80 160 93 158 195 140 185Z','ice')+line('M168 99 227 86 219 172 170 188Z','#DCC38E',.9)+line('M94 102 135 92M95 110 132 101M96 120 133 110M97 135 130 128M97 145 132 138M97 157 131 150M99 170 129 162','#677D93',.9)
book+=ellipse(196,136,15,23,'#F7E6B3',.9,1,-12)+path('M194 109 205 134 194 161 185 137Z','gold')+circle(194,136,4,'ice')+path('M171 207 182 203 180 234 174 228 168 235Z','gold')+line('M78 91 84 207M240 74 232 184','#F5DEAC',.8)
award('spellbook','Celestial codex',book,ellipse(157,149,113,45,'#B2A4E2',.6,.55,-27),star(112,56,6,'#C6DFFF')+star(219,216,5)+path('M157 39 165 54 157 69 149 54Z','violet')+line('M137 62Q155 52 177 58','#AE97DD',.7))

blade=path('M161 29 177 68 165 187 155 187 145 68Z','silver')+path('M161 29 161 184 145 68Z','ice')+path('M161 29 177 68 165 187 161 184Z','#667AB1')+line('M161 39V176','#FCFAFF',1)+path('M108 178 152 188 160 180 169 188 212 177 198 195 169 198 167 228 173 236 161 249 149 236 154 227 151 199 121 195Z','gold')+path('M156 202H165L163 229 158 231Z','onyx')+path('M161 183 170 194 161 206 152 194Z','violet')+line('M122 186 149 193M175 193 198 185','#FFEDC7',.8)
award('sword','Blade of the eclipse',blade,ellipse(160,139,78,78,'#C2A5F1',1,.8)+ellipse(160,139,86,86,'#B3DDF1',.5,.25)+path('M88 111A78 78 0 0 1 214 83','none',stroke='#D7B66C',stroke_width='3'),star(83,161,5)+star(222,112,5,'#D4BDFF')+path('M84 69 91 80 87 92 79 82Z','violet')+path('M229 203 234 210 229 219 225 211Z','ice'))

# CINEMA — sculptural silver, black glass, film ribbons and restrained gilding.
film=''
for i in range(8):
    a=i*pi/4
    x=155+39*cos(a); y=133+39*sin(a)
    film+=circle(round(x,2),round(y,2),12,'onyx')+circle(round(x-2,2),round(y-2,2),9,'#17263B')
reel=circle(155,133,66,'silver')+circle(155,133,61,'onyx')+circle(155,133,57,'silver')+film+circle(155,133,12,'gold')+circle(155,133,5,'onyx')
reel+=path('M202 177C211 208 255 197 250 222 247 246 164 230 127 239L129 218C174 205 226 228 227 218 227 210 198 210 190 188Z','gold')+line('M202 181C214 212 241 202 240 220 235 231 176 218 135 229','#F8EBD1',.9)
for i in range(6): reel+=path(f'M{142+i*14} {219+i%2*2}h5v4h-5Z','#17263B')
award('reel','Orbit of cinema',reel,ellipse(156,148,112,30,'#C2DCE8',.7,.65,-26),star(99,71,5)+star(233,151,4,'#C1EAFF'), '#B4CCD9')

clapper=path('M89 112 217 91 211 205 86 225Z','onyx')+path('M93 118 211 99 207 198 92 216Z','silver')+path('M100 124 202 108 199 190 99 206Z','onyx')
clapper+=path('M76 80 205 52 216 88 87 117Z','silver')+path('M80 80 96 76 122 109 104 113ZM119 72 137 68 164 100 145 105ZM161 63 180 59 206 91 187 95Z','onyx')+line('M80 81 205 55M89 114 213 86','#F1F4EC',.8)+line('M113 148 188 134M113 159 173 148M113 183 148 176','#A8C5DB',.8)+path('M153 137 167 144 153 157Z','gold')+path('M91 220 213 201 211 207 88 227Z','gold')
award('clapper','The final cut',clapper,ellipse(157,153,107,37,'#DABF83',.55,.45,-35),star(231,111,5)+line('M69 161 78 158M224 194 235 191','#D4BD89',1),'#C5D5E6')

popcorn=path('M103 129 215 111 198 224 127 236Z','gold')+path('M113 134 159 142 161 230 128 225Z','onyx')+path('M159 142 205 123 191 217 161 230Z','gold')+line('M131 147 143 222M177 139 170 220M194 133 183 215','#F5DFAC',1)+path('M101 128 159 138 217 110 215 123 159 151 106 139Z','silver')
for x,y,s in [(115,113,15),(134,98,20),(161,88,20),(190,95,19),(202,113,15),(160,114,21)]:
    popcorn+=path(f'M{x-s} {y+6}Q{x-s-3} {y-7} {x-5} {y-8}Q{x-2} {y-s-8} {x+8} {y-s+1}Q{x+s+8} {y-s+2} {x+s} {y+5}L{x+3} {y+12}Z','gold')+line(f'M{x-7} {y-4}Q{x} {y-12} {x+5} {y-4}','#FFF3D6',.7)
award('popcorn','Golden premiere',popcorn,ellipse(157,147,99,36,'#D3B47D',.7,.5,-21),star(99,74,4)+star(227,170,5),'#D6BE88')

lens=circle(160,142,79,'onyx')+circle(160,142,74,'silver')+circle(160,142,67,'onyx')+circle(160,142,57,'gold')+circle(160,142,53,'onyx')
for i in range(7):
    a=360/7*i
    lens+=f'<g transform="rotate({a:.2f} 160 142)">'+path('M160 89 191 104 177 139 150 156 145 115Z','silver')+line('M161 91 150 155 177 139','#DBEDF3',.6)+'</g>'
lens+=path('M160 126 175 134 175 151 160 160 145 151 145 134Z','ice')+circle(158,139,4,'#D9FAFF',opacity='.6')
for i in range(36):
    a=i*pi/18; x=160+70*cos(a);y=142+70*sin(a);xx=160+73*cos(a);yy=142+73*sin(a)
    lens+=line(f'M{x:.2f} {y:.2f} {xx:.2f} {yy:.2f}','#D5B975',.7)
award('director','Director’s iris',lens,ellipse(160,145,110,36,'#ACCFE4',.7,.5,-37),star(214,66,5)+path('M104 230 160 242 215 230','none',stroke='#DEC58D',stroke_width='.7'),'#B5C9DD')

starcore=path('M160 47 185 108 251 114 200 158 215 222 160 188 105 222 120 158 69 114 135 108Z','gold')+facet([(160,47),(160,139),(135,108)],'#FFF1CA')+facet([(160,139),(185,108),(251,114)],'#EDCC88')+facet([(160,139),(200,158),(215,222)],'#9F712F')+facet([(160,139),(160,188),(105,222)],'#C39A4C')+facet([(160,139),(120,158),(69,114)],'#B6873D')+path('M160 97 173 127 206 131 180 152 187 185 160 168 133 185 140 152 114 131 147 127Z','onyx')+line('M160 50V96M248 115 207 131M214 219 186 184M107 219 133 183M73 115 114 130','#FFF3D4',.7)
award('star','Starlight laureate',starcore,ellipse(160,149,111,36,'#CEDDEA',.7,.65,-27)+ellipse(160,149,87,101,'#D6B36D',.45,.3,27),star(76,194,6,'#CDEAFF')+star(221,77,4)+path('M234 202 240 210 234 222 228 212Z','silver'),'#D0B780')

# FOOD — levitating, jewel-like still lifes rather than mascot stickers.
# The donut is a true open torus, with a transparent center and pearlescent glaze.
donut=path('M225 142A66 66 0 1 1 93 142 66 66 0 0 1 225 142ZM185 142A26 26 0 1 0 133 142 26 26 0 0 0 185 142Z','gold',fill_rule='evenodd')
donut+=path('M222 132C221 108 203 83 176 79 144 70 116 89 104 111 92 132 96 164 109 165 118 166 118 151 129 156 139 162 130 183 144 187 158 192 163 172 174 178 186 185 193 171 193 159 195 146 216 155 221 143ZM185 142A26 26 0 1 0 133 142 26 26 0 0 0 185 142Z','rose',fill_rule='evenodd')
donut+=path('M95 140C91 178 119 208 156 210 196 211 224 180 225 145 229 193 192 224 155 222 116 220 88 185 95 140Z','onyx')+line('M100 119C117 80 162 70 195 94M103 173Q126 210 167 207','#FFEDCE',1)+ellipse(159,142,27,27,'#B17455',1.1)
for x,y,rot in [(122,111,-35),(151,93,20),(191,109,40),(207,136,-20),(116,145,10),(145,179,-22),(183,181,34)]:
    donut+=f'<g transform="translate({x} {y}) rotate({rot})">'+path('M-1-4 2-4 2 4-1 4Z','gold')+line('M0-3V2','#FFF7DE',.7)+'</g>'
award('donut','Sugar eclipse',donut,ellipse(160,146,109,33,'#DAC38B',.9,.75,-34)+ellipse(160,146,86,93,'#DCAABC',.5,.3,17),star(85,174,4)+star(219,83,6,'#FBE9D1')+path('M217 207 221 214 217 222 213 214Z','rose'),'#D8B998')

pizza=path('M103 92 241 143 118 233Z','gold')+path('M105 100 226 146 122 221Z','silver')+path('M122 221 226 146 233 151 122 235 118 231Z','onyx')+path('M99 86Q173 92 245 138L239 153Q169 108 101 104Z','gold')+line('M108 90Q174 98 238 140','#FFF1D0',1.3)+line('M109 107 222 148 123 221','#F5D896',.8)
for x,y,r in [(136,132,13),(185,144,12),(143,178,10)]:
    pizza+=circle(x,y,r,'ruby')+path(f'M{x-r} {y} {x} {y-r} {x+r} {y} {x} {y+r}Z','ruby')+line(f'M{x-r+3} {y-2} {x-1} {y-r+3} {x+r-4} {y-1}','#F1BAA2',.7)
pizza+=path('M159 157Q162 133 177 129 178 151 159 157ZM119 158Q109 143 113 134 131 143 119 158Z','teal')+line('M162 152 174 133M120 152 115 139','#C7E4BD',.7)+path('M115 213 123 221 121 235 114 229Z','gold')
award('pizza','Slice of legend',pizza,ellipse(159,153,107,34,'#E0BB7A',.7,.6,-24),star(83,123,5)+star(218,199,4,'#CDE5EF')+path('M175 54 180 62 175 72 170 63Z','gold'),'#DCC087')

burger=path('M94 123Q101 75 160 71 215 74 229 120L216 131 106 136Z','gold')+path('M94 123Q154 105 229 120L217 135Q157 121 106 138Z','rose')+line('M107 110Q149 79 202 101','#FFF0C9',1.2)
for x,y in [(124,102),(149,89),(178,92),(200,110),(152,112)]: burger+=path(f'M{x} {y}q4-5 8-1l-5 4Z','#F3D897')
burger+=path('M101 150 125 143 143 150 161 143 182 149 205 142 220 149 210 160 187 157 169 166 146 159 127 165 107 160Z','teal')
burger+=path('M106 178 215 167 217 179 108 192Z','onyx')+path('M106 178 159 183 215 167 211 174 161 193 108 187Z','gold')+path('M114 196 164 204 212 190 203 215 165 230 126 222Z','gold')+path('M126 222 165 230 203 215 203 224 165 240 129 231Z','rose')+line('M120 204 165 213 203 200','#F9DFAC',.9)+path('M141 173 164 180 181 174 165 199Z','gold')
award('burger','The gilded stack',burger,ellipse(161,160,113,31,'#BDB08B',.7,.5,-18),star(236,96,4)+star(83,195,5,'#BADDD8')+line('M88 169Q78 150 91 132','#B2CFC7',.7),'#D8B881')

cupcake=path('M105 163 217 149 195 225 139 235Z','rose')+path('M112 164 161 174 211 155 195 225 161 239 137 229Z','gold')+path('M115 173 161 182 205 166 191 221 161 232 140 224Z','rose')
for i in range(7):
    x=123+i*12
    cupcake+=line(f'M{x} {175+(i%3)*2} {143+i*7} {224-abs(3-i)}','#FFE5C6',.8)
cupcake+=path('M102 156Q91 136 120 123 111 110 142 96 134 80 162 68 174 57 166 48 205 62 187 87 218 92 207 112 239 124 219 147L161 174Z','silver')+path('M107 151Q148 158 210 134L218 145 161 167Z','rose')+line('M122 125Q165 127 207 111M144 98Q171 104 192 89M161 74Q176 79 183 72','#FFE1C6',1.2)+path('M161 47 170 37 180 48 174 61 163 60Z','ruby')+line('M174 39Q174 27 186 29','#E4C182',1)
award('cupcake','Velvet summit',cupcake,ellipse(162,143,109,34,'#D1B5C9',.7,.6,-28),star(99,99,5)+star(237,180,4,'#B9E4F1'),'#DAB7B5')

taco=path('M88 143Q135 83 207 106L239 153Q171 230 98 205Z','gold')+path('M94 147Q143 103 205 113L225 151 206 177 152 187 111 178Z','onyx')
for x,y,rot in [(108,145,-21),(127,128,-11),(151,124,17),(175,119,25),(201,133,43)]:
    taco+=f'<g transform="translate({x} {y}) rotate({rot})">'+path('M-10 13-13-2-5-7-7-18 4-14 12-19 13-4 20 2 10 17Z','teal')+line('M0 9 3-12','#C2E8C8',.7)+'</g>'
for x,y in [(118,154),(152,139),(185,145),(205,151)]:
    taco+=path(f'M{x-7} {y-6} {x+4} {y-9} {x+10} {y+2} {x+1} {y+10} {x-9} {y+4}Z','ruby')
taco+=path('M91 151Q158 151 232 142 222 208 167 231 113 235 91 151Z','gold')+path('M91 151Q111 201 165 218 204 201 232 142 222 208 167 231 113 235 91 151Z','rose')+line('M98 159Q156 170 222 151M103 177Q118 205 145 214','#FFF0C5',1)
for x,y in [(125,183),(155,191),(182,173),(173,209),(111,166),(204,164)]: taco+=path(f'M{x} {y}l4-2 2 3-4 2Z','#A87A37',opacity='.7')
award('taco','Golden crescent',taco,ellipse(160,150,111,34,'#DBBC85',.8,.6,-31),star(211,73,6)+star(78,191,4,'#B1DED0'),'#D6BA89')

# ANIMALS — heraldic, faceted spirit sculptures with distinct silhouettes.
lion=path('M160 54 185 69 213 66 217 94 239 114 225 139 235 168 209 182 201 212 173 215 160 239 141 217 112 216 104 187 81 170 92 142 81 117 104 99 108 73 137 74Z','gold')
lion+=facet([(160,54),(160,151),(108,73),(137,74)],'#F2D18C')+facet([(213,66),(160,151),(239,114),(217,94)],'#9B6F2C')+facet([(239,114),(160,151),(235,168),(225,139)],'#D4A855')+facet([(209,182),(160,151),(160,239),(173,215),(201,212)],'#A7772F')+facet([(81,117),(160,151),(104,187),(81,170),(92,142)],'#F1CE83')
lion+=path('M120 106 141 95 160 105 178 95 201 106 194 151 181 183 160 199 139 183 124 150Z','gold')+facet([(120,106),(141,95),(160,105),(146,139),(124,150)],'#FFF0BE')+facet([(160,105),(178,95),(201,106),(176,140)],'#D5B169')+facet([(146,139),(160,150),(176,140),(181,183),(160,199),(139,183)],'silver')+path('M135 128 149 132 143 136 134 133ZM172 132 187 126 187 132 176 136Z','onyx')+path('M149 148 160 145 172 148 160 161Z','onyx')+line('M160 161V178L147 174M160 178 173 174','#5A4943',1)+line('M139 183 160 192 181 183','#F2DCAB',.8)
award('lion','Solar sovereign',lion,ellipse(160,140,107,107,'#D6B373',.7,.4)+ellipse(160,140,114,114,'#BEB78B',.4,.2),star(83,79,5)+star(235,202,4,'#F5E3B8'),'#D9BC83')

fox=path('M177 213C127 246 74 216 86 171 94 145 114 124 128 104L130 64 156 82 178 66 186 108 212 129 195 142 175 139 169 173C167 192 186 195 199 180 222 155 213 118 238 105 230 131 255 164 237 194 225 218 205 237 168 238Z','rose')
fox+=path('M130 64 156 82 178 66 186 108 161 121 128 104Z','gold')+path('M136 76 153 90 137 98ZM173 80 179 103 164 96Z','onyx')+path('M129 105 154 123 161 143 176 140 164 157 143 146Z','silver')+path('M155 108 167 115 183 108 193 121 173 131 161 121Z','rose')+path('M195 123 212 129 195 137 187 132Z','onyx')+line('M174 113 182 115','#E6FAF8',1.6)
fox+=path('M176 214C214 220 240 182 231 151 251 179 234 220 211 231L168 238 137 231 150 210Z','gold')+path('M231 151Q250 178 229 207 230 177 210 179 225 164 231 151Z','silver')+path('M127 139Q107 180 126 203L160 215 141 224 106 211 96 188Z','gold')+line('M136 155Q126 189 153 203M180 225Q214 220 228 199','#FFE4BE',.8)
award('fox','Ember spirit',fox,ellipse(160,148,105,36,'#E7BE9F',.7,.6,-28),star(97,93,5)+star(232,85,4,'#DAEFFF'),'#E5C2A1')

owl=path('M146 99 120 93 91 73 54 62 65 98 89 129 114 145 135 175 160 218 186 177 205 147 231 130 255 101 269 65 226 76 199 94 175 100Z','silver')
for sign in [-1,1]:
    def p(x,y): return (160+sign*x,y)
    for i in range(5):
        coords=[p(20+i*14,109-i*5),p(55+i*15,77-i*3),p(45+i*12,124-i*2),p(14+i*14,151-i*3)]
        owl+=facet(coords,'gold' if i%2 else 'silver')+line('M'+' '.join(f'{x},{y}' for x,y in [coords[1],coords[2],coords[3]]),'#E8EAF2',.65)
owl+=path('M126 76 146 88 160 84 175 88 195 75 188 129 179 162 160 194 139 162 131 130Z','onyx')+path('M130 92Q150 82 160 101 174 82 191 92L180 128 160 137 139 127Z','silver')+path('M136 101 155 103 151 119 140 115ZM166 103 185 101 181 115 170 119Z','gold')+path('M145 103 150 104 147 115 143 112ZM175 104 180 103 177 112 173 115Z','onyx')+path('M153 125 160 119 167 125 160 141Z','gold')+facet([(139,139),(160,153),(179,139),(160,194)],'silver')+line('M143 154 160 166 176 154M151 171 160 179 169 171','#7A94AC',.8)
award('owl','Oracle of dusk',owl,ellipse(160,140,99,99,'#CEC1DF',.6,.45)+ellipse(160,140,108,108,'#CDBE89',.5,.2),star(160,43,7,'#D9C4F6')+star(83,189,4)+star(235,197,4),'#B9CEE7')

wolf=path('M102 225 111 186 125 158 122 132 147 106 154 81 176 53 183 87 205 102 211 124 235 145 214 153 197 143 184 151 184 170 200 184 210 221 181 238 140 239Z','silver')
wolf+=facet([(176,53),(183,87),(171,102),(154,81)],'onyx')+facet([(154,81),(171,102),(147,106)],'ice')+facet([(147,106),(171,102),(184,123),(160,145),(125,158),(122,132)],'#ACCAE2')+facet([(171,102),(205,102),(211,124),(184,123)],'silver')+facet([(184,123),(211,124),(235,145),(214,153),(197,143)],'onyx')+path('M200 124 211 128 207 132 199 130Z','#C0F0FF')+path('M229 140 235 145 229 148 223 143Z','onyx')
wolf+=path('M160 145 184 151 184 170 200 184 210 221 181 238 163 210 140 195 146 170Z','ice')+facet([(125,158),(160,145),(146,170),(140,195),(163,210),(140,239),(102,225),(111,186)],'onyx')+facet([(140,195),(163,210),(181,238),(140,239)],'silver')+line('M133 163 123 187 142 182M153 192 164 202 185 202M169 170 176 188','#D6F0FB',.8)
moon=path('M173 47C118 40 77 84 78 136C79 187 121 225 170 221C131 207 107 175 111 134C114 93 137 63 173 47Z','gold')+ellipse(159,134,97,97,'#B5C6E2',.5,.3)
award('wolf','Lunar sentinel',wolf,moon,star(111,67,5,'#CEEEFF')+star(232,96,5)+line('M95 219 86 224 82 214','#B1CDE1',.7),'#BACFE9')

shark=path('M63 170C87 140 123 119 167 117L194 73 201 118C225 125 245 142 262 163L229 175 211 174 190 200 172 186 141 193 109 185 84 209 86 179 62 189 70 173Z','silver')
shark+=facet([(63,170),(119,152),(167,117),(194,73),(185,136),(218,151),(262,163),(211,174),(172,161),(141,173),(109,185),(86,179)],'ice')+facet([(194,73),(201,118),(185,136)],'onyx')+path('M85 173Q171 137 246 161L230 172 211 174 178 182 141 193 109 185Z','onyx')+path('M106 171Q171 150 218 156L231 163 208 172 177 176 139 187Z','silver')+path('M211 174 190 200 172 186 181 171Z','gold')+path('M63 170 86 179 84 209 101 183Z','onyx')+line('M206 151 215 152','#F5FEFF',1.6)
shark+=line('M150 139 142 155M158 136 151 153M165 135 160 151','#3E617E',1.4)+line('M218 161 241 164 227 171M225 163 226 167M232 164 232 168','#182C46',.8)+line('M81 167Q114 139 157 128','#F7FCFF',.9)
award('shark','Abyssal sovereign',shark,ellipse(159,157,118,33,'#A5DEDF',.7,.65,-26)+ellipse(159,157,89,77,'#D1C184',.55,.3,21),star(91,107,5,'#C7EDF9')+star(222,214,4)+path('M139 220 145 231 139 241 132 231Z','teal'),'#A9D4E4')

print(f'Rendered 20 original layered SVG awards in {OUT.relative_to(ROOT)}')
