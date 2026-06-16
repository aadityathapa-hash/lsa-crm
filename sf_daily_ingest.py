"""
Daily Salesforce LSA dump ingester.

Flow:
  1. List CSVs in Supabase Storage bucket  sf-dumps/incoming/
  2. Download the newest, parse + normalize (reuses sf_lsa_matchback logic)
  3. Upsert into public.sf_opportunities  (idempotent on opportunity_id)
  4. Move the file to  sf-dumps/processed/<original-name>
  5. Write a row to public.sf_ingest_log

Idempotent by design: re-running on the same dump upserts the same
primary keys, so no duplicates and no double-counted revenue.

Env vars required:
  SUPABASE_URL              https://cmkmkqfnxrsuoteppcio.supabase.co
  SUPABASE_SERVICE_KEY      service-role key (NOT the anon key)

Run:
  python sf_daily_ingest.py
Schedule:
  cron / Cloud Scheduler at ~6:15am, after the email/upload lands.
"""
import os
import io
import re
import sys
import datetime as dt

import pandas as pd
from supabase import create_client

BUCKET = "sf-dumps"
INCOMING = "incoming"
PROCESSED = "processed"
TABLE = "sf_opportunities"
LOG_TABLE = "sf_ingest_log"

SF_RENAME = {
    'Opportunity ID': 'opportunity_id', 'Contact: Full Name': 'contact_name',
    'CreateDateTime': 'create_datetime', 'Last Modified Date': 'last_modified_date',
    'Initial Scheduled Start': 'initial_scheduled_start',
    'Last Scheduled Date': 'last_scheduled_date', 'Lead Source': 'lead_source',
    'Amount': 'amount', 'Amount Currency': 'amount_currency', 'Status': 'status',
    'Cancellation Source': 'cancellation_source', 'Created By: Full Name': 'created_by',
    'Franchise': 'franchise',
}
REALIZED = ('Paid', 'Invoiced')


def normalize_phone(value):
    if pd.isna(value):
        return None
    digits = re.sub(r'\D', '', str(value))
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    m = re.search(r'(\d{10})', digits)
    return m.group(1) if m else None


def parse_dump(raw_bytes, filename):
    """Bytes of a CSV (or xlsx) -> clean, deduped DataFrame ready to upsert."""
    if filename.lower().endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(raw_bytes))
    else:
        df = pd.read_csv(io.BytesIO(raw_bytes))

    df['phone'] = df['Account Phone'].apply(normalize_phone)
    if 'Onsite Phone Number' in df.columns:
        # normalize_phone already coerces via str() — handles both numeric and
        # string Onsite values (the f"{x:.0f}" form crashed on string columns).
        onsite = df['Onsite Phone Number'].apply(
            lambda x: normalize_phone(x) if pd.notna(x) else None)
        df['phone'] = df['phone'].fillna(onsite)
    df['zip'] = df['Zip/Postal Code'].apply(
        lambda x: f"{int(x):05d}" if pd.notna(x) else None)

    stage = df.rename(columns=SF_RENAME)[list(SF_RENAME.values()) + ['phone', 'zip']].copy()
    stage['opportunity_id'] = stage['opportunity_id'].astype('int64')
    stage = (stage.sort_values('last_modified_date')
                  .drop_duplicates('opportunity_id', keep='last')
                  .reset_index(drop=True))
    stage['is_realized'] = stage['status'].isin(REALIZED)
    stage['source_file'] = filename

    # datetimes -> ISO strings (json-serializable); NaN/NaT -> None
    for c in ['create_datetime', 'last_modified_date',
              'initial_scheduled_start', 'last_scheduled_date']:
        stage[c] = pd.to_datetime(stage[c], errors='coerce')
        stage[c] = stage[c].apply(lambda x: x.isoformat() if pd.notna(x) else None)
    stage['amount'] = stage['amount'].where(stage['amount'].notna(), None)
    stage = stage.astype(object).where(pd.notnull(stage), None)
    return stage


def newest_incoming(sb):
    files = sb.storage.from_(BUCKET).list(INCOMING)
    csvs = [f for f in files if f['name'].lower().endswith(('.csv', '.xlsx', '.xls'))]
    if not csvs:
        return None
    # sort by created_at if present, else by name (date-stamped names sort fine)
    csvs.sort(key=lambda f: f.get('created_at') or f['name'], reverse=True)
    return csvs[0]['name']


def log_run(sb, **row):
    try:
        sb.table(LOG_TABLE).insert(row).execute()
    except Exception as e:                       # logging must never crash the run
        print(f"  (warning: could not write log row: {e})", file=sys.stderr)


def main():
    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_KEY']
    sb = create_client(url, key)

    fname = newest_incoming(sb)
    if not fname:
        print("No new dump in incoming/. Nothing to do.")
        log_run(sb, source_file=None, rows_in_file=0, rows_upserted=0,
                realized_sum=0, status='success', message='no file')
        return

    src = f"{INCOMING}/{fname}"
    print(f"Processing {src} ...")
    try:
        raw = sb.storage.from_(BUCKET).download(src)
        stage = parse_dump(raw, fname)
        records = stage.to_dict('records')

        # upsert in chunks (idempotent on opportunity_id primary key)
        CHUNK = 500
        for i in range(0, len(records), CHUNK):
            sb.table(TABLE).upsert(
                records[i:i + CHUNK], on_conflict='opportunity_id').execute()

        realized_sum = float(stage.loc[stage['is_realized'] == True, 'amount']
                             .dropna().astype(float).sum())

        # archive: copy to processed/, then remove from incoming/
        dest = f"{PROCESSED}/{fname}"
        sb.storage.from_(BUCKET).copy(src, dest)
        sb.storage.from_(BUCKET).remove([src])

        msg = f"{len(records)} rows upserted, realized ${realized_sum:,.0f}"
        print("  " + msg)
        log_run(sb, source_file=fname, rows_in_file=len(stage),
                rows_upserted=len(records), realized_sum=realized_sum,
                status='success', message=msg)

    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        log_run(sb, source_file=fname, rows_in_file=0, rows_upserted=0,
                realized_sum=0, status='error', message=str(e)[:500])
        sys.exit(1)


if __name__ == '__main__':
    main()
