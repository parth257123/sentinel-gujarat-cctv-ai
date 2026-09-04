from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

SQLALCHEMY_DATABASE_URL = "sqlite:///./sentinel.db"

# ─── Concurrency-Hardened SQLite Engine ───────────────────────────────────────
# The harvester, the CCTV worker and the FastAPI request handlers all write to
# sentinel.db at the same time. In SQLite's default "delete" journal mode a
# single writer blocks every reader, which surfaces in the UI as
# "database is locked" the moment a demo runs while ingestion is live.
#
# WAL (write-ahead logging) lets readers proceed concurrently with one writer,
# and busy_timeout makes any remaining contention retry silently instead of
# raising. Both are set per-connection because SQLite scopes them that way.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,  # seconds the driver waits on a locked db before raising
    },
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Apply concurrency + durability pragmas to every new SQLite connection."""
    cursor = dbapi_connection.cursor()
    try:
        # Readers no longer block on the single writer.
        cursor.execute("PRAGMA journal_mode=WAL")
        # Retry for up to 30s on contention rather than raising immediately.
        cursor.execute("PRAGMA busy_timeout=30000")
        # NORMAL is the standard durability/throughput trade-off under WAL.
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Keep temp b-trees (ORDER BY on large scans) in memory.
        cursor.execute("PRAGMA temp_store=MEMORY")
        # ~64 MB page cache: large win on the embedding-heavy detections table.
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_pragmas() -> dict:
    """Report the pragmas actually in force — used by /health for demo pre-flight."""
    with engine.connect() as conn:
        return {
            "journal_mode": conn.execute(text("PRAGMA journal_mode")).scalar(),
            "busy_timeout_ms": conn.execute(text("PRAGMA busy_timeout")).scalar(),
            "synchronous": conn.execute(text("PRAGMA synchronous")).scalar(),
        }
