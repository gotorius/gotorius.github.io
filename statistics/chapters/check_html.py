from html.parser import HTMLParser

class TC(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
    def handle_starttag(self, tag, attrs):
        voids = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
        if tag not in voids:
            self.stack.append((tag, self.getpos()))
    def handle_endtag(self, tag):
        voids = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
        if tag in voids:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            self.errors.append(f'Bad </{tag}> at line {self.getpos()[0]}, expected </{self.stack[-1][0] if self.stack else "?"}>')

for f in ['chapter25.html', 'chapter26.html', 'chapter27.html', 'chapter28.html']:
    p = TC()
    p.feed(open(f).read())
    status = 'OK' if not p.errors and not p.stack else 'FAIL'
    print(f, status, p.errors[:3], p.stack[-5:])
