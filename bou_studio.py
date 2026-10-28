# -*- coding: utf-8 -*-
"""Bou (বউ): personal desktop AI assistant."""
import os,sys,json,math,time,uuid,queue,threading,logging,webbrowser,xml.etree.ElementTree as ET
from urllib.request import Request,urlopen
from pathlib import Path
import tkinter as tk
from tkinter import ttk,messagebox,filedialog
import bou_core as mk
from studio_store import Store,DEFAULT_MANAGER,DEFAULT_WORKERS
from studio_engine import Engine
try:
    from PIL import Image,ImageTk
except ImportError:
    Image=ImageTk=None
try:
    import psutil
except ImportError:
    psutil=None

BG="#090d16"; NAV="#0b111c"; CARD="#111a27"; CARD2="#192333"; LINE="#283342"
TXT="#f2f4f8"; DIM="#9aa5b5"; ACCENT="#ed6a63"; BLUE="#86a9e8"; RED="#ff8f9f"
FONT="Segoe UI"; BNFONT="Nirmala UI"
PAGES=[("assistant","Assistant"),("workers","Workers"),("camera","Camera & PC"),("voice","Voice studio"),("memory","Memory"),("activity","Activity"),("settings","Settings")]
STATUS={"completed":"Completed","failed":"Failed","running":"Running","submitted":"Sent to Windows","cancelled":"Cancelled","stopping":"Stopping","needs_review":"Needs review"}

def label(parent,text,size=11,color=TXT,bg=None,bold=False,**kwargs):
    return tk.Label(parent,text=text,font=(FONT,size,"bold" if bold else "normal"),fg=color,bg=bg or parent.cget("bg"),**kwargs)
def button(parent,text,command,primary=False,**kwargs):
    return tk.Button(parent,text=text,command=command,relief="flat",bd=0,padx=15,pady=10,cursor="hand2",
        bg=ACCENT if primary else CARD2,fg=BG if primary else TXT,activebackground="#ff8d83" if primary else LINE,
        activeforeground=BG if primary else TXT,font=(FONT,10,"bold"),**kwargs)
def textinput(parent,height=3):
    return tk.Text(parent,height=height,bg=CARD2,fg=TXT,insertbackground=ACCENT,relief="flat",bd=0,
        font=(BNFONT,11),padx=12,pady=10,wrap="word",selectbackground=LINE)
def entry(parent):
    return tk.Entry(parent,bg=CARD2,fg=TXT,insertbackground=ACCENT,relief="flat",font=(FONT,11))
