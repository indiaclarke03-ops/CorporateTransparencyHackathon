-- PostgreSQL schema for the dataset build (Task 2d). Tables follow spec §6 "Data model".
-- Field lists are the spec's minimum plus the columns the dataset jobs produce.
-- Two tables are additions to §6, listed at the end: dataset_runs (manifests) and
-- dataset_rows (every row of every dataset as JSON, including datasets that §6 has no
-- typed table for yet; backlog B34).

CREATE TABLE IF NOT EXISTS source_records (
    id                 uuid PRIMARY KEY,
    source_name        text        NOT NULL,
    operation          text        NOT NULL,
    request_params     jsonb       NOT NULL,
    retrieved_at       timestamptz,
    http_status        integer,
    response_hash      text        NOT NULL,
    raw_response       jsonb,
    vendor_record_ids  jsonb,
    license_tag        text,
    replayed_from      text
);

CREATE TABLE IF NOT EXISTS entities (
    id                 text        NOT NULL,          -- Sayari entity id for now (vendor ids until merging, M2)
    run_id             text        NOT NULL,
    canonical_name     text,
    type               text,
    jurisdiction       jsonb,                         -- countries list
    is_seed            boolean,
    seed_id            text,
    registration_date  text,
    latest_status      text,
    closed             boolean,
    sanctioned         boolean,
    pep                boolean,
    source_record_id   uuid REFERENCES source_records(id),
    created_at         timestamptz DEFAULT now(),
    PRIMARY KEY (id, run_id)
);

CREATE TABLE IF NOT EXISTS entity_identifiers (
    entity_id          text        NOT NULL,
    run_id             text        NOT NULL,
    scheme             text,
    value              text,
    is_weak            boolean,
    vendor             text,
    source_record_id   uuid REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS entity_members (
    entity_id          text        NOT NULL,
    run_id             text        NOT NULL,
    vendor             text,
    vendor_entity_id   text,
    match_grade        text,                          -- A-D (spec §7.1)
    match_keys         jsonb,
    match_basis        text,
    source_record_id   uuid REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS relationships (
    run_id             text        NOT NULL,
    from_entity        text,
    to_entity          text,
    type               text,
    is_former          boolean,
    percentage         numeric,
    hs_codes           jsonb,
    dataset            text,                          -- ownership_edges, network_edges, trade_edges, tradeverifyd_trade
    source_record_id   uuid REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS public_money_records (
    entity_id          text,                          -- seed id until resolution links it
    run_id             text        NOT NULL,
    program            text,                          -- contract, exclusion, PPP loan
    sam_dataset        text,                          -- registration or exclusion (spec §8.3)
    amount             numeric,
    date               text,
    awarding_agency    text,
    award_id           text,
    source_record_id   uuid REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS signals (
    entity_id          text        NOT NULL,
    signal_code        text        NOT NULL,
    fired              boolean,                       -- null = not assessable (spec §6)
    evidence           jsonb,
    source_record_ids  jsonb,
    computed_at        timestamptz
);

CREATE TABLE IF NOT EXISTS assessments (
    entity_id             text     NOT NULL,
    tier                  text,
    signal_families_fired jsonb,
    combined_score        numeric,
    score_lower           numeric,
    score_upper           numeric,
    component_scores      jsonb,
    config_version        text,
    computed_at           timestamptz
);

CREATE TABLE IF NOT EXISTS analyst_reviews (
    assessment_id      text,
    analyst            text,
    decision           text,                          -- confirmed, dismissed, needs_info
    note               text,
    created_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_items (
    run_id             text        NOT NULL,
    lane               text,                          -- official, media
    source             text,
    publisher          text,
    title              text,
    url                text,
    published_at       text,
    retrieved_at       timestamptz,
    matched_rules      jsonb,
    source_record_id   uuid REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id                 text PRIMARY KEY,
    entity_id          text,
    created_by         text,
    created_at         timestamptz,
    content_hash       text,
    config_version     text,
    source_record_ids  jsonb
);

-- Additions to spec §6 -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dataset_runs (
    dataset            text        NOT NULL,
    run_id             text        NOT NULL,
    manifest           jsonb       NOT NULL,
    loaded_at          timestamptz DEFAULT now(),
    PRIMARY KEY (dataset, run_id)
);

CREATE TABLE IF NOT EXISTS dataset_rows (
    dataset            text        NOT NULL,
    run_id             text        NOT NULL,
    row_number         integer     NOT NULL,
    source_record_id   uuid,
    null_reasons       jsonb,
    data               jsonb       NOT NULL,
    PRIMARY KEY (dataset, run_id, row_number)
);
