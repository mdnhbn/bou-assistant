# -*- coding: utf-8 -*-
"""Bou (বউ): an original desktop interface for the user's existing Makima engine.
The original engine attribution remains Md Mehrab Hasan. UI extension: 2026.
"""
import os,sys,json,math,time,uuid,queue,threading,logging
from pathlib import Path
import tkinter as tk
from tkinter import ttk,messagebox,filedialog
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

BG="#0a101c"; NAV="#0c1422"; CARD="#121e30"; CARD2="#17263c"; LINE="#243650"
TXT="#edf4ff"; DIM="#9bacc5"; ACCENT="#73e0d1"; BLUE="#8badff"; RED="#ff8f9f"
FONT="Segoe UI"; BNFONT="Nirmala UI"
PAGES=[("assistant","Assistant"),("workers","Workers"),("voice","Voice studio"),("memory","Memory"),("activity","Activity"),("settings","Settings")]
STATUS={"completed":"Completed","failed":"Failed","running":"Running","submitted":"Sent to Windows","cancelled":"Cancelled","stopping":"Stopping","needs_review":"Needs review"}

def label(parent,text,size=11,color=TXT,bg=None,bold=False,**kwargs):
    return tk.Label(parent,text=text,font=(FONT,size,"bold" if bold else "normal"),fg=color,bg=bg or parent.cget("bg"),**kwargs)
def button(parent,text,command,primary=False,**kwargs):
    return tk.Button(parent,text=text,command=command,relief="flat",bd=0,padx=15,pady=10,cursor="hand2",
        bg=ACCENT if primary else CARD2,fg=BG if primary else TXT,activebackground="#94f0e3" if primary else LINE,
        activeforeground=BG if primary else TXT,font=(FONT,10,"bold"),**kwargs)
def textinput(parent,height=3):
    return tk.Text(parent,height=height,bg=CARD2,fg=TXT,insertbackground=ACCENT,relief="flat",bd=0,
        font=(BNFONT,11),padx=12,pady=10,wrap="word",selectbackground=LINE)
def entry(parent):
    return tk.Entry(parent,bg=CARD2,fg=TXT,insertbackground=ACCENT,relief="flat",font=(FONT,11))
