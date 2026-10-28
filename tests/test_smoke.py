"""Browser smoke tests for KHOTWA v1.1.
Run: pip install playwright && playwright install chromium && python tests/test_smoke.py
Tests use isolated, throwaway browser storage and require no external network.
"""
import json, re, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SRC=(ROOT/'index.html').read_text(encoding='utf-8')
SCRIPTS=re.findall(r'<script>(.*?)</script>',SRC,re.S)
CSS=re.search(r'<style>(.*?)</style>',SRC,re.S).group(1)
assert len(SCRIPTS)==2

def boot(page):
    page.goto('about:blank')
    page.set_content('<html lang="ar" dir="rtl"><body><div id="app"></div><div id="toast"></div><div id="modal-root"></div></body></html>')
    page.evaluate("""() => {
      const mem=new Map();
      Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});
      Object.defineProperty(window,'localStorage',{value:{
         getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v))
      },configurable:true});
    }""")
    page.add_style_tag(content=CSS)
    for script in SCRIPTS:page.add_script_tag(content=script)
    page.locator('.primary-card').wait_for(timeout=7000)

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
        page=browser.new_page(accept_downloads=True,viewport={'width':390,'height':844})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        boot(page)
        for name in ('One','Two','Three','Four'):
            page.locator('#quick-form input').fill(name)
            page.locator('#quick-form button').click()
        assert page.locator('.primary-card h3').inner_text()=='One'
        assert page.locator('.task-row').count()==2
        page.locator('[data-action="focus-quick"]').click()
        assert page.locator('.focus-overlay').count()==1
        assert page.get_by_role('dialog').count()==0
        page.locator('[data-action="focus-pause"]').click()
        page.locator('[data-action="focus-pause"]').click()
        page.locator('[data-action="focus-finish"]').click()
        page.locator('[data-outcome="progress"]').click()
        assert page.locator('.focus-overlay').count()==0
        page.locator('[data-action="nav"][data-page="settings"]').last.click()
        with page.expect_download() as downloaded:
            page.locator('[data-action="export"]').click()
        assert downloaded.value.suggested_filename.endswith('.json')
        saved=json.loads(page.evaluate("localStorage.getItem('khotwa-local-data')"))
        assert len(saved['tasks'])==4 and len(saved['sessions'])==1
        backup=dict(app='KHOTWA',version=1,exportedAt='2026-10-01T00:00:00Z')
        for table in ('tasks','projects','habits','habitLogs','sessions','reviews','meta'):
            backup[table]=[x for x in saved[table] if not(table=='meta' and x['id']=='focus')]
        other=browser.new_page(accept_downloads=True,viewport={'width':390,'height':844})
        boot(other)
        other.on('dialog',lambda dlg:dlg.accept())
        other.locator('[data-action="nav"][data-page="settings"]').last.click()
        other.locator('#import-file').set_input_files({
          'name':'v1-backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
        other.locator('.primary-card h3').get_by_text('One').wait_for(timeout=7000)
        assert not errors, errors
        browser.close()
        print('KHOTWA v1.1 browser smoke tests passed')

if __name__=='__main__':run()
