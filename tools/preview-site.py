from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse
parser=argparse.ArgumentParser(description='Preview the root site and delegated Canary Pages, with video seeking.')
parser.add_argument('canary',type=Path,help='Path to the Canary Pages export')
args=parser.parse_args()
site=Path(__file__).resolve().parent.parent/'output/site'
canary=args.canary.resolve()
if not (site/'index.html').is_file() or not (canary/'index.html').is_file():
 parser.error('Build both site exports before starting the preview')
class Preview(SimpleHTTPRequestHandler):
 def send_head(self):
  target=Path(self.translate_path(self.path))
  if target.suffix=='.mp4' and target.is_file():
   size=target.stat().st_size
   start,end=0,size-1
   range_header=self.headers.get('Range')
   if range_header:
    import re
    match=re.fullmatch(r'bytes=(\d*)-(\d*)',range_header)
    if not match or not any(match.groups()):
     self.send_error(416);return None
    if match[1]:
     start=int(match[1]);end=min(int(match[2]) if match[2] else end,end)
    else:start=max(0,size-int(match[2]))
    if start>end or start>=size:
     self.send_error(416);return None
   self.send_response(206 if range_header else 200)
   self.send_header('Content-Type','video/mp4')
   self.send_header('Accept-Ranges','bytes')
   self.send_header('Content-Length',str(end-start+1))
   if range_header:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
   self.end_headers()
   stream=target.open('rb');stream.seek(start);self.remaining=end-start+1
   return stream
  self.remaining=None
  return super().send_head()
 def copyfile(self,source,outputfile):
  if self.remaining is None:return super().copyfile(source,outputfile)
  while self.remaining:
   data=source.read(min(65536,self.remaining))
   if not data:break
   outputfile.write(data);self.remaining-=len(data)
 def translate_path(self, path):
  route=unquote(urlsplit(path).path)
  root=canary if route=='/canary' or route.startswith('/canary/') else site
  if root==canary: route=route[len('/canary'):]
  target=(root/route.lstrip('/')).resolve()
  return str(target if target.is_relative_to(root) else root/'404.html')
class PreviewServer(ThreadingHTTPServer):
 # A page opens parallel connections for fonts, scripts and pictures.
 request_queue_size=128
print('Site preview: http://127.0.0.1:8914',flush=True)
PreviewServer(('127.0.0.1',8914),Preview).serve_forever()