class App(tk.Tk):
    def __init__(self,store=None,engine=None):
        super().__init__()
        self.title("বউ — AI Assistant 1.4.0")
        self.geometry("1600x920+40+40")
        self.minsize(1180,760)
        try:self.state("zoomed")
        except Exception:pass
        self.configure(bg=BG)
        self.store=store or Store()
        self.store.recover()
        self.settings=self.store.settings()
        self.engine=engine or Engine()
        self.events=queue.Queue()
        self.busy=False; self.recording=False; self.voice_busy=False; self.closing=False
        self.current_task=None; self.phase=0; self.orbs=[]; self.page="assistant"; self.selected_note=None
        self.task_label=""; self.preview_photo=None
        self.setup_style()
        self.build_sidebar()
        self.build_inspector()
        self.host=tk.Frame(self,bg=BG); self.host.pack(side="left",fill="both",expand=True,padx=24,pady=20)
        self.build_header()
        self.pages={}
        self.body=tk.Frame(self.host,bg=BG); self.body.pack(fill="both",expand=True)
        for key,_ in PAGES:
            f=tk.Frame(self.body,bg=BG); self.pages[key]=f
        self.build_assistant(); self.build_workers(); self.build_voice(); self.build_memory(); self.build_activity(); self.build_settings()
        self.show_page("assistant")
        for role,text in self.store.messages(): self.append_chat(role,text,save=False)
        self.refresh_memory(); self.refresh_activity(); self.update_connection()
        self.after(80,self.poll); self.after(60,self.animate); self.after(1000,self.stats)
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
        icons={"assistant":"⌂","workers":"⚒","voice":"◖","memory":"◈","activity":"◷","settings":"⚙"}
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
        tabs=tk.Frame(side,bg=NAV); tabs.pack(fill="x",padx=12,pady=(0,10))
        for title,key in [("VOICE","voice"),("AGENT","assistant"),("TEAM","workers"),("NOTES","memory")]:
            b=tk.Button(tabs,text=title,command=lambda k=key:self.show_page(k),relief="flat",bd=0,
                bg=CARD2 if key=="assistant" else NAV,fg=ACCENT if key=="assistant" else DIM,
                activebackground=CARD2,activeforeground=ACCENT,font=(FONT,8,"bold"),padx=15,pady=9)
            b.pack(side="left",expand=True,fill="x",padx=2)
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
        self.page_title=label(row,"BOU  /  YOUR ASSISTANT",14,bold=True)
        self.page_title.pack(side="left")
        label(row,"PERSONAL AI  ·  PRIVATE SESSION",8,ACCENT).pack(side="right")
        self.banner=label(self.host,"Ready when you are. আপনার নির্দেশ লিখুন।",9,DIM,anchor="w",wraplength=900,justify="left")
        self.banner.pack(fill="x",pady=(0,10))
    def new_orb(self,parent,height):
        c=tk.Canvas(parent,bg=CARD,highlightthickness=0,height=height)
        self.orbs.append(c)
        return c
    def build_assistant(self):
        f=self.pages["assistant"]
        layout=tk.Frame(f,bg=BG); layout.pack(fill="both",expand=True)
        left=tk.Frame(layout,bg=NAV,width=245,highlightthickness=1,highlightbackground=LINE)
        left.pack(side="left",fill="y",padx=(0,12)); left.pack_propagate(False)
        label(left,"SESSION  /  SIGNAL",9,ACCENT,bold=True).pack(anchor="w",padx=15,pady=(15,4))
        label(left,"Local activity monitor",9,DIM).pack(anchor="w",padx=15)
        self.globe_canvas=tk.Canvas(left,bg=NAV,height=205,highlightthickness=0)
        self.globe_canvas.pack(fill="x",padx=8,pady=(3,4))
        tk.Frame(left,bg=LINE,height=1).pack(fill="x",padx=14,pady=6)
        label(left,"RECENT ACTIVITY",8,DIM,bold=True).pack(anchor="w",padx=15,pady=(5,7))
        self.recent_feed=tk.Frame(left,bg=NAV); self.recent_feed.pack(fill="x",padx=13)
        tk.Frame(left,bg=LINE,height=1).pack(fill="x",padx=14,pady=9)
        label(left,"MEMORY CORE",8,DIM,bold=True).pack(anchor="w",padx=15,pady=(1,4))
        self.dashboard_memory=label(left,"Loading local archive…",9,TXT,wraplength=205,justify="left")
        self.dashboard_memory.pack(anchor="w",padx=15,pady=(2,9))
        button(left,"Open memory  ↗",lambda:self.show_page("memory")).pack(fill="x",padx=12,pady=(2,12))

        main=tk.Frame(layout,bg=BG); main.pack(side="left",fill="both",expand=True)
        controls=tk.Frame(main,bg=BG,width=158); controls.pack(side="left",fill="y",padx=(0,10)); controls.pack_propagate(False)
        label(controls,"COMPANION",8,DIM,bold=True).pack(anchor="w",pady=(4,9))
        modules=[("◈","Memory","Archive & notes",lambda:self.show_page("memory")),
                 ("⚒","Workers","Parallel work team",lambda:self.show_page("workers")),
                 ("✧","Skills","Chat · Voice · Vision",self.show_skills),
                 ("◎","Character","Mode & language",lambda:self.show_page("settings")),
                 ("⚙","Settings","Preferences",lambda:self.show_page("settings"))]
        for icon,title,detail,command in modules:
            card=tk.Frame(controls,bg=CARD,highlightthickness=1,highlightbackground=LINE)
            card.pack(fill="x",pady=4)
            b=tk.Button(card,text=icon+"  "+title,command=command,relief="flat",bd=0,
                bg=CARD,fg=TXT,activebackground=CARD2,activeforeground=ACCENT,
                font=(FONT,9,"bold"),anchor="w",padx=9,pady=8)
            b.pack(fill="x")
            label(card,detail,7,DIM).pack(anchor="w",padx=10,pady=(0,8))
        status=tk.Frame(controls,bg=CARD,padx=10,pady=10); status.pack(side="bottom",fill="x",pady=5)
        label(status,"VOICE LINK",7,DIM,bold=True).pack(anchor="w")
        label(status,"Manual activation only",8,ACCENT,wraplength=130).pack(anchor="w",pady=(4,0))
        self.workers_dashboard=label(status,"Manager + 3 workers · Auto",8,TXT,wraplength=130)
        self.workers_dashboard.pack(anchor="w",pady=(8,0))

        stage=tk.Frame(main,bg=CARD,highlightthickness=1,highlightbackground=LINE)
        stage.pack(side="left",fill="both",expand=True)
        stage_head=tk.Frame(stage,bg=CARD); stage_head.pack(fill="x",padx=17,pady=(12,1))
        label(stage_head,"BOU  /  CHARACTER CORE",9,ACCENT,bold=True).pack(side="left")
        self.core_status=label(stage_head,"●  STANDBY",8,DIM); self.core_status.pack(side="right")
        self.avatar_canvas=tk.Canvas(stage,bg=CARD,highlightthickness=0,height=380)
        self.avatar_canvas.pack(fill="both",expand=True,padx=4)
        tk.Frame(stage,bg=LINE,height=1).pack(fill="x",padx=15,pady=(0,1))
        hub=tk.Frame(stage,bg=CARD); hub.pack(fill="x",padx=14,pady=(8,12))
        row=tk.Frame(hub,bg=CARD); row.pack(fill="x")
        label(row,"VISUAL HUB",8,DIM,bold=True).pack(side="left")
        label(row,"Quick actions",8,DIM).pack(side="right")
        actions=tk.Frame(hub,bg=CARD); actions.pack(fill="x",pady=(6,0))
        for title,prompt in [("Explain","সহজ ভাষায় AI কী বুঝিয়ে বলো"),("Write","একটি সংক্ষিপ্ত ধন্যবাদ বার্তা লিখে দাও"),("Translate","Translate this to English: শুভ সকাল")]:
            button(actions,title,lambda p=prompt:self.fill_prompt(p)).pack(side="left",padx=(0,5))
        button(actions,"Image…",self.choose_image).pack(side="right",padx=(4,0))
        button(actions,"Voice  ◖",lambda:self.show_page("voice")).pack(side="right",padx=(4,0))
    def build_voice(self):
        f=self.pages["voice"]
        card=tk.Frame(f,bg=CARD); card.pack(fill="x")
        c=self.new_orb(card,220); c.pack(fill="x")
        label(card,"Say it in your own words.",18,bold=True).pack(pady=(0,10))
        label(card,"Record up to 12 seconds. Review the words before sending.",10,DIM,wraplength=520).pack(pady=(0,18))
        self.record_button=button(f,"Record voice",self.record,True); self.record_button.pack(pady=20)
        label(f,"TRANSCRIPT · কথার লেখা",9,DIM,bold=True).pack(anchor="w",pady=(8,10))
        self.transcript=textinput(f,6); self.transcript.pack(fill="both",expand=True)
        button(f,"Review in chat →",self.send_transcript).pack(anchor="e",pady=12)
        label(f,"Recording is sent to Google's speech recognition service. Audio is not saved by Bou.",9,DIM,wraplength=540,justify="left").pack(anchor="w",pady=6)
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
        self.history_var=tk.BooleanVar(value=self.settings.get("use_history",True))
        for title,var in [("Speak AI replies",self.speech_var),("Use conversation memory in AI chats",self.history_var),("Use saved notes in AI requests",self.memory_var)]:
            tk.Checkbutton(f,text=title,variable=var,bg=BG,fg=TXT,selectcolor=CARD2,activebackground=BG,activeforeground=TXT,font=(FONT,10)).pack(anchor="w",pady=9)
        label(f,"The full transcript stays on this PC. When enabled, recent and relevant earlier excerpts are sent with your chat request to the configured OpenRouter model. Turn this off to keep the archive local only.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=(0,10))
        button(f,"Save preferences",self.save_settings,True).pack(anchor="w",pady=(6,18))
        tk.Frame(f,bg=LINE,height=1).pack(fill="x",pady=5)
        label(f,"OpenRouter API key · local mode only",10,DIM).pack(anchor="w",pady=(12,6))
        self.key_entry=entry(f); self.key_entry.configure(show="•"); self.key_entry.pack(fill="x",ipady=9)
        row=tk.Frame(f,bg=BG); row.pack(fill="x",pady=10)
        button(row,"Apply key",self.apply_key).pack(side="left")
        button(row,"Test connection",self.test_connection).pack(side="left",padx=8)
        label(f,"The existing engine key is used automatically. New keys entered here are kept only until you close Bou.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=5)
        label(f,"Capabilities: chat · translations · writing · explicit app launches · image analysis\nAutomatic PC control and messaging are not included.",9,DIM,wraplength=550,justify="left").pack(anchor="w",pady=10)
    def show_page(self,key):
        for f in self.pages.values(): f.pack_forget()
        self.pages[key].pack(fill="both",expand=True)
        self.page=key
        if key=="assistant":
            self.inspector.pack(side="right",fill="y")
        else:
            self.inspector.pack_forget()
        titles={"assistant":"BOU  /  YOUR ASSISTANT","workers":"BOU  /  WORKER TEAM","voice":"BOU  /  VOICE STUDIO","memory":"BOU  /  PERSONAL MEMORY","activity":"BOU  /  YOUR ACTIVITY","settings":"BOU  /  PREFERENCES"}
        self.page_title.configure(text=titles[key])
        for k,b in self.nav.items():
            b.configure(bg=CARD2 if k==key else NAV,fg=ACCENT if k==key else DIM)
        if hasattr(self,"core_status"):
            self.core_status.configure(text="●  ACTIVE" if key=="assistant" else "●  STANDBY",fg=ACCENT if key=="assistant" else DIM)
    def show_skills(self):
        win=tk.Toplevel(self); win.title("Bou skills"); win.configure(bg=BG); win.transient(self)
        win.resizable(False,False)
        label(win,"AVAILABLE SKILLS",11,ACCENT,bold=True).pack(anchor="w",padx=22,pady=(20,12))
        for title,detail in [("Chat","Ask questions and continue your saved conversation."),
            ("Voice","Record only after pressing Record; review the transcript before sending."),
            ("Vision","Choose an image, review it, then confirm before analysis."),
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
    def submit(self,text,kind="chat",image=None):
        if self.busy or self.recording or self.voice_busy:
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
                result=self.engine.analyze(image,settings) if kind=="image" else self.engine.execute(
                    text,settings,history,notes,progress=lambda worker_id,state:self.events.put(("worker_status",(task_id,worker_id,state))))
            except Exception as exc: result={"status":"failed","text":"Request failed ("+type(exc).__name__+")."}
            self.events.put(("result",(task_id,result)))
        threading.Thread(target=work,daemon=True).start()
        return True
    def stop(self):
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
        if self.busy or self.voice_busy: self.notify("Wait for the current task to finish.",True); return
        self.recording=True; self.engine.cancel_event.clear()
        self.record_button.configure(text="Finish recording")
        self.set_phase("Recording","Up to 12 seconds. Press Finish when done.")
        self.notify("Microphone active. Audio goes to Google for transcription.")
        def work():
            try:
                text=self.engine.record(self.settings["language"],self.events)
                self.events.put(("transcript",text))
            except Exception as exc: self.events.put(("voice_error",type(exc).__name__))
        threading.Thread(target=work,daemon=True).start()
    def send_transcript(self):
        text=self.transcript.get("1.0","end").strip()
        if text: self.fill_prompt(text)
    def choose_image(self):
        if self.busy: self.notify("Wait for the current request.",True); return
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
            if not tasks:
                label(self.recent_feed,"No requests yet. Your activity will appear here.",8,DIM,wraplength=205,justify="left").pack(anchor="w",pady=5)
            for _,name,status,_detail in tasks[:3]:
                row=tk.Frame(self.recent_feed,bg=NAV); row.pack(fill="x",pady=4)
                led=ACCENT if status in ("completed","submitted") else RED if status=="failed" else BLUE
                dot=tk.Canvas(row,width=9,height=9,bg=NAV,highlightthickness=0); dot.pack(side="left",anchor="n",pady=4)
                dot.create_oval(1,1,8,8,fill=led,outline="")
                copy=tk.Frame(row,bg=NAV); copy.pack(side="left",fill="x",expand=True,padx=(6,0))
                label(copy,name[:66],8,TXT,wraplength=192,justify="left").pack(anchor="w")
                label(copy,STATUS.get(status,status).upper(),7,DIM).pack(anchor="w",pady=(2,0))
    def show_task_detail(self,event=None):
        selected=self.task_list.selection()
        if selected:
            for tid,name,status,detail in self.store.tasks():
                if tid==selected[0]:self.task_detail.configure(text=detail or STATUS.get(status,status))
    def save_settings(self):
        if self.busy or self.recording or self.voice_busy:self.notify("Finish the current task before changing preferences.",True); return
        model=self.model_entry.get().strip()
        if not model or len(model)>180 or "/" not in model:self.notify("Use an OpenRouter model ID such as google/gemini-2.5-flash.",True); return
        backend_mode=self.backend_mode_var.get(); service_url=self.service_url_entry.get().strip().rstrip("/"); service_token=self.service_token_entry.get().strip()
        if backend_mode not in ("local","service"):self.notify("Choose local or service mode.",True); return
        if backend_mode=="service" and (not service_url.startswith(("https://","http://")) or not service_token):
            self.notify("Service mode needs a valid URL and customer access token.",True); return
        self.settings.update(mode=self.mode_var.get(),language=self.lang_var.get(),model=model,speech_out=self.speech_var.get(),use_memory=self.memory_var.get(),use_history=self.history_var.get(),backend_mode=backend_mode,service_url=service_url,service_token=service_token)
        self.store.save_settings(self.settings); self.update_connection(); self.refresh_memory(); self.notify("Preferences saved on this PC.")
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
                        self.voice_busy=True; self.set_phase("Speaking","Text reply is already available.")
                        def speak(reply=text):
                            try:self.engine.speak(reply); self.events.put(("speech_done",None))
                            except Exception:self.events.put(("speech_error",None))
                        threading.Thread(target=speak,daemon=True).start()
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
                elif kind in ("transcript","voice_error"):
                    self.recording=False; self.record_button.configure(text="Record voice",state="normal")
                    cancelled=self.engine.cancel_event.is_set()
                    self.set_phase("Ready" if kind=="transcript" or cancelled else "Failed")
                    if kind=="transcript" and data and not cancelled:
                        self.transcript.delete("1.0","end"); self.transcript.insert("1.0",data); self.notify("Review the transcript, then move it to Chat.")
                    elif kind=="voice_error" and not cancelled:self.notify("Voice recognition failed ("+data+"). Text chat still works.",True)
                    else:self.notify("Recording cancelled.")
                elif kind in ("speech_done","speech_error"):
                    self.voice_busy=False; self.set_phase("Ready")
                    if kind=="speech_error":self.notify("Voice service unavailable. Your text reply is available.",True)
        except queue.Empty:pass
        self.after(80,self.poll)
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
                c.create_oval(cx-radius,cy-radius,cx+radius,cy+radius,outline=["#173646","#1c4b57","#246473","#388b96","#73e0d1"][5-n],width=2)
            c.create_oval(cx-r,cy-r,cx+r,cy+r,fill="#153a49",outline="#85edde",width=1)
            for n in range(7):
                x=cx+(n-3)*7; d=4+abs(math.sin(self.phase*2+n*.8))*(18 if active else 9)
                c.create_line(x,cy-d,x,cy+d,fill=ACCENT,width=3)
        if hasattr(self,"avatar_canvas") and self.avatar_canvas.winfo_ismapped(): self.draw_avatar(active)
        if hasattr(self,"globe_canvas") and self.globe_canvas.winfo_ismapped(): self.draw_globe()
        self.after(60,self.animate)
    def draw_globe(self):
        c=self.globe_canvas; w=max(c.winfo_width(),170); h=max(c.winfo_height(),160)
        c.delete("all"); cx=w/2; cy=h/2; r=min(w*.39,h*.40)
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
        c.create_text(cx,min(h-8,cy+r+11),text="SESSION LOCAL  ·  ARCHIVE SYNCED",fill=DIM,font=(FONT,7,"bold"))
    def draw_avatar(self,active=False):
        c=self.avatar_canvas; w=max(c.winfo_width(),380); h=max(c.winfo_height(),300)
        c.delete("all"); cx=w*.51; head_y=h*.34; head_rx=min(w*.12,62); head_ry=min(h*.19,70)
        # Subtle orbital rings frame the particle character.
        orbit_y=h*.56; orbit_rx=min(w*.35,225); orbit_ry=min(h*.15,60)
        c.create_oval(cx-orbit_rx,orbit_y-orbit_ry,cx+orbit_rx,orbit_y+orbit_ry,outline="#1c3d51",width=1)
        c.create_oval(cx-orbit_rx*.88,orbit_y-orbit_ry*.56,cx+orbit_rx*.88,orbit_y+orbit_ry*.56,
                      outline="#21485a",width=1,dash=(4,7))
        # The avatar is drawn from small teal and blue points so it can move with the live UI.
        palette=["#255467","#32798a","#53b5b8","#7ce6d9","#8badff"]
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
            c.create_oval(eye_x-2.4,eye_y-2.4,eye_x+2.4,eye_y+2.4,fill="#9af3e8",outline="")
            c.create_oval(eye_x-5,eye_y-5,eye_x+5,eye_y+5,outline="#376f7e",width=1)
        # Fine links and a soft chest core add depth without using a copied brand asset.
        for i in range(22):
            a=self.phase*.45+i*math.tau/22
            x=cx+math.cos(a)*orbit_rx*.76; y=orbit_y+math.sin(a)*orbit_ry*.66
            c.create_oval(x-1.5,y-1.5,x+1.5,y+1.5,fill="#376c7e",outline="")
        pulse=8+3*(1+math.sin(self.phase*(3 if active else 1.4)))
        c.create_oval(cx-pulse*2,shoulder_y+42-pulse*2,cx+pulse*2,shoulder_y+42+pulse*2,outline="#275e70",width=1)
        c.create_oval(cx-pulse,shoulder_y+42-pulse,cx+pulse,shoulder_y+42+pulse,fill="#72dfd1",outline="")
        c.create_text(cx,h*.965,text="BOU  ·  READY TO LISTEN",fill=DIM,font=(FONT,8,"bold"))
    def stats(self):
        if self.closing:return
        if psutil:
            try:self.device_label.configure(text="CPU "+str(round(psutil.cpu_percent()))+"% · RAM "+str(round(psutil.virtual_memory().percent))+"%")
            except Exception:self.device_label.configure(text="Device statistics unavailable")
        else:self.device_label.configure(text="Device statistics unavailable")
        self.after(2500,self.stats)
    def on_close(self):
        self.closing=True; self.engine.cancel()
        if self.current_task:self.store.task(self.current_task,self.task_label,"needs_review","Closed while a request was active; it will not be retried automatically.")
        self.store.close(); self.destroy()

if __name__=="__main__":
    try:App().mainloop()
    except Exception as exc:
        try:messagebox.showerror("বউ","Could not start Bou ("+type(exc).__name__+"). Run the launcher from the original Ai assistent folder.")
        except Exception:pass
        raise
