import re
with open("src/app/admin/page.tsx", "r") as f:
    text = f.read()

def replacer(match):
    head = match.group(1)
    incoming = match.group(2)
    return head + "\n" + incoming

new_text = re.sub(r"<<<<<<< HEAD\n(.*?)=======\n(.*?)(?:>>>>>>> [^\n]*\n)", replacer, text, flags=re.DOTALL)

with open("src/app/admin/page.tsx", "w") as f:
    f.write(new_text)

