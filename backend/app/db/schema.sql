-- Viaticum KIS — PostgreSQL schema
-- Run once on startup (CREATE TABLE IF NOT EXISTS is idempotent)

CREATE TABLE IF NOT EXISTS patients (
    id              TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    dob             DATE,
    sex             TEXT,
    station         TEXT,
    room            TEXT,
    bed             TEXT,
    admit_at        TIMESTAMPTZ,
    los_days        INT         DEFAULT 0,
    primary_dx      TEXT,
    secondary_dx    JSONB       DEFAULT '[]',
    allergies       JSONB       DEFAULT '[]',
    attending       TEXT,
    nurse           TEXT,
    severity        TEXT        DEFAULT 'stable',
    insurance       JSONB       DEFAULT '{}',
    vitals          JSONB       DEFAULT '{}',
    dnr             BOOLEAN     DEFAULT FALSE,
    aufnahmeart     TEXT,
    has_consultation BOOLEAN    DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    soap        JSONB       DEFAULT '{}',
    entities    JSONB       DEFAULT '[]',
    transcript  TEXT,
    provider    TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_id  TEXT        NOT NULL,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    citations   JSONB       DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_patient_session
    ON chat_messages (patient_id, session_id, created_at);