class App(tk.Tk):
    def __init__(self,store=None,engine=None):
        super().__init__()
        self.title("বউ — AI Assistant 1.9.1")
        self.geometry("1600x920+40+40")
        self.minsize(1180,760)
        try:self.state("zoomed")
        except Exception:pass
        self.configure(bg=BG)
        self.store=store or Store()
        self.store.recover()
        self.settings=self.store.settings()
        self.engine=engine or Engine()
        mk.state["speech_out"]=bool(self.settings.get("speech_out",True))
        self.events=queue.Queue()
        self.busy=False; self.recording=False; self.voice_busy=False; self.closing=False
        self.voice_session_active=False; self.voice_session_preparing=False; self.voice_session_stop=threading.Event(); self.voice_pause=threading.Event(); self.voice_pause.set()
        self.live_voice_buttons=[]
        self.current_task=None; self.phase=0; self.orbs=[]; self.page="assistant"; self.selected_note=None
        self.signal_view="today"; self.map_mode="3D"; self.gesture_enabled=True; self.headlines=[]; self.headlines_ready=False
        self.signal_panel_visible=True; self.inspector_visible=True
        self.task_label=""; self.preview_photo=None
        self.camera_capture_id=None; self.camera_preview=None
        self.pc_enabled_var=tk.BooleanVar(value=False); self.pc_busy=False; self.pc_run_id=None
        self.pc_goal=""; self.pc_image=None; self.pc_screen_size=None; self.pc_stage="idle"
        self.pc_share_window=None; self.pc_action_window=None
        self.setup_style()
        self.build_sidebar()
        self.build_inspector()
        self.host=tk.Frame(self,bg=BG); self.host.pack(side="left",fill="both",expand=True,padx=24,pady=20)
        self.build_header()
        self.pages={}
        self.body=tk.Frame(self.host,bg=BG); self.body.pack(fill="both",expand=True)
        for key,_ in PAGES:
            f=tk.Frame(self.body,bg=BG); self.pages[key]=f
        self.build_assistant(); self.build_workers(); self.build_camera(); self.build_voice(); self.build_memory(); self.build_activity(); self.build_settings()
        self.show_page("assistant")
        for role,text in self.store.messages(): self.append_chat(role,text,save=False)
        self.refresh_memory(); self.refresh_activity(); self.update_connection()
        self.after(80,self.poll); self.after(60,self.animate); self.after(1000,self.stats); self.after(700,self.fetch_headlines)
        self.after(900,self.startup_voice)
        self.protocol("WM_DELETE_WINDOW",self.on_close)
        self.bind("<Escape>",lambda event:self.stop())
    def setup_style(self):
        s=ttk.Style(self)
        s.theme_use("clam")
        s.configure("Studio.Treeview",background=CARD,foreground=TXT,fieldbackground=CARD,borderwidth=0,rowheight=36,font=(FONT,10))
        s.configure("Studio.Treeview.Heading",background=CARD2,foreground=DIM,relief="flat",font=(FONT,10,"bold"))
        s.map("Studio.Treeview",background=[("selected",LINE)],foreground=[("selected",TXT)])
        s.configure("TCombobox",fieldbackground=CARD2,background=CARD2,foreground=TXT,arrowcolor=TXT,padding=7)
        s.map("TCombobox",fieldbackground=[("readonly",CARD2)],foreground=[("readonly",TXT)],selectbackground=[("readonly",CARD2)])
    def build_sidebar(self):
        side=tk.Frame(self,bg=NAV,width=82,highlightthickness=1,highlightbackground=LINE)
        side.pack(side="left",fill="y"); side.pack_propagate(False)
        logo=tk.Canvas(side,width=44,height=44,bg=NAV,highlightthickness=0)
        logo.pack(pady=(22,5)); logo.create_oval(3,3,41,41,outline=ACCENT,width=2)
        logo.create_oval(13,13,31,31,fill=ACCENT,outline="")
        label(side,"BOU",9,ACCENT,bold=True).pack(pady=(0,22))
        self.nav={}
        icons={"assistant":"⌂","workers":"⚒","camera":"◉","voice":"◖","memory":"◈","activity":"◷","settings":"⚙"}
        for key,title in PAGES:
            b=tk.Button(side,text=icons[key]+"\n"+title,command=lambda k=key:self.show_page(k),
                relief="flat",bd=0,cursor="hand2",bg=NAV,fg=DIM,activebackground=CARD2,
                activeforeground=ACCENT,font=(FONT,8,"bold"),justify="center",padx=2,pady=10)
            b.pack(fill="x",padx=7,pady=3); self.nav[key]=b
        label(side,"LOCAL\nMEMORY",8,DIM,justify="center").pack(side="bottom",pady=18)
    def build_inspector(self):
        side=tk.Frame(self,bg=NAV,width=390,highlightthickness=1,highlightbackground=LINE)
        side.pack(side="right",fill="y"); side.pack_propagate(False); self.inspector=side
        top=tk.Frame(side,bg=NAV); top.pack(fill="x",padx=18,pady=(18,12))
        label(top,"BOU  /  AGENT LINK",9,ACCENT,bold=True).pack(side="left")
        self.phase_label=label(top,"READY",9,ACCENT,bold=True); self.phase_label.pack(side="right")
        self.state_detail=label(side,"Your private assistant is ready.",9,DIM,anchor="w")
        self.state_detail.pack(fill="x",padx=18,pady=(0,12))
        tabs=tk.Frame(side,bg=NAV); tabs.pack(fill="x",padx=12,pady=(0,10)); self.inspector_tabs={}
        for title,key in [("VOICE","voice"),("AGENT","assistant"),("NOTES","memory")]:
            b=tk.Button(tabs,text=title,command=lambda k=key:self.show_page(k),relief="flat",bd=0,
                bg=CARD2 if key=="assistant" else NAV,fg=ACCENT if key=="assistant" else DIM,
                activebackground=CARD2,activeforeground=ACCENT,font=(FONT,8,"bold"),padx=23,pady=9)
            b.pack(side="left",expand=True,fill="x",padx=2)
            self.inspector_tabs[key]=b
        chat_frame=tk.Frame(side,bg=NAV); chat_frame.pack(fill="both",expand=True,padx=2)
        self.chat=tk.Text(chat_frame,bg=NAV,fg=TXT,relief="flat",bd=0,font=(BNFONT,11),wrap="word",
            padx=18,pady=16,state="disabled",spacing3=8)
        self.chat.pack(side="left",fill="both",expand=True)
        chat_scroll=ttk.Scrollbar(chat_frame,command=self.chat.yview); chat_scroll.pack(side="right",fill="y")
        self.chat.configure(yscrollcommand=chat_scroll.set)
        self.chat.tag_configure("user_label",foreground=BLUE,font=(FONT,8,"bold"))
        self.chat.tag_configure("assistant_label",foreground=ACCENT,font=(FONT,8,"bold"))
        self.chat.tag_configure("system_label",foreground=DIM,font=(FONT,8,"bold"))
        compose=tk.Frame(side,bg=CARD2,highlightthickness=1,highlightbackground=LINE)
        compose.pack(fill="x",padx=12,pady=(8,10))
        label(compose,"MESSAGE  ·  বাংলা বা English",8,DIM).pack(anchor="w",padx=12,pady=(9,2))
        self.prompt=textinput(compose,3); self.prompt.pack(fill="x",padx=3)
        self.prompt.bind("<Return>",self.enter_to_send)
        actions=tk.Frame(compose,bg=CARD2); actions.pack(fill="x",padx=8,pady=(1,8))
        label(actions,"Enter to send",8,DIM).pack(side="left")
        self.send_button=button(actions,"Send  →",self.send,True); self.send_button.pack(side="right")
        button(actions,"Clear",self.clear_chat).pack(side="right",padx=5)
        self.stop_button=button(side,"■  Stop current request",self.stop)
        self.stop_button.pack(fill="x",padx=12,pady=(0,10))
        foot=tk.Frame(side,bg=NAV); foot.pack(fill="x",padx=18,pady=(0,16))
        for title,attr,initial in [("AI CONNECTION","connection_label","Checking"),("LOCAL MEMORY","memory_count","0 messages"),("DEVICE","device_label","Loading")]:
            box=tk.Frame(foot,bg=NAV); box.pack(side="left",fill="x",expand=True,padx=(0,6))
            label(box,title,7,DIM,bold=True).pack(anchor="w")
            w=label(box,initial,8,TXT,wraplength=108,justify="left"); w.pack(anchor="w",pady=(4,0)); setattr(self,attr,w)
    def build_header(self):
        row=tk.Frame(self.host,bg=BG); row.pack(fill="x",pady=(0,8))
        self.page_title=label(row,"BOU  /  DESKTOP COMPANION",13,bold=True)
        self.page_title.pack(side="left")
        self.panel_buttons=tk.Frame(row,bg=BG); self.panel_buttons.pack(side="right")
        self.live_voice_buttons.append(button(self.panel_buttons,"Mic: OFF",self.toggle_voice_session))
        self.live_voice_buttons[-1].pack(side="left",padx=3)
        button(self.panel_buttons,"◫  Feed",self.toggle_signal_panel).pack(side="left",padx=3)
        button(self.panel_buttons,"◧  Chat",self.toggle_inspector).pack(side="left",padx=3)
        label(row,"PERSONAL AI  ·  LOCAL MEMORY",8,ACCENT).pack(side="right",padx=12)
        self.banner=label(self.host,"Ready when you are. আপনার নির্দেশ লিখুন।",9,DIM,anchor="w",wraplength=900,justify="left")
        self.banner.pack(fill="x",pady=(0,10))
    def new_orb(self,parent,height):
        c=tk.Canvas(parent,bg=CARD,highlightthickness=0,height=height)
        self.orbs.append(c)
        return c
    def build_assistant(self):
        f=self.pages["assistant"]
        layout=tk.Frame(f,bg=BG); layout.pack(fill="both",expand=True)
        self.signal_panel=tk.Frame(layout,bg=NAV,width=252,highlightthickness=1,highlightbackground=LINE)
        self.signal_panel.pack(side="left",fill="y",padx=(0,12)); self.signal_panel.pack_propagate(False)
        label(self.signal_panel,"MEDIA LINK",8,ACCENT,bold=True).pack(anchor="w",padx=14,pady=(13,3))
        label(self.signal_panel,"SAT-LINK FEED  ·  LOCAL",9,TXT,bold=True).pack(anchor="w",padx=14)
        map_row=tk.Frame(self.signal_panel,bg=NAV); map_row.pack(fill="x",padx=14,pady=(6,0))
        label(map_row,"Personal activity map · no location tracking",7,DIM).pack(side="left")
        self.map_mode_button=button(map_row,"3D",self.toggle_map_mode); self.map_mode_button.pack(side="right")
        self.globe_canvas=tk.Canvas(self.signal_panel,bg=NAV,height=176,highlightthickness=0)
        self.globe_canvas.pack(fill="x",padx=8,pady=(0,2))
        signal_nav=tk.Frame(self.signal_panel,bg=NAV); signal_nav.pack(fill="x",padx=9,pady=(0,7))
        self.signal_nav={}
        for title,key in [("Today","today"),("Map","map"),("Search","search"),("Alerts","alerts"),("More","more")]:
            b=tk.Button(signal_nav,text=title,command=lambda k=key:self.set_signal_view(k),relief="flat",bd=0,
                bg=CARD2 if key=="today" else NAV,fg=ACCENT if key=="today" else DIM,
                activebackground=CARD2,activeforeground=ACCENT,font=(FONT,7,"bold"),padx=4,pady=7)
            b.pack(side="left",expand=True,fill="x",padx=1); self.signal_nav[key]=b
        tk.Frame(self.signal_panel,bg=LINE,height=1).pack(fill="x",padx=14,pady=5)
        self.signal_title=label(self.signal_panel,"TODAY HEADLINES",8,DIM,bold=True)
        self.signal_title.pack(anchor="w",padx=14,pady=(3,5))
        label(self.signal_panel,"BBC NEWS · PUBLIC RSS",7,DIM).pack(anchor="w",padx=14,pady=(0,4))
        self.headline_feed=tk.Frame(self.signal_panel,bg=NAV); self.headline_feed.pack(fill="x",padx=13)
        self.activity_title=label(self.signal_panel,"RECENT ACTIVITY",7,DIM,bold=True); self.activity_title.pack(anchor="w",padx=14,pady=(7,2))
        self.recent_feed=tk.Frame(self.signal_panel,bg=NAV); self.recent_feed.pack(fill="x",padx=13)
        self.dashboard_memory=label(self.signal_panel,"Loading local archive…",8,TXT,wraplength=220,justify="left")
        self.dashboard_memory.pack(side="bottom",anchor="w",padx=14,pady=(0,8))
        label(self.signal_panel,"MEMORY CORE",7,DIM,bold=True).pack(side="bottom",anchor="w",padx=14,pady=(3,3))
        button(self.signal_panel,"Open memory  ↗",lambda:self.show_page("memory")).pack(side="bottom",fill="x",padx=11,pady=(3,10))

        self.assistant_main=tk.Frame(layout,bg=BG); self.assistant_main.pack(side="left",fill="both",expand=True)
        stage=tk.Frame(self.assistant_main,bg=CARD,highlightthickness=1,highlightbackground=LINE)
        stage.pack(fill="both",expand=True)
        stage_head=tk.Frame(stage,bg=CARD); stage_head.pack(fill="x",padx=17,pady=(10,2))
        label(stage_head,"BOU  /  CHARACTER CORE",9,ACCENT,bold=True).pack(side="left")
        self.core_status=label(stage_head,"●  STANDBY",8,DIM); self.core_status.pack(side="right")
        circuits=tk.Frame(stage,bg=CARD); circuits.pack(fill="x",padx=12,pady=(4,2))
        modules=[("◈","MEMORY","Archive & notes",lambda:self.show_page("memory")),
                 ("✧","SKILLS","Chat · Voice · Vision",self.show_skills),
                 ("◖","VOICES","Speech controls",lambda:self.show_page("voice")),
                 ("⚙","SETTING","Preferences",lambda:self.show_page("settings"))]
        for icon,title,detail,command in modules:
            box=tk.Frame(circuits,bg=CARD2,highlightthickness=1,highlightbackground=LINE)
            box.pack(side="left",fill="x",expand=True,padx=3)
            btn=tk.Button(box,text=icon+"  "+title,command=command,relief="flat",bd=0,
                bg=CARD2,fg=TXT,activebackground=LINE,activeforeground=ACCENT,
                font=(FONT,8,"bold"),anchor="w",padx=8,pady=7)
            btn.pack(fill="x")
            label(box,detail,7,DIM).pack(anchor="w",padx=9,pady=(0,6))
        self.avatar_canvas=tk.Canvas(stage,bg=CARD,highlightthickness=0,height=285)
        self.avatar_canvas.pack(fill="both",expand=True,padx=4,pady=(0,1))
        town=tk.Frame(stage,bg=NAV,highlightthickness=1,highlightbackground=LINE)
        town.pack(fill="x",padx=12,pady=(4,3))
        town_head=tk.Frame(town,bg=NAV); town_head.pack(fill="x",padx=10,pady=(5,1))
        label(town_head,"AGENT TOWN",8,ACCENT,bold=True).pack(side="left")
        self.workers_dashboard=label(town_head,"Manager + 3 workers · Auto",7,DIM); self.workers_dashboard.pack(side="left",padx=10)
        town_actions=tk.Frame(town_head,bg=NAV); town_actions.pack(side="right")
        for title,key,cmd in [("Agents","agents",lambda:self.show_page("workers")),
                              ("Visual hub","visual",lambda:self.fill_prompt("আমার জন্য একটি ছোট visual idea তৈরি করো")),
                              ("Gesture","gesture",self.toggle_gesture)]:
            button(town_actions,title,cmd).pack(side="left",padx=2)
        self.town_canvas=tk.Canvas(town,bg=NAV,height=66,highlightthickness=0)
        self.town_canvas.pack(fill="x",padx=7,pady=(0,5))
        hub=tk.Frame(stage,bg=CARD); hub.pack(fill="x",padx=14,pady=(4,9))
        hub_head=tk.Frame(hub,bg=CARD); hub_head.pack(fill="x")
        label(hub_head,"VISUAL HUB",8,DIM,bold=True).pack(side="left")
        label(hub_head,"Quick actions · choose a task",7,DIM).pack(side="right")
        actions=tk.Frame(hub,bg=CARD); actions.pack(fill="x",pady=(4,0))
        for title,prompt in [("Explain","সহজ ভাষায় AI কী বুঝিয়ে বলো"),("Write","একটি সংক্ষিপ্ত ধন্যবাদ বার্তা লিখে দাও"),("Translate","Translate this to English: শুভ সকাল")]:
            button(actions,title,lambda p=prompt:self.fill_prompt(p)).pack(side="left",padx=(0,5))
        button(actions,"Image…",self.choose_image).pack(side="right",padx=(4,0))
        button(actions,"Voice  ◖",lambda:self.show_page("voice")).pack(side="right",padx=(4,0))
    def build_voice(self):
        f=self.pages["voice"]
        card=tk.Frame(f,bg=CARD); card.pack(fill="x")
        c=self.new_orb(card,220); c.pack(fill="x")
        label(card,"Talk naturally. Bou will listen and reply.",18,bold=True).pack(pady=(0,10))
        label(card,"Live conversation starts automatically when Bou opens. Pause the microphone from the Mic button at any time.",10,DIM,wraplength=720).pack(pady=(0,18))
        self.live_voice_status=label(f,"Microphone is off.",10,DIM,anchor="w")
        self.live_voice_status.pack(fill="x",pady=(18,6))
        self.live_voice_buttons.append(button(f,"Start live conversation",self.toggle_voice_session,True))
        self.live_voice_buttons[-1].pack(anchor="w",pady=(4,14))
        tk.Frame(f,bg=LINE,height=1).pack(fill="x",pady=(4,12))
        label(f,"OPTIONAL · ONE-TIME DICTATION",9,ACCENT,bold=True).pack(anchor="w")
        label(f,"The live microphone above does not need a Record or Send click. One-time dictation is available only as an alternative.",9,DIM,wraplength=730).pack(anchor="w",pady=(5,4))
        self.record_button=button(f,"Record one phrase",self.record); self.record_button.pack(anchor="w",pady=(6,10))
        label(f,"TRANSCRIPT · কথার লেখা",9,DIM,bold=True).pack(anchor="w",pady=(8,10))
        self.transcript=textinput(f,6); self.transcript.pack(fill="both",expand=True)
        button(f,"Send edited transcript →",self.send_transcript).pack(anchor="e",pady=12)
        label(f,"Live speech is sent to the selected transcription provider; recognized text is sent to your configured AI provider. Bou does not save microphone audio.",9,DIM,wraplength=740,justify="left").pack(anchor="w",pady=6)
    def build_camera(self):
        f=self.pages["camera"]
        label(f,"CAMERA · MICROPHONE · PC CONTROL",9,ACCENT,bold=True).pack(anchor="w",pady=(2,6))
        label(f,"Your devices, only when you ask.",19,bold=True).pack(anchor="w")
        label(f,"Camera access starts only after your click. The microphone follows your live-voice setting and can be paused at any time.",10,DIM,wraplength=780,justify="left").pack(anchor="w",pady=(7,18))
        camera_card=tk.Frame(f,bg=CARD,highlightthickness=1,highlightbackground=LINE,padx=18,pady=15)
        camera_card.pack(fill="x",pady=(0,12))
        label(camera_card,"ONE CAMERA FRAME",9,ACCENT,bold=True).pack(anchor="w")
        label(camera_card,"Capture one still frame, review it here, then approve sending that frame to the AI provider for a description. Bou does not save the frame or identify who is shown.",10,DIM,wraplength=790,justify="left").pack(anchor="w",pady=(6,12))
        row=tk.Frame(camera_card,bg=CARD); row.pack(fill="x")
        self.camera_button=button(row,"Capture one frame",self.capture_camera,True); self.camera_button.pack(side="left")
        self.camera_status=label(row,"Camera off",9,DIM); self.camera_status.pack(side="left",padx=12)
        voice_card=tk.Frame(f,bg=CARD,highlightthickness=1,highlightbackground=LINE,padx=18,pady=14)
        voice_card.pack(fill="x",pady=(0,12))
        label(voice_card,"LIVE MICROPHONE",9,ACCENT,bold=True).pack(anchor="w")
        row=tk.Frame(voice_card,bg=CARD); row.pack(fill="x",pady=(5,0))
        label(row,"When enabled, Bou listens for complete phrases, transcribes them with the selected provider, sends the words to your AI, then speaks its reply. Pause the mic whenever you want.",10,DIM,wraplength=650,justify="left").pack(side="left",fill="x",expand=True)
        button(row,"Open Voice Studio →",lambda:self.show_page("voice")).pack(side="right",padx=(12,0))
        pc_card=tk.Frame(f,bg=CARD,highlightthickness=1,highlightbackground=ACCENT,padx=18,pady=15)
        pc_card.pack(fill="both",expand=True)
        label(pc_card,"CONFIRMED PC CONTROL",9,ACCENT,bold=True).pack(anchor="w")
        label(pc_card,"Give Bou one task. For every step it will show you the screen before sharing it with the AI, then show one proposed click, key, scroll, or text entry and wait for your approval. After one approved action, Bou stops until you choose Continue.",10,DIM,wraplength=790,justify="left").pack(anchor="w",pady=(6,10))
        tk.Checkbutton(pc_card,text="Enable confirmed PC control for this session",variable=self.pc_enabled_var,
            command=self.toggle_pc_control,bg=CARD,fg=TXT,selectcolor=CARD2,activebackground=CARD,
            activeforeground=TXT,font=(FONT,10,"bold")).pack(anchor="w",pady=(0,7))
        label(pc_card,"Task for Bou",9,DIM).pack(anchor="w",pady=(2,5))
        self.pc_goal_entry=textinput(pc_card,3); self.pc_goal_entry.pack(fill="x")
        row=tk.Frame(pc_card,bg=CARD); row.pack(fill="x",pady=(10,4))
        self.pc_start_button=button(row,"Start task",self.start_pc_task,True); self.pc_start_button.pack(side="left")
        self.pc_continue_button=button(row,"Review next screen",self.continue_pc_task); self.pc_continue_button.pack(side="left",padx=7)
        self.pc_stop_button=button(row,"Stop",self.stop_pc_task); self.pc_stop_button.pack(side="left")
        self.pc_status=label(pc_card,"PC control is off.",9,DIM,wraplength=790,justify="left")
        self.pc_status.pack(anchor="w",pady=(7,0))
        label(pc_card,"Bou does not save screenshots. Passwords, payment, purchases, sending or publishing, deletion, installation, agreements, and security changes are blocked for direct handling by you.",9,DIM,wraplength=790,justify="left").pack(anchor="w",pady=(8,0))
        self.update_pc_controls()
    def build_workers(self):
        outer=self.pages["workers"]
        scroll=tk.Canvas(outer,bg=BG,highlightthickness=0)
        bar=ttk.Scrollbar(outer,command=scroll.yview); bar.pack(side="right",fill="y")
        scroll.pack(side="left",fill="both",expand=True); scroll.configure(yscrollcommand=bar.set)
        content=tk.Frame(scroll,bg=BG); window=scroll.create_window((0,0),window=content,anchor="nw")
        content.bind("<Configure>",lambda event:scroll.configure(scrollregion=scroll.bbox("all")))
        scroll.bind("<Configure>",lambda event:scroll.itemconfigure(window,width=event.width))
        label(content,"WORKER CONTROL ROOM",10,ACCENT,bold=True).pack(anchor="w",pady=(3,5))
        label(content,"Give one request to a small team, then let Bou combine their reports.",16,bold=True).pack(anchor="w")
        label(content,"Auto delegates long or multi-step requests. Always delegates every normal chat. Off uses one AI call. Enabled workers run in parallel, followed by one coordinator call, so delegated tasks use extra provider requests and tokens. All requests use the model and OpenRouter key in Settings. Workers cannot browse the web or operate your PC.",9,DIM,wraplength=820,justify="left").pack(anchor="w",pady=(8,15))
        manager_config=self.settings.get("manager",DEFAULT_MANAGER)
        if not isinstance(manager_config,dict): manager_config=DEFAULT_MANAGER
        manager_card=tk.Frame(content,bg=CARD,highlightthickness=1,highlightbackground=ACCENT,padx=14,pady=12)
        manager_card.pack(fill="x",pady=(0,10))
        manager_head=tk.Frame(manager_card,bg=CARD); manager_head.pack(fill="x")
        label(manager_head,"MANAGER  ·  TASK ROUTING",8,ACCENT,bold=True).pack(side="left")
        self.manager_status_label=label(manager_head,"READY",8,DIM,bold=True); self.manager_status_label.pack(side="right")
        self.manager_name_entry=entry(manager_card); self.manager_name_entry.insert(0,str(manager_config.get("name","Manager"))[:50])
        self.manager_name_entry.pack(fill="x",ipady=7,pady=(8,0))
        self.manager_instructions=textinput(manager_card,3); self.manager_instructions.pack(fill="x",pady=(8,0))
        self.manager_instructions.insert("1.0",str(manager_config.get("instructions",DEFAULT_MANAGER["instructions"]))[:1400])
        mode_box=tk.Frame(content,bg=CARD,padx=14,pady=12); mode_box.pack(fill="x",pady=(0,12))
        label(mode_box,"WORKER MODE",8,DIM,bold=True).pack(side="left")
        self.worker_mode_var=tk.StringVar(value=self.settings.get("worker_mode","auto"))
        ttk.Combobox(mode_box,textvariable=self.worker_mode_var,values=["auto","always","off"],state="readonly",width=14).pack(side="right")
        label(mode_box,"Auto  ·  Always  ·  Off",8,DIM).pack(side="right",padx=12)
        configs=self.settings.get("workers",[])
        if not isinstance(configs,list): configs=[]
        if not configs: configs=DEFAULT_WORKERS
        defaults=DEFAULT_WORKERS
        self.worker_controls=[]; self.worker_status_labels={}; self.worker_names={}
        self.worker_names["__manager__"]=str(manager_config.get("name","Manager"))[:50]
        for index,default in enumerate(defaults[:3]):
            config=configs[index] if index<len(configs) and isinstance(configs[index],dict) else default
            card=tk.Frame(content,bg=CARD,highlightthickness=1,highlightbackground=LINE,padx=14,pady=12)
            card.pack(fill="x",pady=5)
            head=tk.Frame(card,bg=CARD); head.pack(fill="x")
            name_entry=entry(head); name_entry.insert(0,str(config.get("name",default["name"]))[:50]); name_entry.pack(side="left",fill="x",expand=True,ipady=7)
            enabled_var=tk.BooleanVar(value=bool(config.get("enabled",True)))
            tk.Checkbutton(head,text="Enabled",variable=enabled_var,bg=CARD,fg=TXT,selectcolor=CARD2,activebackground=CARD,activeforeground=TXT,font=(FONT,9)).pack(side="left",padx=10)
            status_label=label(head,"READY",8,DIM,bold=True); status_label.pack(side="right")
            instructions=textinput(card,3); instructions.pack(fill="x",pady=(8,0))
            instructions.insert("1.0",str(config.get("instructions",default["instructions"]))[:1400])
            worker_id=str(config.get("id",default["id"]))[:40]
            self.worker_controls.append({"id":worker_id,"name":name_entry,"enabled":enabled_var,"instructions":instructions})
            self.worker_status_labels[worker_id]=status_label
            self.worker_names[worker_id]=str(config.get("name",default["name"]))[:50]
        row=tk.Frame(content,bg=BG); row.pack(fill="x",pady=12)
        button(row,"Save worker setup",self.save_workers,True).pack(side="left")
        label(row,"Names and roles are saved locally.",9,DIM).pack(side="left",padx=12)
        self.update_worker_summary()
    def build_memory(self):
        f=self.pages["memory"]
        label(f,"Keep the details you choose.",16,bold=True).pack(anchor="w")
        label(f,"Your full conversation archive stays on this PC. When conversation memory is enabled, Bou sends only recent and relevant excerpts with chat requests; it does not send the full archive.",10,DIM,wraplength=560,justify="left").pack(anchor="w",pady=(8,10))
        self.transcript_info=label(f,"0 chat messages stored locally.",9,ACCENT,wraplength=560,justify="left")
        self.transcript_info.pack(anchor="w",pady=(0,12))
        label(f,"Saved notes are also local. Enable “Use saved notes” in Settings to include them in AI chats.",9,DIM,wraplength=560,justify="left").pack(anchor="w",pady=(0,14))
        self.note_list=ttk.Treeview(f,columns=("title",),show="headings",height=4,style="Studio.Treeview")
        self.note_list.heading("title",text="Saved notes")
        self.note_list.pack(fill="x"); self.note_list.bind("<<TreeviewSelect>>",self.select_note)
        label(f,"Title",10,DIM).pack(anchor="w",pady=(16,6))
        self.note_title=entry(f); self.note_title.pack(fill="x",ipady=9)
        label(f,"Note",10,DIM).pack(anchor="w",pady=(12,6))
        self.note_body=textinput(f,7); self.note_body.pack(fill="both",expand=True)
        row=tk.Frame(f,bg=BG); row.pack(fill="x",pady=14)
        button(row,"Save note",self.save_note,True).pack(side="left")
        button(row,"New",self.new_note).pack(side="left",padx=7)
        button(row,"Delete",self.delete_note).pack(side="right")
    def build_activity(self):
        f=self.pages["activity"]
        label(f,"An honest record of your requests.",16,bold=True).pack(anchor="w")
        label(f,"“Sent to Windows” means a launch request was sent; it does not verify the opened window.",10,DIM,wraplength=560,justify="left").pack(anchor="w",pady=(8,18))
        self.task_list=ttk.Treeview(f,columns=("request","status"),show="headings",style="Studio.Treeview")
        self.task_list.heading("request",text="Request"); self.task_list.heading("status",text="Status")
        self.task_list.column("request",width=350); self.task_list.column("status",width=145,stretch=False)
        self.task_list.pack(fill="both",expand=True)
        self.task_list.bind("<<TreeviewSelect>>",self.show_task_detail)
        self.task_detail=label(f,"Select a request for details.",10,DIM,wraplength=560,justify="left")
        self.task_detail.pack(fill="x",pady=15)
    def build_settings(self):
        outer=self.pages["settings"]
        scroll=tk.Canvas(outer,bg=BG,highlightthickness=0)
        bar=ttk.Scrollbar(outer,command=scroll.yview)
        bar.pack(side="right",fill="y")
        scroll.pack(side="left",fill="both",expand=True)
        scroll.configure(yscrollcommand=bar.set)
        f=tk.Frame(scroll,bg=BG)
        window=scroll.create_window((0,0),window=f,anchor="nw")
        f.bind("<Configure>",lambda event:scroll.configure(scrollregion=scroll.bbox("all")))
        scroll.bind("<Configure>",lambda event:scroll.itemconfigure(window,width=event.width))
        self.settings_scroll=scroll
        label(f,"Make it work your way.",16,bold=True).pack(anchor="w",pady=(0,18))
        button(f,"Configure worker team  →",lambda:self.show_page("workers")).pack(anchor="w",pady=(0,12))
        label(f,"Assistant connection",10,DIM).pack(anchor="w",pady=(4,5))
        self.backend_mode_var=tk.StringVar(value=self.settings.get("backend_mode","local"))
        ttk.Combobox(f,textvariable=self.backend_mode_var,values=["local","service"],state="readonly").pack(fill="x",pady=(0,8))
        label(f,"Hosted service URL",10,DIM).pack(anchor="w",pady=(4,5))
        self.service_url_entry=entry(f); self.service_url_entry.insert(0,self.settings.get("service_url","")); self.service_url_entry.pack(fill="x",ipady=8)
        label(f,"Customer access token · from your Bou admin",10,DIM).pack(anchor="w",pady=(8,5))
        self.service_token_entry=entry(f); self.service_token_entry.configure(show="•"); self.service_token_entry.insert(0,self.settings.get("service_token","")); self.service_token_entry.pack(fill="x",ipady=8)
        label(f,"In service mode, provider keys stay on your server. Use an HTTPS URL for a hosted service.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=(6,10))
        self.mode_var=tk.StringVar(value=self.settings["mode"])
        self.lang_var=tk.StringVar(value=self.settings["language"])
        for title,var,choices in [("Conversation mode",self.mode_var,["chat","translator","writer","teacher"]),("Recognition language",self.lang_var,["bn-BD","en-US"])]:
            label(f,title,10,DIM).pack(anchor="w",pady=(6,5))
            ttk.Combobox(f,textvariable=var,values=choices,state="readonly").pack(fill="x",pady=(0,8))
        label(f,"OpenRouter model",10,DIM).pack(anchor="w",pady=(6,5))
        self.model_entry=entry(f); self.model_entry.insert(0,self.settings["model"]); self.model_entry.pack(fill="x",ipady=9)
        self.speech_var=tk.BooleanVar(value=self.settings["speech_out"]); self.memory_var=tk.BooleanVar(value=self.settings["use_memory"])
        self.voice_auto_var=tk.BooleanVar(value=self.settings.get("voice_auto_start",True))
        self.history_var=tk.BooleanVar(value=self.settings.get("use_history",True))
        for title,var in [("Speak AI replies and startup greeting",self.speech_var),("Start live microphone conversation when Bou opens",self.voice_auto_var),("Use conversation memory in AI chats",self.history_var),("Use saved notes in AI requests",self.memory_var)]:
            tk.Checkbutton(f,text=title,variable=var,bg=BG,fg=TXT,selectcolor=CARD2,activebackground=BG,activeforeground=TXT,font=(FONT,10)).pack(anchor="w",pady=9)
        label(f,"Speech-to-text provider",10,DIM).pack(anchor="w",pady=(8,5))
        provider_labels={"local_whisper":"Local Whisper (offline)","wispr":"Wispr Flow API","google":"Google Speech Recognition"}
        provider_name=provider_labels.get(self.settings.get("voice_provider","local_whisper"),"Local Whisper (offline)")
        self.voice_provider_var=tk.StringVar(value=provider_name)
        ttk.Combobox(f,textvariable=self.voice_provider_var,values=["Local Whisper (offline)","Wispr Flow API","Google Speech Recognition"],state="readonly").pack(fill="x",pady=(0,8))
        self.voice_provider_hint=label(f,"",9,DIM,wraplength=550,justify="left"); self.voice_provider_hint.pack(anchor="w",pady=(0,8))
        self.voice_provider_var.trace_add("write",self.update_voice_provider_hint); self.update_voice_provider_hint()
        label(f,"Wispr Flow API key · only needed when Wispr Flow is selected",10,DIM).pack(anchor="w",pady=(8,5))
        self.wispr_key_entry=entry(f); self.wispr_key_entry.configure(show="•"); self.wispr_key_entry.pack(fill="x",ipady=9)
        wispr_key_row=tk.Frame(f,bg=BG); wispr_key_row.pack(fill="x",pady=9)
        button(wispr_key_row,"Use this session",self.apply_wispr_key).pack(side="left")
        button(wispr_key_row,"Save securely",self.save_wispr_api_key).pack(side="left",padx=6)
        button(wispr_key_row,"Remove saved key",self.remove_saved_wispr_api_key).pack(side="left",padx=6)
        label(f,"Wispr Voice Interface API access needs Wispr approval and may incur usage charges. Bou stores the key in this Windows account's Credential Manager, never in the project files.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=(0,10))
        label(f,"The full transcript stays on this PC. When enabled, recent and relevant earlier excerpts are sent with your chat request to the configured OpenRouter model. Turn this off to keep the archive local only.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=(0,10))
        button(f,"Save preferences",self.save_settings,True).pack(anchor="w",pady=(6,18))
        tk.Frame(f,bg=LINE,height=1).pack(fill="x",pady=5)
        label(f,"OpenRouter API key · local mode only",10,DIM).pack(anchor="w",pady=(12,6))
        self.key_entry=entry(f); self.key_entry.configure(show="•"); self.key_entry.pack(fill="x",ipady=9)
        row=tk.Frame(f,bg=BG); row.pack(fill="x",pady=10)
        button(row,"Use for this session",self.apply_key).pack(side="left")
        button(row,"Save securely",self.save_api_key).pack(side="left",padx=6)
        button(row,"Remove saved key",self.remove_saved_api_key).pack(side="left",padx=6)
        button(row,"Test connection",self.test_connection).pack(side="right")
        label(f,"Saved keys are kept in this Windows account's Credential Manager, never bundled into the installer. This key is used only in local mode.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=5)
        label(f,"Capabilities: chat · translations · writing · explicit app launches · image analysis · one-shot camera · approved one-step PC control",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=10)
    def show_page(self,key):
        for f in self.pages.values(): f.pack_forget()
        self.pages[key].pack(fill="both",expand=True)
        self.page=key
        if key=="assistant":
            if self.inspector_visible:self.inspector.pack(side="right",fill="y")
            else:self.inspector.pack_forget()
            if self.signal_panel_visible:self.signal_panel.pack(side="left",before=self.assistant_main,fill="y",padx=(0,12))
            else:self.signal_panel.pack_forget()
        else:
            self.inspector.pack_forget()
        titles={"assistant":"BOU  /  DESKTOP COMPANION","workers":"BOU  /  AGENT TOWN","camera":"BOU  /  CAMERA & PC CONTROL","voice":"BOU  /  VOICE STUDIO","memory":"BOU  /  PERSONAL MEMORY","activity":"BOU  /  YOUR ACTIVITY","settings":"BOU  /  PREFERENCES"}
        self.page_title.configure(text=titles[key])
        for k,b in self.nav.items():
            b.configure(bg=CARD2 if k==key else NAV,fg=ACCENT if k==key else DIM)
        for k,b in getattr(self,"inspector_tabs",{}).items():
            selected=(key==k or (key=="assistant" and k=="assistant"))
            b.configure(bg=CARD2 if selected else NAV,fg=ACCENT if selected else DIM)
        if hasattr(self,"core_status"):
            self.core_status.configure(text="●  ACTIVE" if key=="assistant" else "●  STANDBY",fg=ACCENT if key=="assistant" else DIM)
    def toggle_signal_panel(self):
        self.signal_panel_visible=not self.signal_panel_visible
        if self.page!="assistant":self.show_page("assistant")
        elif self.signal_panel_visible:self.signal_panel.pack(side="left",before=self.assistant_main,fill="y",padx=(0,12))
        else:self.signal_panel.pack_forget()
    def toggle_inspector(self):
        self.inspector_visible=not self.inspector_visible
        if self.page!="assistant":self.show_page("assistant")
        elif self.inspector_visible:self.inspector.pack(side="right",fill="y")
        else:self.inspector.pack_forget()
    def set_signal_view(self,key):
        if key=="search":
            self.signal_view="search"; self.signal_title.configure(text="WEB SEARCH · BROWSER")
            self.refresh_activity(); self.show_page("assistant")
            draft=self.prompt.get("1.0","end").strip()
            query=draft if draft.casefold().startswith("search ") else "search "+draft
            self.prompt.delete("1.0","end"); self.prompt.insert("1.0",query); self.prompt.focus_set()
        elif key=="more":
            self.show_page("settings"); return
        else:
            self.signal_view=key
            names={"today":"TODAY HEADLINES","map":"MAP · LOCAL ACTIVITY ONLY","alerts":"ALERTS · TASK STATUS"}
            self.signal_title.configure(text=names.get(key,"TODAY · PERSONAL SIGNALS"))
            for name,button_widget in self.signal_nav.items():
                button_widget.configure(bg=CARD2 if name==key else NAV,fg=ACCENT if name==key else DIM)
            self.refresh_activity()
        for name,button_widget in self.signal_nav.items():
            button_widget.configure(bg=CARD2 if name==key else NAV,fg=ACCENT if name==key else DIM)
    def toggle_map_mode(self):
        self.map_mode="2D" if self.map_mode=="3D" else "3D"
        self.map_mode_button.configure(text=self.map_mode)
        self.draw_globe()
    def toggle_gesture(self):
        self.gesture_enabled=not self.gesture_enabled
        self.notify("Character gesture animation "+("enabled." if self.gesture_enabled else "paused."))
    def show_skills(self):
        win=tk.Toplevel(self); win.title("Bou skills"); win.configure(bg=BG); win.transient(self)
        win.resizable(False,False)
        label(win,"AVAILABLE SKILLS",11,ACCENT,bold=True).pack(anchor="w",padx=22,pady=(20,12))
        for title,detail in [("Chat","Ask questions and continue your saved conversation."),
            ("Voice","Talk naturally with the live microphone. Bou transcribes and replies automatically."),
            ("Vision","Choose an image, review it, then confirm before analysis."),
            ("Agent Town","Watch the Manager and worker team status. Open Agents to edit task roles."),
            ("Desktop launch","Request an app launch explicitly; Bou records the request status.")]:
            card=tk.Frame(win,bg=CARD,padx=12,pady=10); card.pack(fill="x",padx=18,pady=4)
            label(card,title,10,TXT,bold=True).pack(anchor="w")
            label(card,detail,9,DIM,wraplength=360,justify="left").pack(anchor="w",pady=(4,0))
        button(win,"Close",win.destroy).pack(anchor="e",padx=18,pady=15)
    def notify(self,text,error=False):
        self.banner.configure(text=text,fg=RED if error else DIM)
    def set_phase(self,title,detail=""):
        self.phase_label.configure(text=title,fg=RED if title=="Failed" else ACCENT)
        self.state_detail.configure(text=detail or "Your workspace is ready.")
        if hasattr(self,"core_status"):
            active=title not in ("Ready","Completed","Cancelled","Submitted to Windows")
            self.core_status.configure(text="●  "+("ACTIVE" if active else "STANDBY"),fg=ACCENT if active else DIM)
    def update_connection(self):
        if self.settings.get("backend_mode")=="service":
            self.connection_label.configure(text="Hosted service\n"+self.settings.get("service_url","")[:80])
        else:
            self.connection_label.configure(text=("Key configured\n"+self.settings["model"]) if self.engine.api_key else "No key · open Settings")
    def append_chat(self,role,text,save=True):
        self.chat.configure(state="normal")
        self.chat.insert("end",{"user":"YOU","assistant":"বউ","system":"SYSTEM"}.get(role,role.upper())+"\n",role+"_label")
        self.chat.insert("end",text+"\n\n")
        self.chat.configure(state="disabled"); self.chat.see("end")
        if save: self.store.add_message(role,text)
    def fill_prompt(self,text):
        self.show_page("assistant"); self.prompt.delete("1.0","end"); self.prompt.insert("1.0",text); self.prompt.focus_set()
    def enter_to_send(self,event):
        if event.state & 1: return None
        self.send(); return "break"
    def send(self):
        text=self.prompt.get("1.0","end").strip()
        if text and self.submit(text): self.prompt.delete("1.0","end")
    def submit(self,text,kind="chat",image=None,purpose="image"):
        if self.busy or self.recording or self.voice_busy or self.pc_busy or self.camera_capture_id:
            self.notify("একটি কাজ চলছে। শেষ হওয়া পর্যন্ত অপেক্ষা করুন।",True); return False
        self.busy=True; self.engine.cancel_event.clear(); self.current_task=str(uuid.uuid4()); self.task_label=text
        settings=self.settings.copy()
        for status in self.worker_status_labels.values(): status.configure(text="READY",fg=DIM)
        self.manager_status_label.configure(text="READY",fg=DIM)
        history=self.store.context_messages(text) if settings.get("use_history",True) and settings["mode"]=="chat" else []
        notes=self.store.notes(); task_id=self.current_task
        self.store.task(task_id,text,"running"); self.refresh_activity()
        self.append_chat("user",text); self.set_phase("Thinking","Working on your request.")
        self.send_button.configure(state="disabled")
        self.notify("Working… Stop দিয়ে চলতি উত্তর বাতিল করতে পারেন।")
        def work():
            try:
                result=self.engine.analyze(image,settings,prompt=text,purpose=purpose) if kind=="image" else self.engine.execute(
                    text,settings,history,notes,progress=lambda worker_id,state:self.events.put(("worker_status",(task_id,worker_id,state))))
            except Exception as exc: result={"status":"failed","text":"Request failed ("+type(exc).__name__+")."}
            self.events.put(("result",(task_id,result)))
        threading.Thread(target=work,daemon=True).start()
        return True
    def stop(self):
        if self.camera_capture_id:
            self.camera_capture_id=None; self.camera_button.configure(state="normal")
            self.camera_status.configure(text="Camera off · capture discarded",fg=DIM)
            self.notify("Camera frame discarded."); return
        if self.camera_preview:
            try:self.camera_preview.destroy()
            except tk.TclError:pass
            self.camera_preview=None; self.camera_status.configure(text="Camera off · frame discarded",fg=DIM)
            return
        if self.pc_busy:
            self.stop_pc_task(); return
        self.engine.cancel()
        if self.busy and self.current_task:
            self.store.task(self.current_task,self.task_label,"stopping")
            self.set_phase("Stopping","Waiting for the current network call to return; its answer will be discarded.")
            self.refresh_activity()
        elif self.recording: self.set_phase("Stopping","Recording will be discarded.")
        elif self.voice_busy: self.set_phase("Stopping","Stopping spoken playback.")
        else: self.set_phase("Ready"); self.notify("No active request.")
    def clear_chat(self):
        if self.busy: self.notify("Wait for the current request to finish.",True); return
        if self.store.message_count() and not messagebox.askyesno("Clear chat","Remove the entire saved conversation archive from this PC? This cannot be undone."): return
        self.store.clear_messages(); self.chat.configure(state="normal"); self.chat.delete("1.0","end"); self.chat.configure(state="disabled")
        self.refresh_memory(); self.notify("Conversation archive cleared. Saved memory notes are unchanged.")
    def record(self):
        if self.recording:
            self.engine.record_stop.set(); self.record_button.configure(state="disabled"); return
        if self.busy or self.voice_busy or self.voice_session_active or self.pc_busy or self.camera_capture_id: self.notify("Pause live listening before using one-time dictation.",True); return
        self.recording=True; self.engine.cancel_event.clear()
        self.record_button.configure(text="Finish recording")
        self.set_phase("Recording","Up to 12 seconds. Press Finish when done.")
        provider_name={"local_whisper":"Local Whisper","wispr":"Wispr Flow","google":"Google Speech Recognition"}.get(self.settings.get("voice_provider","local_whisper"),"Local Whisper")
        self.notify("Microphone active. Audio goes to "+provider_name+" for transcription.")
        def work():
            try:
                text=self.engine.record(self.settings["language"],self.events,self.settings.get("voice_provider","local_whisper"))
                self.events.put(("transcript",text))
            except Exception as exc: self.events.put(("voice_error",type(exc).__name__))
        threading.Thread(target=work,daemon=True).start()
    def send_transcript(self):
        text=self.transcript.get("1.0","end").strip()
        if text:self.show_page("assistant"); self.submit(text)
    def choose_image(self):
        if self.busy or self.pc_busy: self.notify("Wait for the current request.",True); return
        if not Image: self.notify("Pillow is not installed.",True); return
        path=filedialog.askopenfilename(title="Choose an image to analyze",filetypes=[("Images","*.png *.jpg *.jpeg *.webp")])
        if not path: return
        try:
            with Image.open(path) as im:
                image=im.convert("RGB"); image.thumbnail((1600,1600))
        except Exception as exc: self.notify("Cannot open this image ("+type(exc).__name__+").",True); return
        win=tk.Toplevel(self); win.title("Review image"); win.configure(bg=BG); win.transient(self); win.grab_set()
        thumb=image.copy(); thumb.thumbnail((650,400))
        photo=ImageTk.PhotoImage(thumb)
        view=tk.Label(win,image=photo,bg=BG); view.image=photo; view.pack(padx=20,pady=20)
        label(win,"Only this selected image will be sent to your configured AI provider.",10,DIM,wraplength=560).pack(padx=20,pady=10)
        def confirm():
            win.destroy(); self.show_page("assistant"); self.submit("এই ছবিটি বুঝিয়ে বলো।","image",image)
        button(win,"Analyze this image",confirm,True).pack(pady=15)
    def capture_camera(self):
        if self.busy or self.recording or self.voice_busy or self.pc_busy or self.camera_capture_id:
            self.notify("অন্য একটি কাজ শেষ হলে ক্যামেরা ব্যবহার করুন।",True); return
        if not Image or not ImageTk:
            self.notify("ছবি দেখার জন্য Pillow ইনস্টল নেই।",True); return
        if not messagebox.askyesno("Use camera once","Bou will open the default camera, capture one still frame, and turn the camera off. Continue?"):
            return
        request_id=str(uuid.uuid4()); self.camera_capture_id=request_id
        self.camera_button.configure(state="disabled"); self.camera_status.configure(text="Capturing one frame…",fg=ACCENT)
        def work():
            try:self.events.put(("camera_frame",(request_id,self.engine.capture_camera_frame(),"")))
            except Exception as exc:self.events.put(("camera_frame",(request_id,None,str(exc))))
        threading.Thread(target=work,name="bou-camera-one-frame",daemon=True).start()
    def show_camera_review(self,image):
        win=tk.Toplevel(self); win.title("Review camera frame"); win.configure(bg=BG); win.transient(self); win.grab_set()
        preview=image.copy(); preview.thumbnail((850,500)); photo=ImageTk.PhotoImage(preview)
        view=tk.Label(win,image=photo,bg=BG); view.image=photo; view.pack(padx=18,pady=(18,8))
        label(win,"This single frame will be sent to the configured AI provider only if you approve. Bou will describe visible, non-sensitive details; it does not save the frame or identify the person.",10,DIM,wraplength=760,justify="left").pack(padx=18,pady=8)
        row=tk.Frame(win,bg=BG); row.pack(pady=(2,16))
        def cancel():
            self.camera_preview=None; win.destroy(); self.camera_status.configure(text="Camera off · frame discarded",fg=DIM)
        def confirm():
            self.camera_preview=None; win.destroy(); self.camera_status.configure(text="Camera off · frame approved for analysis",fg=DIM)
            self.show_page("assistant")
            self.submit("এই ক্যামেরার ছবিতে দৃশ্যমান পোশাক, চুল, accessories ও ভঙ্গি বাংলায় নিরপেক্ষভাবে বর্ণনা করো।","image",image,purpose="camera")
        button(row,"Discard frame",cancel).pack(side="left",padx=5)
        button(row,"Send this frame for description",confirm,True).pack(side="left",padx=5)
        win.protocol("WM_DELETE_WINDOW",cancel); self.camera_preview=win
    def update_pc_controls(self):
        enabled=self.pc_enabled_var.get() and not self.pc_busy
        self.pc_start_button.configure(state="normal" if enabled else "disabled")
        self.pc_continue_button.configure(state="normal" if self.pc_enabled_var.get() and self.pc_busy and self.pc_stage=="waiting" else "disabled")
        self.pc_stop_button.configure(state="normal" if self.pc_busy else "disabled")
    def toggle_pc_control(self):
        if not self.pc_enabled_var.get() and self.pc_busy:self.stop_pc_task()
        self.update_pc_controls()
    def start_pc_task(self):
        if not self.pc_enabled_var.get():return
        if self.busy or self.recording or self.voice_busy or self.pc_busy:
            self.notify("অন্য একটি কাজ শেষ হলে PC control শুরু করুন।",True); return
        goal=self.pc_goal_entry.get("1.0","end").strip()
        if not goal:self.pc_status.configure(text="প্রথমে Bou-কে একটি PC task লিখুন।",fg=RED); return
        if self.engine._blocked_pc_request(goal):
            self.pc_status.configure(text="এই কাজটি Bou করবে না। সংবেদনশীল বা ঝুঁকিপূর্ণ ধাপ আপনাকেই করতে হবে।",fg=RED); return
        self.engine.cancel_event.clear(); self.pc_run_id=str(uuid.uuid4()); self.pc_goal=goal
        self.pc_busy=True; self.pc_stage="capturing"; self.pc_status.configure(text="একটি screenshot প্রস্তুত হচ্ছে; পাঠানোর আগে আপনি সেটি দেখবেন।",fg=ACCENT)
        self.update_pc_controls(); self.request_pc_frame()
    def continue_pc_task(self):
        if not self.pc_busy or self.pc_stage!="waiting" or not self.pc_enabled_var.get():return
        self.pc_stage="capturing"; self.pc_status.configure(text="পরের একক ধাপের জন্য নতুন screenshot প্রস্তুত হচ্ছে।",fg=ACCENT)
        self.update_pc_controls(); self.request_pc_frame()
    def request_pc_frame(self):
        run_id=self.pc_run_id
        self.iconify()
        def work():
            try:
                time.sleep(0.45)
                image=self.engine.capture_screen_frame()
                screen_size=image.info.get("bou_screen_size",image.size)
                self.events.put(("pc_screen_frame",(run_id,image,screen_size,"")))
            except Exception as exc:self.events.put(("pc_screen_frame",(run_id,None,None,str(exc))))
        threading.Thread(target=work,name="bou-screen-review",daemon=True).start()
    def show_pc_share_review(self,image,screen_size):
        win=tk.Toplevel(self); win.title("Review screen before sharing"); win.configure(bg=BG); win.transient(self); win.grab_set()
        preview=image.copy(); preview.thumbnail((900,520)); photo=ImageTk.PhotoImage(preview)
        view=tk.Label(win,image=photo,bg=BG); view.image=photo; view.pack(padx=18,pady=(18,8))
        label(win,"Review this screen. Only if you approve, Bou will send this screenshot and your current task to the configured AI provider to propose one action. The screenshot is not saved.",10,DIM,wraplength=800,justify="left").pack(padx=18,pady=8)
        row=tk.Frame(win,bg=BG); row.pack(pady=(2,16))
        def cancel():
            self.pc_share_window=None; self.pc_image=None; self.pc_stage="waiting"
            self.pc_status.configure(text="Screenshot discarded. Choose Review next screen when you are ready.",fg=DIM)
            win.destroy(); self.update_pc_controls()
        def share():
            self.pc_share_window=None; win.destroy(); self.pc_image=image; self.pc_screen_size=screen_size; self.pc_stage="planning"
            self.pc_status.configure(text="Screenshot approved for one AI plan; no PC action has been taken.",fg=ACCENT)
            run_id=self.pc_run_id; goal=self.pc_goal; settings=self.settings.copy()
            def work():
                try:result=self.engine.plan_pc_action(image,goal,settings)
                except Exception as exc:result={"status":"failed","text":"Request failed ("+type(exc).__name__+")."}
                self.events.put(("pc_plan",(run_id,result)))
            threading.Thread(target=work,name="bou-pc-action-plan",daemon=True).start()
        button(row,"Discard screenshot",cancel).pack(side="left",padx=5)
        button(row,"Share and propose one action",share,True).pack(side="left",padx=5)
        win.protocol("WM_DELETE_WINDOW",cancel); self.pc_share_window=win
    def show_pc_action_review(self,action):
        image=self.pc_image
        if image is None:self.stop_pc_task(); return
        win=tk.Toplevel(self); win.title("Approve one PC action"); win.configure(bg=BG); win.transient(self); win.grab_set()
        preview=image.copy(); preview.thumbnail((900,480)); photo=ImageTk.PhotoImage(preview)
        view=tk.Label(win,image=photo,bg=BG); view.image=photo; view.pack(padx=18,pady=(18,8))
        kind=action["action"]
        if kind=="click":detail=f"Click once at ({action['x']}, {action['y']}) in the reviewed screenshot."
        elif kind=="type":detail="Type exactly: “"+action["text"]+"”"
        elif kind=="press":detail="Press the “"+action["key"]+"” key once."
        else:detail=f"Move to ({action['x']}, {action['y']}) and scroll {action['direction']} {action['amount']} step(s)."
        label(win,"PROPOSED ACTION",9,ACCENT,bold=True).pack(anchor="w",padx=18)
        label(win,detail,11,TXT,wraplength=820,justify="left").pack(anchor="w",padx=18,pady=(5,3))
        label(win,"Why: "+action.get("reason",""),9,DIM,wraplength=820,justify="left").pack(anchor="w",padx=18,pady=(0,8))
        label(win,"Bou will do only this one action and then wait. Check that the action matches your task and that no sensitive screen content is exposed.",9,DIM,wraplength=820,justify="left").pack(anchor="w",padx=18,pady=(0,8))
        row=tk.Frame(win,bg=BG); row.pack(pady=(2,16))
        def cancel():
            self.pc_action_window=None; self.pc_image=None; self.pc_stage="waiting"
            self.pc_status.configure(text="Action declined. Nothing was done. You can review a fresh screen or stop.",fg=DIM)
            win.destroy(); self.update_pc_controls()
        def approve():
            self.pc_action_window=None; win.destroy(); self.pc_stage="acting"
            self.pc_status.configure(text="You approved one action. Bou is sending it to Windows now.",fg=ACCENT)
            run_id=self.pc_run_id; size=image.size; screen_size=self.pc_screen_size
            self.iconify()
            def work():
                try:
                    time.sleep(0.45)
                    result={"ok":True,"text":self.engine.perform_pc_action(action,size,screen_size)}
                except Exception as exc:result={"ok":False,"text":"Action failed ("+type(exc).__name__+")."}
                self.events.put(("pc_action_done",(run_id,result)))
            threading.Thread(target=work,name="bou-approved-pc-action",daemon=True).start()
        button(row,"Decline action",cancel).pack(side="left",padx=5)
        button(row,"Approve this one action",approve,True).pack(side="left",padx=5)
        win.protocol("WM_DELETE_WINDOW",cancel); self.pc_action_window=win
    def stop_pc_task(self):
        if not self.pc_busy:return
        self.engine.cancel()
        for win in (self.pc_share_window,self.pc_action_window):
            if win:
                try:win.grab_release(); win.destroy()
                except tk.TclError:pass
        self.pc_share_window=None; self.pc_action_window=None; self.pc_image=None
        self.pc_busy=False; self.pc_stage="idle"; self.pc_goal=""; self.pc_run_id=None
        self.pc_status.configure(text="PC control stopped. No further action will run.",fg=DIM)
        self.update_pc_controls()
    def refresh_memory(self):
        self.note_list.delete(*self.note_list.get_children())
        notes=self.store.notes()
        for nid,title,_ in notes: self.note_list.insert("","end",iid=nid,values=(title,))
        count=self.store.message_count()
        history_enabled=self.settings.get("use_history",True)
        self.transcript_info.configure(text=str(count)+" chat messages stored locally. Conversation memory is "+("on; recent and relevant excerpts may be sent with chat requests." if history_enabled else "off; the archive stays local."))
        self.memory_count.configure(text=str(count)+" chat messages\n"+str(len(notes))+" saved notes\nConversation memory "+("on" if history_enabled else "off"))
        if hasattr(self,"dashboard_memory"):
            self.dashboard_memory.configure(text=f"{count} conversation messages\n{len(notes)} saved notes\nMemory {('ON' if history_enabled else 'OFF')} · stored on this PC")
    def new_note(self):
        self.selected_note=None; self.note_title.delete(0,"end"); self.note_body.delete("1.0","end")
        self.note_list.selection_remove(self.note_list.selection())
    def select_note(self,event=None):
        selected=self.note_list.selection()
        if not selected:return
        for nid,title,body in self.store.notes():
            if nid==selected[0]:
                self.selected_note=nid; self.note_title.delete(0,"end"); self.note_title.insert(0,title)
                self.note_body.delete("1.0","end"); self.note_body.insert("1.0",body)
    def save_note(self):
        title=self.note_title.get().strip(); body=self.note_body.get("1.0","end").strip()
        if not title or not body:self.notify("নোটের নাম ও লেখা দুটোই দিন।",True); return
        self.selected_note=self.store.save_note(title,body,self.selected_note); self.refresh_memory(); self.notify("নোট এই PC-তে সংরক্ষিত হয়েছে।")
    def delete_note(self):
        if not self.selected_note:return
        if not messagebox.askyesno("Delete note","Delete this saved note from this PC?"):return
        self.store.delete_note(self.selected_note); self.new_note(); self.refresh_memory(); self.notify("Note deleted.")
    def refresh_activity(self):
        self.task_list.delete(*self.task_list.get_children())
        tasks=self.store.tasks()
        for tid,name,status,_ in tasks: self.task_list.insert("","end",iid=tid,values=(name,STATUS.get(status,status)))
        if hasattr(self,"recent_feed"):
            for child in self.recent_feed.winfo_children(): child.destroy()
            visible=tasks
            if self.signal_view=="today":
                if not self.headline_feed.winfo_manager():self.headline_feed.pack(fill="x",before=self.activity_title,padx=13)
                for child in self.headline_feed.winfo_children():child.destroy()
                if self.headlines:
                    for title,url in self.headlines[:4]:
                        link=tk.Button(self.headline_feed,text="•  "+title,command=lambda u=url:webbrowser.open(u),
                            relief="flat",bd=0,bg=NAV,fg=TXT,activebackground=NAV,activeforeground=ACCENT,
                            font=(FONT,8),anchor="w",justify="left",wraplength=218,cursor="hand2")
                        link.pack(fill="x",anchor="w",pady=2)
                else:
                    message="Headlines unavailable. Check your internet connection." if self.headlines_ready else "Loading headlines…"
                    label(self.headline_feed,message,8,DIM,wraplength=218,justify="left").pack(anchor="w",pady=4)
                visible=tasks[:2]
            else:
                if self.headline_feed.winfo_manager():self.headline_feed.pack_forget()
            if self.signal_view=="alerts":visible=[item for item in tasks if item[2] in ("failed","needs_review","stopping")]
            elif self.signal_view=="search":
                label(self.recent_feed,"Type a search topic in the chat box and send it. Bou opens the results in your browser.",8,DIM,wraplength=218,justify="left").pack(anchor="w",pady=5)
                visible=[]
            if self.signal_view=="map":
                label(self.recent_feed,"This map shows Bou's local task history only. It does not use GPS or track device location.",8,DIM,wraplength=218,justify="left").pack(anchor="w",pady=(3,8))
            if not visible and self.signal_view not in ("today","search"):
                empty="No alerts. Recent task issues will appear here." if self.signal_view=="alerts" else "No requests yet. Your local activity will appear here."
                label(self.recent_feed,empty,8,DIM,wraplength=218,justify="left").pack(anchor="w",pady=5)
            for _,name,status,_detail in (visible[:2] if self.signal_view=="today" else visible[:4]):
                row=tk.Frame(self.recent_feed,bg=NAV); row.pack(fill="x",pady=4)
                led=ACCENT if status in ("completed","submitted") else RED if status=="failed" else BLUE
                dot=tk.Canvas(row,width=9,height=9,bg=NAV,highlightthickness=0); dot.pack(side="left",anchor="n",pady=4)
                dot.create_oval(1,1,8,8,fill=led,outline="")
                copy=tk.Frame(row,bg=NAV); copy.pack(side="left",fill="x",expand=True,padx=(6,0))
                label(copy,name[:66],8,TXT,wraplength=210,justify="left").pack(anchor="w")
                label(copy,STATUS.get(status,status).upper(),7,DIM).pack(anchor="w",pady=(2,0))
        if hasattr(self,"town_canvas") and self.town_canvas.winfo_exists():self.draw_town()
    def show_task_detail(self,event=None):
        selected=self.task_list.selection()
        if selected:
            for tid,name,status,detail in self.store.tasks():
                if tid==selected[0]:self.task_detail.configure(text=detail or STATUS.get(status,status))
    def refresh_voice_controls(self):
        if self.voice_session_active:
            if self.voice_session_preparing:
                button_text="Mic: STARTING · stop"; page_text="Stop live conversation"
                status="Preparing offline Whisper. The microphone starts after the local model is ready."
            else:
                button_text="Mic: ON · pause"; page_text="Pause live conversation"
                status="Microphone is active. Speak naturally; Bou will transcribe and answer aloud."
        else:
            button_text="Mic: OFF"; page_text="Start live conversation"
            provider=self.settings.get("voice_provider","local_whisper")
            if provider=="wispr" and not self.engine.wispr_api_key:
                status="Add an approved Wispr Flow API key in Settings to start live listening."
            elif provider=="local_whisper":status="Offline Whisper is selected. Speech stays on this PC; first use downloads its model once."
            elif provider=="google":status="Google Speech Recognition is selected; microphone phrases are sent to Google."
            else:status="Microphone is off."
        for control in self.live_voice_buttons:
            try:control.configure(text=page_text if control is self.live_voice_buttons[-1] else button_text)
            except tk.TclError:pass
        if hasattr(self,"live_voice_status"):
            try:self.live_voice_status.configure(text=status,fg=ACCENT if self.voice_session_active else DIM)
            except tk.TclError:pass
    def startup_voice(self):
        if self.closing:return
        self.refresh_voice_controls()
        if not self.settings.get("speech_out",True):
            if self.settings.get("voice_auto_start",True):self.start_voice_session()
            return
        self.voice_busy=True; self.voice_pause.set()
        self.set_phase("Welcome","Bou is starting your voice session.")
        def greet():
            try:self.engine.speak("Welcome to Bou. কেমন আছেন?"); self.events.put(("welcome_done",None))
            except Exception as exc:self.events.put(("welcome_error",str(exc)[:120]))
        threading.Thread(target=greet,daemon=True).start()
    def start_voice_session(self):
        if self.voice_session_active:return True
        provider=self.settings.get("voice_provider","local_whisper")
        if not mk.sd or (provider!="local_whisper" and not mk.sr):
            self.set_phase("Microphone unavailable","Install sounddevice and SpeechRecognition to use voice chat.")
            self.notify("Microphone packages are missing. Text chat is still available.",True); return False
        if provider=="wispr" and not self.engine.wispr_api_key:
            self.refresh_voice_controls(); self.set_phase("Wispr Flow setup needed","Add an approved Wispr Flow API key in Settings before live transcription.")
            self.notify("Wispr Flow API key required. Bou will not send voice audio to another transcription service.",True); return False
        self.voice_session_stop.clear(); self.voice_pause.clear(); self.voice_session_active=True
        self.voice_session_preparing=provider=="local_whisper"
        self.refresh_voice_controls()
        if provider=="local_whisper":self.set_phase("Preparing offline Whisper","The one-time model setup stays on this PC. The microphone starts when it is ready.")
        else:self.set_phase("Starting microphone","Connecting to the selected speech-to-text service.")
        stop_event=self.voice_session_stop; pause_event=self.voice_pause; language=self.settings.get("language","bn-BD")
        def listen():
            try:
                if provider=="local_whisper":
                    self.events.put(("voice_session_loading",None))
                    self.engine.prepare_transcriber(provider)
                    if stop_event.is_set():return
                self.engine.listen_continuously(stop_event,pause_event,language,provider,self.events)
            except Exception as exc:self.events.put(("voice_session_error",str(exc)[:180]))
        threading.Thread(target=listen,daemon=True).start()
        return True
    def stop_voice_session(self,notify=True):
        self.voice_session_stop.set(); self.voice_pause.set(); self.voice_session_active=False
        self.voice_session_preparing=False
        self.refresh_voice_controls(); self.set_phase("Ready","Microphone is off.")
        if notify:self.notify("Live microphone paused.")
    def toggle_voice_session(self):
        if self.voice_session_active:self.stop_voice_session()
        else:self.start_voice_session()
    def resume_voice_after_speech(self):
        if self.voice_session_active and not self.voice_busy and not self.busy:self.voice_pause.clear()
    def update_voice_provider_hint(self,*_):
        provider=self.voice_provider_var.get()
        descriptions={
            "Local Whisper (offline)":"The multilingual Whisper model downloads once (~500 MB). Microphone audio is transcribed on this PC; transcript text is sent to the configured AI provider for replies.",
            "Wispr Flow API":"Captured phrases are sent to Wispr Flow for transcription and require approved API access plus a key.",
            "Google Speech Recognition":"Captured phrases are sent to Google Speech Recognition for transcription.",
        }
        self.voice_provider_hint.configure(text=descriptions.get(provider,""))
    def apply_wispr_key(self):
        key=self.wispr_key_entry.get().strip()
        if not key:self.notify("Paste your approved Wispr Flow API key first.",True); return
        self.engine.wispr_api_key=key; self.wispr_key_entry.delete(0,"end")
        self.notify("Wispr Flow key is active for this session.")
        if self.settings.get("voice_provider","local_whisper")=="wispr" and self.settings.get("voice_auto_start",True):self.start_voice_session()
    def save_wispr_api_key(self):
        key=self.wispr_key_entry.get().strip()
        try:self.engine.save_wispr_api_key(key)
        except Exception as exc:self.notify("Wispr Flow key could not be saved ("+str(exc)[:120]+").",True); return
        self.wispr_key_entry.delete(0,"end"); self.notify("Wispr Flow API key saved in Windows Credential Manager.")
        if self.settings.get("voice_provider","local_whisper")=="wispr" and self.settings.get("voice_auto_start",True):self.start_voice_session()
    def remove_saved_wispr_api_key(self):
        if not messagebox.askyesno("Remove Wispr Flow API key","Remove Bou's saved Wispr Flow key from this Windows account?"):return
        try:self.engine.remove_saved_wispr_api_key()
        except Exception as exc:self.notify("Wispr Flow key could not be removed ("+str(exc)[:120]+").",True); return
        if self.voice_session_active and self.settings.get("voice_provider")=="wispr":self.stop_voice_session(notify=False)
        self.refresh_voice_controls(); self.notify("Saved Wispr Flow API key removed.")
    def save_settings(self):
        if self.busy or self.recording or self.voice_busy:self.notify("Finish the current task before changing preferences.",True); return
        model=self.model_entry.get().strip()
        if not model or len(model)>180 or "/" not in model:self.notify("Use an OpenRouter model ID such as google/gemini-2.5-flash.",True); return
        backend_mode=self.backend_mode_var.get(); service_url=self.service_url_entry.get().strip().rstrip("/"); service_token=self.service_token_entry.get().strip()
        if backend_mode not in ("local","service"):self.notify("Choose local or service mode.",True); return
        if backend_mode=="service" and (not service_url.startswith(("https://","http://")) or not service_token):
            self.notify("Service mode needs a valid URL and customer access token.",True); return
        provider={"Local Whisper (offline)":"local_whisper","Wispr Flow API":"wispr","Google Speech Recognition":"google"}.get(self.voice_provider_var.get(),"local_whisper")
        was_listening=self.voice_session_active
        if was_listening:self.stop_voice_session(notify=False)
        self.settings.update(mode=self.mode_var.get(),language=self.lang_var.get(),model=model,speech_out=self.speech_var.get(),voice_auto_start=self.voice_auto_var.get(),voice_provider=provider,use_memory=self.memory_var.get(),use_history=self.history_var.get(),backend_mode=backend_mode,service_url=service_url,service_token=service_token)
        mk.state["speech_out"]=bool(self.settings["speech_out"])
        self.store.save_settings(self.settings); self.update_connection(); self.refresh_memory(); self.refresh_voice_controls(); self.notify("Preferences saved on this PC.")
        if self.settings["voice_auto_start"] and (was_listening or not self.voice_busy):self.after(500,self.start_voice_session)
    def save_workers(self):
        if self.busy or self.recording or self.voice_busy:
            self.notify("Finish the current task before changing workers.",True); return
        mode=self.worker_mode_var.get()
        if mode not in ("auto","always","off"):
            self.notify("Choose Auto, Always or Off for worker mode.",True); return
        manager_name=self.manager_name_entry.get().strip()
        manager_instructions=self.manager_instructions.get("1.0","end").strip()
        if not manager_name or not manager_instructions:
            self.notify("The manager needs a name and instructions.",True); return
        workers=[]
        for control in self.worker_controls:
            name=control["name"].get().strip()
            instructions=control["instructions"].get("1.0","end").strip()
            if control["enabled"].get() and (not name or not instructions):
                self.notify("Every enabled worker needs a name and instructions.",True); return
            workers.append({"id":control["id"],"name":name[:50] or control["id"],
                "instructions":instructions[:1400],"enabled":bool(control["enabled"].get())})
        self.worker_names={worker["id"]:worker["name"] for worker in workers}
        self.worker_names["__manager__"]=manager_name
        self.settings["worker_mode"]=mode; self.settings["manager"]={"name":manager_name[:50],"instructions":manager_instructions[:1400]}; self.settings["workers"]=workers
        self.store.save_settings(self.settings); self.update_worker_summary()
        self.notify("Worker setup saved on this PC.")
    def update_worker_summary(self):
        mode=self.settings.get("worker_mode","auto").title()
        workers=self.settings.get("workers",[])
        count=sum(1 for worker in workers if isinstance(worker,dict) and worker.get("enabled",False)) if isinstance(workers,list) else 0
        if hasattr(self,"workers_dashboard"):
            self.workers_dashboard.configure(text=f"Manager + {count} workers · {mode}")
    def apply_key(self):
        if self.busy:self.notify("Finish the current task first.",True); return
        value=self.key_entry.get().strip()
        if not value:self.notify("Paste a key first.",True);return
        self.engine.api_key=value; self.key_entry.delete(0,"end"); self.update_connection(); self.notify("Key applied for this session. It was not written to a file.")
    def save_api_key(self):
        if self.busy:self.notify("Finish the current task first.",True); return
        value=self.key_entry.get().strip()
        if not value:self.notify("Paste a key first.",True);return
        try:self.engine.save_api_key(value)
        except Exception as exc:self.notify("Secure key storage failed ("+type(exc).__name__+").",True);return
        self.key_entry.delete(0,"end"); self.update_connection(); self.notify("OpenRouter key saved in this Windows account's Credential Manager.")
    def remove_saved_api_key(self):
        if not messagebox.askyesno("Remove saved API key","Remove Bou's saved OpenRouter key from this Windows account? This does not affect service-mode keys."):return
        try:self.engine.remove_saved_api_key()
        except Exception as exc:self.notify("Saved key could not be removed ("+type(exc).__name__+").",True);return
        self.update_connection(); self.notify("Saved OpenRouter key removed.")
    def test_connection(self):
        self.show_page("assistant"); self.submit("Reply briefly: Connection successful.")
    def poll(self):
        if self.closing:return
        try:
            while True:
                kind,data=self.events.get_nowait()
                if kind=="result":
                    tid,result=data
                    if tid!=self.current_task:continue
                    if self.engine.cancel_event.is_set():result={"status":"cancelled","text":""}
                    status=result["status"]; text=result.get("text","")
                    self.store.task(tid,self.task_label,status,text)
                    self.busy=False; self.current_task=None; self.send_button.configure(state="normal")
                    self.refresh_activity()
                    self.set_phase(STATUS.get(status,status),text[:110] if status=="failed" else "Ready for your next request.")
                    self.notify("Request cancelled. No late answer was added." if status=="cancelled" else ("Finished." if status in ("completed","submitted") else "Could not finish this request."),status=="failed")
                    if text:self.append_chat("assistant",text)
                    if status=="completed" and text and self.settings["speech_out"]:
                        self.voice_busy=True; self.voice_pause.set(); self.set_phase("Speaking","Text reply is already available.")
                        def speak(reply=text):
                            try:self.engine.speak(reply); self.events.put(("speech_done",None))
                            except Exception:self.events.put(("speech_error",None))
                        threading.Thread(target=speak,daemon=True).start()
                    elif self.voice_session_active:self.after(500,self.resume_voice_after_speech)
                elif kind=="worker_status":
                    tid,worker_id,state=data
                    if tid!=self.current_task:continue
                    if worker_id=="__manager__":
                        captions={"working":"ASSIGNING…","done":"ASSIGNED","failed":"DEFAULT ROUTE"}
                        self.manager_status_label.configure(text=captions.get(state,"READY"),fg=ACCENT if state in ("working","done") else DIM)
                        manager_name=self.worker_names.get("__manager__","Manager")
                        self.state_detail.configure(text=f"{manager_name} is routing the request.")
                        continue
                    if worker_id=="__coordinator__":
                        self.state_detail.configure(text="Bou is combining the worker reports.")
                        continue
                    label_widget=self.worker_status_labels.get(worker_id)
                    if label_widget:
                        captions={"queued":"QUEUED","working":"WORKING…","done":"DONE","failed":"FAILED"}
                        label_widget.configure(text=captions.get(state,"READY"),fg=RED if state=="failed" else ACCENT if state in ("working","done") else DIM)
                        if state in ("queued","working"):
                            worker_name=self.worker_names.get(worker_id,"Worker")
                            self.state_detail.configure(text=f"{worker_name} is working in the parallel team.")
                elif kind=="phase":
                    if not self.engine.cancel_event.is_set():self.set_phase(data)
                elif kind=="headlines":
                    self.headlines=data; self.headlines_ready=True
                    if self.signal_view=="today":self.refresh_activity()
                elif kind=="camera_frame":
                    request_id,image,error=data
                    if request_id!=self.camera_capture_id:continue
                    self.camera_capture_id=None; self.camera_button.configure(state="normal")
                    if error:
                        self.camera_status.configure(text="Camera off · capture failed",fg=RED)
                        self.notify("ক্যামেরা frame নেওয়া যায়নি: "+error,True)
                    else:
                        self.camera_status.configure(text="Camera off · review frame",fg=DIM)
                        self.show_camera_review(image)
                elif kind=="pc_screen_frame":
                    run_id,image,screen_size,error=data
                    try:self.deiconify(); self.lift()
                    except tk.TclError:pass
                    if not self.pc_busy or run_id!=self.pc_run_id:continue
                    if error:
                        self.pc_stage="waiting"; self.pc_status.configure(text="Screenshot capture failed ("+error+").",fg=RED)
                        self.update_pc_controls()
                    else:
                        self.pc_image=image; self.pc_screen_size=screen_size
                        self.show_pc_share_review(image,screen_size)
                elif kind=="pc_plan":
                    run_id,result=data
                    if not self.pc_busy or run_id!=self.pc_run_id:continue
                    if result.get("status")=="completed" and isinstance(result.get("action"),dict):
                        action=result["action"]
                        if action.get("action")=="done":
                            self.pc_busy=False; self.pc_stage="idle"; self.pc_goal=""; self.pc_image=None; self.pc_run_id=None
                            self.pc_status.configure(text="Task complete: "+action.get("summary","Bou reports the task is complete."),fg=ACCENT)
                            self.update_pc_controls()
                        else:self.show_pc_action_review(action)
                    else:
                        self.pc_image=None; self.pc_stage="waiting"
                        status="blocked" if result.get("status")=="blocked" else "failed"
                        self.pc_status.configure(text=result.get("text") or result.get("action",{}).get("reason","Bou could not propose a safe step."),fg=RED)
                        if status=="blocked":
                            self.pc_busy=False; self.pc_stage="idle"; self.pc_goal=""; self.pc_run_id=None
                            self.pc_status.configure(text="Bou paused this task for your direct attention.",fg=RED)
                        self.update_pc_controls()
                elif kind=="pc_action_done":
                    run_id,result=data
                    try:self.deiconify(); self.lift()
                    except tk.TclError:pass
                    if not self.pc_busy or run_id!=self.pc_run_id:continue
                    self.pc_image=None; self.pc_stage="waiting"
                    self.pc_status.configure(text=result.get("text","Action finished.")+" Select Review next screen for another step.",fg=ACCENT if result.get("ok") else RED)
                    self.update_pc_controls()
                elif kind=="welcome_done":
                    self.voice_busy=False; self.set_phase("Ready","Welcome to Bou.")
                    if self.settings.get("voice_auto_start",True):self.after(700,self.start_voice_session)
                elif kind=="welcome_error":
                    self.voice_busy=False; self.set_phase("Ready","Text and microphone controls are available.")
                    self.notify("Bou could not play the startup greeting ("+str(data)+").",True)
                    if self.settings.get("voice_auto_start",True):self.after(700,self.start_voice_session)
                elif kind=="voice_session_ready":
                    if self.voice_session_active:
                        self.voice_session_preparing=False; self.refresh_voice_controls(); self.set_phase("Listening","Speak naturally. Pause between phrases and Bou will answer aloud.")
                        provider=self.settings.get("voice_provider","local_whisper")
                        notice="Offline Whisper is ready. Speak naturally; microphone audio stays on this PC." if provider=="local_whisper" else ("Live microphone is on. Google Speech Recognition receives each captured phrase." if provider=="google" else "Live microphone is on. Speak naturally; Bou will transcribe and respond.")
                        self.notify(notice)
                elif kind=="voice_session_loading":
                    if self.voice_session_active:
                        self.voice_session_preparing=True; self.refresh_voice_controls()
                        self.set_phase("Preparing offline Whisper","Downloading or loading the local model. No microphone audio is sent.")
                elif kind=="voice_session_stopped":
                    if self.voice_session_active:self.voice_session_active=False; self.voice_session_preparing=False; self.refresh_voice_controls()
                elif kind=="voice_session_error":
                    self.voice_session_active=False; self.voice_session_preparing=False; self.voice_session_stop.set(); self.voice_pause.set(); self.refresh_voice_controls()
                    self.set_phase("Microphone unavailable",str(data)[:140]); self.notify("Live microphone could not start: "+str(data)[:140],True)
                elif kind=="voice_auto_status":
                    if self.voice_session_active:self.set_phase("Transcribing",str(data))
                elif kind=="voice_auto_transcript":
                    if not self.voice_session_active:continue
                    self.voice_pause.set()
                    if not data:self.after(350,self.resume_voice_after_speech); continue
                    self.transcript.delete("1.0","end"); self.transcript.insert("1.0",data)
                    self.show_page("assistant")
                    if not self.submit(data):self.after(700,self.resume_voice_after_speech)
                elif kind=="voice_auto_empty":
                    if self.voice_session_active:self.after(400,self.resume_voice_after_speech)
                elif kind=="voice_auto_error":
                    if not self.voice_session_active:continue
                    detail=str(data)[:180]; self.notify("Voice transcription failed: "+detail,True)
                    if any(word in detail.lower() for word in ("rejected the api key","access is not enabled","usage limit","api key is missing")):
                        self.stop_voice_session(notify=False); self.set_phase("Wispr Flow setup needed",detail)
                    else:self.after(1800,self.resume_voice_after_speech)
                elif kind in ("transcript","voice_error"):
                    self.recording=False; self.record_button.configure(text="Record one phrase",state="normal")
                    cancelled=self.engine.cancel_event.is_set()
                    self.set_phase("Ready" if kind=="transcript" or cancelled else "Failed")
                    if kind=="transcript" and data and not cancelled:
                        self.transcript.delete("1.0","end"); self.transcript.insert("1.0",data); self.show_page("assistant"); self.submit(data)
                    elif kind=="voice_error" and not cancelled:self.notify("Voice recognition failed ("+data+"). Text chat still works.",True)
                    else:self.notify("Recording cancelled.")
                elif kind in ("speech_done","speech_error"):
                    self.voice_busy=False; self.set_phase("Ready")
                    if kind=="speech_error":self.notify("Voice service unavailable. Your text reply is available.",True)
                    if self.voice_session_active:self.voice_pause.set(); self.after(800,self.resume_voice_after_speech)
        except queue.Empty:pass
        self.after(80,self.poll)
    def fetch_headlines(self):
        def worker():
            items=[]
            try:
                request=Request("https://feeds.bbci.co.uk/news/world/rss.xml",headers={"User-Agent":"BouAssistant/1.9.1 (public RSS headlines)"})
                with urlopen(request,timeout=8) as response:raw=response.read(1_500_000)
                root=ET.fromstring(raw)
                for item in root.findall("./channel/item")[:5]:
                    title=(item.findtext("title") or "").strip()[:180]
                    link=(item.findtext("link") or "").strip()
                    if title and link.startswith(("https://www.bbc.co.uk/","https://www.bbc.com/")):items.append((title,link))
            except Exception:items=[]
            self.events.put(("headlines",items))
        threading.Thread(target=worker,name="bou-headlines",daemon=True).start()
    def animate(self):
        if self.closing:return
        self.phase+=0.045
        active=self.busy or self.recording or self.voice_busy
        for c in self.orbs:
            if not c.winfo_ismapped():continue
            w,h=c.winfo_width(),c.winfo_height(); cx,cy=w/2,h/2
            r=min(w,h)*.27; c.delete("all")
            for n in range(5,0,-1):
                radius=r+n*5+math.sin(self.phase+n*.35)*(3 if active else 1.2)
                c.create_oval(cx-radius,cy-radius,cx+radius,cy+radius,outline=["#35202a","#562d38","#813e49","#b84f54",ACCENT][5-n],width=2)
            c.create_oval(cx-r,cy-r,cx+r,cy+r,fill="#351f29",outline="#f19887",width=1)
            for n in range(7):
                x=cx+(n-3)*7; d=4+abs(math.sin(self.phase*2+n*.8))*(18 if active else 9)
                c.create_line(x,cy-d,x,cy+d,fill=ACCENT,width=3)
        if hasattr(self,"avatar_canvas") and self.avatar_canvas.winfo_ismapped(): self.draw_avatar(active)
        if hasattr(self,"town_canvas") and self.town_canvas.winfo_ismapped(): self.draw_town()
        if hasattr(self,"globe_canvas") and self.globe_canvas.winfo_ismapped(): self.draw_globe()
        self.after(60,self.animate)
    def draw_globe(self):
        c=self.globe_canvas; w=max(c.winfo_width(),170); h=max(c.winfo_height(),160)
        c.delete("all"); cx=w/2; cy=h*.47; r=min(w*.38,h*.37)
        if self.map_mode=="2D":
            c.create_rectangle(cx-r*1.42,cy-r*.67,cx+r*1.42,cy+r*.67,outline="#344252",width=1)
            for i in range(1,5):
                x=cx-r*1.42+i*(r*2.84/5); c.create_line(x,cy-r*.67,x,cy+r*.67,fill="#1c2938")
            for i in range(1,3):
                y=cy-r*.67+i*(r*1.34/3); c.create_line(cx-r*1.42,y,cx+r*1.42,y,fill="#1c2938")
            for i,(dx,dy) in enumerate(((-.9,-.25),(-.28,.31),(.38,-.18),(.92,.25))):
                x=cx+dx*r; y=cy+dy*r; pulse=2.5+1.4*(1+math.sin(self.phase*2+i))
                c.create_oval(x-pulse,y-pulse,x+pulse,y+pulse,fill=ACCENT if i==0 else BLUE,outline="")
            c.create_text(cx,min(h-6,cy+r*.88),text="LOCAL TASK MAP  ·  NO GPS",fill=DIM,font=(FONT,7,"bold"))
            return
        c.create_oval(cx-r,cy-r,cx+r,cy+r,outline="#2a5367",width=1)
        c.create_oval(cx-r*.52,cy-r,cx+r*.52,cy+r,outline="#1b3a50",width=1)
        c.create_oval(cx-r*.19,cy-r,cx+r*.19,cy+r,outline="#173246",width=1)
        for scale in (.34,.67):
            ry=r*scale
            c.create_oval(cx-r,cy-ry,cx+r,cy+ry,outline="#173246",width=1)
        angle=self.phase*1.15
        points=[]
        for i in range(39):
            a=2*math.pi*i/39+angle
            x=cx+math.cos(a)*r*.91; y=cy+math.sin(a)*r*.91
            points.append((x,y))
            if i%2==0:c.create_oval(x-1.4,y-1.4,x+1.4,y+1.4,fill="#397688",outline="")
        for index in (3,14,25,34):
            x,y=points[index]; pulse=3+1.5*(1+math.sin(self.phase*2+index))
            c.create_oval(x-pulse,y-pulse,x+pulse,y+pulse,fill=ACCENT if index==14 else BLUE,outline="")
        c.create_text(cx,min(h-6,cy+r+10),text="LOCAL ACTIVITY  ·  NO LOCATION TRACKING",fill=DIM,font=(FONT,7,"bold"))
    def draw_town(self):
        c=self.town_canvas; w=max(c.winfo_width(),360); h=max(c.winfo_height(),58); c.delete("all")
        floor=h-13
        c.create_line(16,floor,w-16,floor,fill="#344252",width=1)
        agents=[("MANAGER",getattr(self,"manager_status_label",None),"#ed6a63")]
        for item in getattr(self,"worker_controls",[])[:3]:
            name=item["name"].get().strip() or "Worker"
            status=self.worker_status_labels.get(item["id"])
            agents.append((name,status,"#d5a47e"))
        step=(w-52)/max(1,len(agents))
        for i,(name,status_widget,tint) in enumerate(agents):
            x=26+step*(i+.5); bob=math.sin(self.phase*2+i*1.2)*2 if self.gesture_enabled else 0
            state=status_widget.cget("text") if status_widget and status_widget.winfo_exists() else "READY"
            active=state.casefold() in ("working","running")
            light=ACCENT if active else ("#7fb79a" if state.casefold() in ("ready","done") else BLUE)
            c.create_rectangle(x-23,floor-17,x+23,floor-7,fill="#202b38",outline="#3b4958")
            c.create_rectangle(x-3,floor-28+bob,x+3,floor-17+bob,fill=tint,outline="")
            c.create_rectangle(x-8,floor-43+bob,x+8,floor-28+bob,fill=tint,outline="")
            c.create_rectangle(x-6,floor-51+bob,x+6,floor-43+bob,fill="#f0c5a8",outline="")
            c.create_rectangle(x+11,floor-49+bob,x+15,floor-45+bob,fill=light,outline="")
            c.create_text(x,floor-58,text=name[:13].upper(),fill=TXT,font=(FONT,7,"bold"))
            c.create_text(x,floor-4,text=state.upper()[:10],fill=light,font=(FONT,6,"bold"))
    def draw_avatar(self,active=False):
        c=self.avatar_canvas; w=max(c.winfo_width(),380); h=max(c.winfo_height(),300)
        c.delete("all"); cx=w*.51; head_y=h*.34; head_rx=min(w*.12,62); head_ry=min(h*.19,70)
        # Subtle orbital rings frame the particle character.
        orbit_y=h*.56; orbit_rx=min(w*.35,225); orbit_ry=min(h*.15,60)
        c.create_oval(cx-orbit_rx,orbit_y-orbit_ry,cx+orbit_rx,orbit_y+orbit_ry,outline="#4b2a34",width=1)
        c.create_oval(cx-orbit_rx*.88,orbit_y-orbit_ry*.56,cx+orbit_rx*.88,orbit_y+orbit_ry*.56,
                      outline="#63333d",width=1,dash=(4,7))
        # The original Bou character is drawn from small particles that move with the live UI.
        palette=["#542f38","#81414a","#c05558","#ef7770","#f4b18a"]
        for i in range(150):
            u=((i*47)%149)/149; a=i*2.399963
            rr=math.sqrt(u); x=cx+math.cos(a)*head_rx*rr; y=head_y+math.sin(a)*head_ry*rr
            twinkle=0.7+0.6*(.5+.5*math.sin(self.phase*2+i*1.7))
            d=(1.4+(i%4)*.45)*twinkle
            c.create_oval(x-d,y-d,x+d,y+d,fill=palette[(i*7)%len(palette)],outline="")
        shoulder_y=h*.55; torso_bottom=h*.90
        # A narrow particle neck joins the head to the shoulders.
        for i in range(58):
            v=((i*31)%59)/58; yy=head_y+head_ry*.72+v*(shoulder_y-head_y-head_ry*.70)
            half_width=14+12*v; across=(((i*43)%61)/30)-1; xx=cx+across*half_width
            d=1.3+(i%4)*.42
            c.create_oval(xx-d,yy-d,xx+d,yy+d,fill=palette[(i*5+1)%len(palette)],outline="")
        for i in range(220):
            v=((i*61)%223)/222; yy=shoulder_y+(torso_bottom-shoulder_y)*v
            spread=(30+min(1,max(0,(v-.10)/.90))*min(w*.27,165))*math.sqrt(max(.05,1-((v-.54)/.66)**2))
            across=(((i*79)%227)/113)-1
            xx=cx+across*spread
            shimmer=.7+.65*(.5+.5*math.sin(self.phase*1.7+i*.91))
            d=(1.2+(i%5)*.38)*shimmer
            c.create_oval(xx-d,yy-d,xx+d,yy+d,fill=palette[(i*3+2)%len(palette)],outline="")
        # Delicate luminous eyes make the central silhouette read as a companion.
        eye_y=head_y-1; eye_dx=head_rx*.30
        for eye_x in (cx-eye_dx,cx+eye_dx):
            c.create_oval(eye_x-2.4,eye_y-2.4,eye_x+2.4,eye_y+2.4,fill="#ffe0cc",outline="")
            c.create_oval(eye_x-5,eye_y-5,eye_x+5,eye_y+5,outline="#8d4b50",width=1)
        # Fine links and a soft chest core add depth without using a copied brand asset.
        for i in range(22):
            a=self.phase*.45+i*math.tau/22
            x=cx+math.cos(a)*orbit_rx*.76; y=orbit_y+math.sin(a)*orbit_ry*.66
            c.create_oval(x-1.5,y-1.5,x+1.5,y+1.5,fill="#9a5158",outline="")
        pulse=8+3*(1+math.sin(self.phase*(3 if active else 1.4)))
        c.create_oval(cx-pulse*2,shoulder_y+42-pulse*2,cx+pulse*2,shoulder_y+42+pulse*2,outline="#8e454f",width=1)
        c.create_oval(cx-pulse,shoulder_y+42-pulse,cx+pulse,shoulder_y+42+pulse,fill=ACCENT,outline="")
        c.create_text(cx,h*.965,text="BOU  ·  READY TO LISTEN",fill=DIM,font=(FONT,8,"bold"))
    def stats(self):
        if self.closing:return
        if psutil:
            try:self.device_label.configure(text="CPU "+str(round(psutil.cpu_percent()))+"% · RAM "+str(round(psutil.virtual_memory().percent))+"%")
            except Exception:self.device_label.configure(text="Device statistics unavailable")
        else:self.device_label.configure(text="Device statistics unavailable")
        self.after(2500,self.stats)
    def on_close(self):
        self.closing=True; self.voice_session_stop.set(); self.voice_pause.set(); self.engine.cancel()
        if self.current_task:self.store.task(self.current_task,self.task_label,"needs_review","Closed while a request was active; it will not be retried automatically.")
        self.store.close(); self.destroy()

if __name__=="__main__":
    try:App().mainloop()
    except Exception as exc:
        try:messagebox.showerror("বউ","Could not start Bou ("+type(exc).__name__+"). Run the launcher from the original Ai assistent folder.")
        except Exception:pass
        raise
