import sys,os,time,tempfile,unittest,threading,json
from pathlib import Path
from unittest.mock import patch
sys.dont_write_bytecode=True
from studio_store import Store
from studio_engine import Engine
from bou_studio import App

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.path=Path(self.tmp.name)/"data.sqlite"; self.store=Store(self.path)
    def tearDown(self):self.store.close();self.tmp.cleanup()
    def test_persistence_and_secret_exclusion(self):
        self.store.save_settings({"mode":"teacher","api_key":"NEVER_STORE_THIS"})
        nid=self.store.save_note("Language","Bengali")
        self.store.add_message("user","Hello")
        second=Store(self.path)
        self.assertEqual(second.settings()["mode"],"teacher")
        self.assertEqual(second.notes()[0][0],nid)
        self.assertNotIn("api_key",second.settings())
        self.assertEqual(second.db.execute("SELECT count(*) FROM settings WHERE key='api_key'").fetchone()[0],0)
        self.assertEqual(second.messages(),[("user","Hello")]);second.close()
    def test_note_update_delete(self):
        nid=self.store.save_note("a","one");self.store.save_note("b","two",nid)
        self.assertEqual(len(self.store.notes()),1);self.assertEqual(self.store.notes()[0][2],"two")
        self.store.delete_note(nid);self.assertEqual(self.store.notes(),[])
    def test_interrupted_tasks_not_retried(self):
        self.store.task("x","Action","running");self.store.recover()
        self.assertEqual(self.store.tasks()[0][2],"needs_review")
    def test_retention_clear(self):
        for n in range(303):self.store.add_message("user",str(n))
        self.assertEqual(len(self.store.messages()),300)
        self.store.clear_messages();self.assertEqual(self.store.messages(),[])
class EngineTests(unittest.TestCase):
    def setUp(self):
        self.e=Engine();self.e.api_key="test-key"
        self.s={"mode":"chat","model":"google/gemini-2.5-flash","language":"bn-BD","use_memory":False,"speech_out":False}
    def test_local_time_no_network(self):
        with patch("studio_engine.mk.call_ai") as ai:
            self.assertEqual(self.e.execute("what time is it",self.s,[],[])["status"],"completed")
            ai.assert_not_called()
    def test_exact_launch_only(self):
        with patch("studio_engine.subprocess.Popen") as launch,patch("studio_engine.mk.call_ai",return_value="Explanation"):
            self.assertEqual(self.e.execute("open notepad",self.s,[],[])["status"],"submitted")
            launch.assert_called_once_with(["notepad.exe"]);launch.reset_mock()
            self.e.execute("Explain the phrase open notepad",self.s,[],[]);launch.assert_not_called()
    def test_cancel_prevents_dispatch(self):
        self.e.cancel()
        with patch("studio_engine.subprocess.Popen") as launch:
            self.assertEqual(self.e.execute("open notepad",self.s,[],[])["status"],"cancelled");launch.assert_not_called()
    def test_cancel_discards_late_answer(self):
        def slow(*a,**k):self.e.cancel();return "Late answer"
        with patch("studio_engine.mk.call_ai",side_effect=slow):
            self.assertEqual(self.e.execute("Hello",self.s,[],[]),{"status":"cancelled","text":""})
    def test_api_errors_are_failed(self):
        with patch("studio_engine.mk.call_ai",return_value="The request timed out. Please try again."):
            self.assertEqual(self.e.execute("Hello",self.s,[],[])["status"],"failed")
    def test_memory_opt_in(self):
        notes=[("1","Note","PRIVATE_NOTE_TEST")]
        with patch("studio_engine.mk.call_ai",return_value="Hi") as ai:
            self.e.execute("Hello",self.s,[],notes)
            self.assertNotIn("PRIVATE_NOTE_TEST",ai.call_args.args[0])
            self.s["use_memory"]=True;self.e.execute("Hello",self.s,[],notes)
            self.assertIn("PRIVATE_NOTE_TEST",ai.call_args.args[0])
    def test_key_redacted(self):
        with patch("studio_engine.mk.call_ai",return_value="Error test-key"):
            self.assertNotIn("test-key",self.e.execute("Hello",self.s,[],[])["text"])

