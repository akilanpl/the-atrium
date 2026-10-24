"""Original deterministic sound design for THE ATRIUM; output dedicated to CC0."""
import math,random,wave,struct,pathlib
random.seed(73)
folder=pathlib.Path('apps/client/public/assets/audio');folder.mkdir(exist_ok=True)
sr=22050
for name,duration in [('stone',.22),('wood',.22),('key',1.1),('mechanism',1.5),('portal',2.5),('tick',.12),('victory',3),('hall',8),('library',8),('door',.9)]:
 values=[];noise=0
 for i in range(int(sr*duration)):
  t=i/sr;noise=.8*noise+.2*random.uniform(-1,1)
  if name in ['stone','wood']:v=(noise*.8+math.sin(t*(210 if name=='wood' else 100)*math.pi)*.15)*math.exp(-t*23)
  elif name in ['hall','library']:v=.08*math.sin(t*2*math.pi*(55 if name=='hall' else 82.5))+.025*math.sin(t*2*math.pi*110)+noise*.025
  elif name in ['mechanism','door']:v=(noise*.25+math.sin(t*(100+20*math.sin(t*3))*math.pi)*.08)*math.sin(math.pi*t/duration)
  elif name=='tick':v=noise*.5*math.exp(-t*65)
  else:
   frequencies=[440,554.365,659.255] if name!='portal' else [110,164.814,220]
   v=sum(math.sin(t*f*2*math.pi)*.1 for f in frequencies)*math.exp(-t*(3 if name=='key' else 1.1))*min(1,t*30)
  values.append(struct.pack('<h',int(max(-1,min(1,v)) * 20000)))
 with wave.open(str(folder/(name+'.wav')),'wb') as f:f.setparams((1,2,sr,0,'NONE','not compressed'));f.writeframes(b''.join(values))
print('Authored 10 local WAV cues')
