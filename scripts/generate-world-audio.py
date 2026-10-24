"""Original deterministic ambience. No external recordings or samples."""
from pathlib import Path
import math, random, wave, struct
rate=16000
out=Path('apps/client/public/assets/audio')
for name,frequency,noise in [('observatory',110,.01),('sanctuary',82,.08),('forge',55,.04),('manor',73.416,.015),('garden',146.832,.10)]:
 random.seed(7); low=0.; data=[]
 for i in range(rate*8):
  t=i/rate
  low=.98*low+.02*random.uniform(-1,1)
  envelope=math.sin(math.pi*t/8)**2
  tone=math.sin(2*math.pi*frequency*t)*.035+math.sin(2*math.pi*frequency*1.5*t)*.014
  value=(tone+low*noise)*envelope
  data.append(struct.pack('<h',int(max(-1,min(1,value))*32767)))
 with wave.open(str(out/(name+'.wav')),'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(b''.join(data))