def gui_smoke():
    root=Path(os.environ["BOU_TEST_OUTPUT"])
    store=Store(root/("gui-test-"+str(time.time_ns())+".sqlite"))
    app=App(store=store);app.update()
    evidence={"window":app.winfo_geometry(),"pages":{}}
    for page in app.pages:
        app.show_page(page);app.update()
        evidence["pages"][page]=bool(app.pages[page].winfo_ismapped())
    app.show_page("assistant");app.update()
    app.submit("what time is it")
    deadline=time.time()+10
    while app.busy and time.time()<deadline:app.update();time.sleep(.05)
    assert not app.busy and any(r=="assistant" and "সময়" in t for r,t in store.messages())
    evidence["local_response_rendered"]=True
    app.show_page("memory");app.note_title.insert(0,"Test note");app.note_body.insert("1.0","Test memory");app.save_note();app.update()
    assert len(store.notes())==1
    store.delete_note(store.notes()[0][0]);app.new_note();app.refresh_memory()
    app.show_page("settings");app.mode_var.set("teacher");app.save_settings()
    assert store.settings()["mode"]=="teacher"
    app.mode_var.set("chat");app.save_settings()
    app.show_page("assistant")
    if "--live" in sys.argv:
        app.submit("Reply in Bengali in one short sentence: the AI connection works.")
        deadline=time.time()+55
        while app.busy and time.time()<deadline:app.update();time.sleep(.06)
        evidence["live_task_status"]=store.tasks()[0][2]
        evidence["live_response_rendered"]=not app.busy and store.tasks()[0][2]=="completed"
    else:
        evidence["live_api"]="Previously verified; not repeated in layout check."
    evidence["microphone_used"]=False
    # Capture only this app's own rectangle for layout QA.
    from PIL import ImageGrab
    app.update();time.sleep(.15);app.update()
    assert app.send_button.winfo_ismapped()
    assert app.send_button.winfo_rooty()+app.send_button.winfo_height() <= app.winfo_rooty()+app.winfo_height()
    evidence["composer_visible"]=True
    x,y=app.winfo_rootx(),app.winfo_rooty();w,h=app.winfo_width(),app.winfo_height()
    ImageGrab.grab(bbox=(x,y,x+w,y+h)).save(root/"studio-assistant.png")
    for page in ("memory","settings","voice"):
        app.show_page(page);app.update();time.sleep(.12);app.update()
        ImageGrab.grab(bbox=(x,y,x+w,y+h)).save(root/("studio-"+page+".png"))
    app.geometry("1100x740");app.show_page("assistant");app.update();time.sleep(.12);app.update()
    assert app.send_button.winfo_ismapped()
    assert app.send_button.winfo_rooty()+app.send_button.winfo_height() <= app.winfo_rooty()+app.winfo_height()
    evidence["compact_composer_visible"]=True
    x,y=app.winfo_rootx(),app.winfo_rooty();w,h=app.winfo_width(),app.winfo_height()
    ImageGrab.grab(bbox=(x,y,x+w,y+h)).save(root/"studio-compact-chat.png")
    app.show_page("settings");app.update();app.settings_scroll.yview_moveto(1);app.update()
    x,y=app.winfo_rootx(),app.winfo_rooty();w,h=app.winfo_width(),app.winfo_height()
    ImageGrab.grab(bbox=(x,y,x+w,y+h)).save(root/"studio-compact.png")
    evidence["compact_geometry"]=app.winfo_geometry()
    app.on_close()
    (root/"gui-evidence.json").write_text(json.dumps(evidence,indent=2),encoding="utf-8")
    print("GUI_EVIDENCE",json.dumps(evidence),flush=True)
if __name__=="__main__":
    suite=unittest.defaultTestLoader.loadTestsFromNames(["__main__.StoreTests","__main__.EngineTests"])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():sys.exit(1)
    if "--gui" in sys.argv:gui_smoke()
