"""Local, transactional storage for Bou. Does not store credentials."""
import os, json, re, sqlite3, time, uuid
from pathlib import Path

DEFAULT_WORKERS = [
    {"id":"analyst","name":"বিশ্লেষক","instructions":"Analyze the request independently. Identify the key facts, assumptions, and possible risks. Do not claim to browse or use tools.","enabled":True},
    {"id":"planner","name":"পরিকল্পনাকারী","instructions":"Turn the request into a practical sequence of steps. Focus on priorities, dependencies, and a usable result. Do not claim to browse or use tools.","enabled":True},
    {"id":"reviewer","name":"পর্যালোচক","instructions":"Solve or review the request independently. Check for missing details, contradictions, and likely errors. Do not claim to browse or use tools.","enabled":True},
]
DEFAULT_MANAGER = {"name":"Manager","instructions":"Understand the user's goal, split it into distinct non-overlapping subtasks, and assign each enabled worker the task that best fits its role. Make assignments specific and useful. Do not invent tools, browsing, or computer access."}
DEFAULTS = {"mode":"chat","model":"google/gemini-2.5-flash","language":"bn-BD","speech_out":True,"voice_auto_start":True,"voice_provider":"wispr","use_memory":False,"use_history":True,"worker_mode":"auto","manager":DEFAULT_MANAGER,"workers":DEFAULT_WORKERS,"backend_mode":"local","service_url":"","service_token":""}
TOKEN_RE = re.compile(r"[^\W_]{2,}", re.UNICODE)
STOPWORDS = set("a an and are as at be but by can do for from how i in is it me my of on or our so that the their them then there this to was we what when where who why with you your আমি আমার আমরা আর এটা এই ওই সে তিনি কিন্তু যেন তুমি তোমার তোমাকে আপনি আপনার কি কী কিভাবে কেন কোথায় কোথায় থেকে জন্য হলে হবে হয় হয় আছে ছিল ছিলাম বলো বলেছি করো করে করা করতে একটা কিছু সব খুব এখন পরে আগে মধ্যে উপর নিচে".split())
RECALL_HINTS = ("আগে", "আগের", "বলেছিল", "মনে আছে", "মনে কর", "remember", "previous", "earlier", "last time", "what did i")
class Store:
    def __init__(self, path=None):
        self.path=Path(path or os.environ.get("MAKIMA_STUDIO_DB") or Path(os.environ.get("LOCALAPPDATA",str(Path.home())))/"MakimaStudio"/"studio.sqlite3")
        self.path.parent.mkdir(parents=True,exist_ok=True)
        self.db=sqlite3.connect(self.path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,role TEXT NOT NULL,text TEXT NOT NULL,created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,label TEXT NOT NULL,status TEXT NOT NULL,detail TEXT NOT NULL,created REAL NOT NULL);
        """)
        self.db.commit()
    def settings(self):
        values=json.loads(json.dumps(DEFAULTS,ensure_ascii=False))
        for key,value in self.db.execute("SELECT key,value FROM settings"):
            if key in DEFAULTS:
                try:
                    loaded=json.loads(value)
                    if key=="workers" and not isinstance(loaded,list): continue
                    values[key]=loaded
                except ValueError: pass
        if values.get("worker_mode") not in ("auto","always","off"):
            values["worker_mode"]="auto"
        if values.get("voice_provider") not in ("wispr","google"):
            values["voice_provider"]="wispr"
        if not isinstance(values.get("manager"),dict):
            values["manager"]=json.loads(json.dumps(DEFAULT_MANAGER,ensure_ascii=False))
        return values
    def save_settings(self, values):
        with self.db:
            for key,value in values.items():
                if key in DEFAULTS:
                    self.db.execute("INSERT OR REPLACE INTO settings VALUES (?,?)",(key,json.dumps(value)))
    def add_message(self,role,text):
        with self.db:
            self.db.execute("INSERT INTO messages(role,text,created) VALUES (?,?,?)",(role,text,time.time()))
    def messages(self,limit=300):
        rows=list(self.db.execute("SELECT role,text FROM messages ORDER BY id DESC LIMIT ?",(max(1,int(limit)),)))
        rows.reverse()
        return rows
    def message_count(self):
        return int(self.db.execute("SELECT COUNT(*) FROM messages").fetchone()[0])
    @staticmethod
    def _tokens(text):
        return {token for token in TOKEN_RE.findall(str(text).casefold()) if token not in STOPWORDS}
    def context_messages(self,query,max_chars=18000,recent_turns=6,relevant_turns=10):
        rows=self.db.execute("SELECT role,text FROM messages ORDER BY id").fetchall()
        turns=[]; current=[]
        for role,text in rows:
            if role=="user":
                if current: turns.append(current)
                current=[(role,text)]
            elif role=="assistant":
                if not current: current=[(role,text)]
                else: current.append((role,text))
        if current: turns.append(current)
        if not turns: return []
        recent_start=max(0,len(turns)-max(1,int(recent_turns)))
        selected=set(range(recent_start,len(turns)))
        query_tokens=self._tokens(query)
        scored=[]
        if query_tokens:
            for index,turn in enumerate(turns[:recent_start]):
                body=" ".join(text for _,text in turn)
                tokens=self._tokens(body)
                overlap=query_tokens & tokens
                if overlap:
                    folded=body.casefold()
                    score=len(overlap)+0.1*sum(min(3,folded.count(token)) for token in overlap)+0.05*index/max(1,len(turns))
                    scored.append((score,index))
        scored.sort(reverse=True)
        if any(hint in str(query).casefold() for hint in RECALL_HINTS):
            selected.update(range(max(0,recent_start-6),recent_start))
        ranked=[]
        for _,index in scored:
            if index not in selected and len(ranked)<max(0,int(relevant_turns)):
                selected.add(index); ranked.append(index)
        older_selected=sorted((index for index in selected if index<recent_start and index not in ranked),reverse=True)
        priority=list(range(len(turns)-1,recent_start-1,-1))+ranked+older_selected
        remaining=max(1000,int(max_chars)); chosen={}
        for index in priority:
            if remaining<=0: break
            excerpt=[]
            for role,text in turns[index]:
                text=str(text)
                allowance=min(6000,max(0,remaining-80))
                if allowance<100: break
                if len(text)>allowance:
                    text=text[:allowance-60]+"\n[Message shortened for context; full text remains stored locally.]"
                excerpt.append((role,text)); remaining-=len(text)+len(role)+8
            if excerpt: chosen[index]=excerpt
        return [message for index in sorted(chosen) for message in chosen[index]]
    def clear_messages(self):
        with self.db: self.db.execute("DELETE FROM messages")
    def save_note(self,title,body,note_id=None):
        note_id=note_id or str(uuid.uuid4())
        with self.db: self.db.execute("INSERT OR REPLACE INTO notes VALUES (?,?,?,?)",(note_id,title[:100],body[:10000],time.time()))
        return note_id
    def notes(self):
        return list(self.db.execute("SELECT id,title,body FROM notes ORDER BY created DESC"))
    def delete_note(self,note_id):
        with self.db: self.db.execute("DELETE FROM notes WHERE id=?",(note_id,))
    def task(self,task_id,label,status,detail=""):
        with self.db:
            self.db.execute("INSERT INTO tasks VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,detail=excluded.detail",(task_id,label[:160],status,detail[:300],time.time()))
            self.db.execute("DELETE FROM tasks WHERE id NOT IN (SELECT id FROM tasks ORDER BY created DESC LIMIT 80)")
    def tasks(self):
        return list(self.db.execute("SELECT id,label,status,detail FROM tasks ORDER BY created DESC"))
    def recover(self):
        with self.db: self.db.execute("UPDATE tasks SET status='needs_review',detail='The previous session ended before an outcome was recorded.' WHERE status IN ('running','stopping')")
    def close(self): self.db.close()
