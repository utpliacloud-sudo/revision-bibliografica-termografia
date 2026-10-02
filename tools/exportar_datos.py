"""Actualizar el paquete estático desde los resultados científicos originales.

Solo se necesita Python para regenerar los datos; la web funciona sin Python.
"""
import json
import shutil
import sys
import re
from pathlib import Path
from datetime import datetime, timezone

WEB = Path(__file__).resolve().parent.parent
ROOT = WEB.parent
sys.path.insert(0, str(ROOT / 'brujula_bibliografica'))
from core import load_table
from analytics import overview, _keyword_sets, reason_group, ANALYTICS_VERSION
from project_report import project_summary, FILES, SCOPUS_LOGO, WOS_LOGO
from flow_graph import flow_svg

def main():
    data = WEB / 'data'
    assets = WEB / 'assets'
    downloads = WEB / 'downloads'
    for folder in (data, assets, downloads):
        folder.mkdir(parents=True, exist_ok=True)
    headers, rows = load_table(FILES['analyzed'].name, FILES['analyzed'].read_bytes())
    report = overview(rows)
    groups = ('datasets', 'access', 'preparation', 'models', 'classification', 'tools', 'metrics', 'limitations', 'validation', 'data_types')
    terms = _keyword_sets(rows)
    articles = []
    for index, row in enumerate(rows):
        articles.append({'row': row, 'resource': report['records'][index]['resource'],
                         'abstract': report['records'][index]['abstract'],
                         'reason': reason_group(row), 'keywords': sorted(terms[index]),
                         'mentions': {group: [name for name, indices in report[group].items() if index in indices] for group in groups}})
    summary = project_summary()
    payload = {'summary': summary, 'headers': headers, 'articles': articles,
               'categories': {group: list(report[group]) for group in groups},
               'method': ANALYTICS_VERSION, 'generated': datetime.now(timezone.utc).isoformat()}
    (data / 'project.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for name, path in FILES.items():
        shutil.copy2(path, downloads / path.name)
    filter_summary = FILES['final'].parent / 'filtro_termografia_resumen.json'
    shutil.copy2(filter_summary, downloads / filter_summary.name)
    shutil.copy2(SCOPUS_LOGO, assets / 'scopus.png')
    shutil.copy2(WOS_LOGO, assets / 'wos.png')
    wide = flow_svg(summary).replace('y="116" fill="#d7f1ee"', 'y="108" fill="#d7f1ee"').replace('y="195" fill="#d7f1ee"', 'y="187" fill="#d7f1ee"')
    narrow = flow_svg(summary, narrow=True)
    narrow = narrow.replace('markerWidth="8" markerHeight="8"', 'markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8"')
    narrow = re.sub(r'M180 (\d+) V(\d+)', lambda m: f'M180 {int(m[1])+11} V{int(m[2])+4}', narrow)
    (assets / 'flujo.svg').write_text(wide, encoding='utf-8')
    (assets / 'flujo-movil.svg').write_text(narrow, encoding='utf-8')
    (data / 'reference.json').write_text(json.dumps({g: {n: len(v) for n,v in report[g].items()} for g in groups}, ensure_ascii=False), encoding='utf-8')
    print(f'Exportados {len(articles)} artículos y {len(headers)} columnas a {WEB}')

if __name__ == '__main__':
    main()
