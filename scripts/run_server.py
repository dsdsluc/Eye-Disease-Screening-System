"""Launch the inference service.

No longer needs the Windows SelectorEventLoop workaround the old script had
-- that was for psycopg's async Postgres pool, which lived in the old
app/db.py. inference/ is a stateless model service now (see
plans/archetechture.txt section 8's successor); persistence moved to web/.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("inference.main:app", host="127.0.0.1", port=8000)
