from datetime import datetime
html=f'''<html><body><h1>IntelliLaw Build Report</h1><p>{datetime.now()}</p></body></html>'''
open('BuildReport.html','w',encoding='utf-8').write(html)
print('Report generated')
