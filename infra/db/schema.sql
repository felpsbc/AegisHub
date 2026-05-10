--
-- PostgreSQL database dump
--

\restrict g7UmkwaaMpydEcWkuZWzaplgV3lvO40LFt6uHMk8CcaRWAcAd6CxdCWbFPEnCew

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: audit_canonical(text, text, bigint, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_canonical(_event_type text, _object_type text, _object_id bigint, _actor_id bigint, _tenant_id bigint, _payload jsonb) RETURNS bytea
    LANGUAGE sql IMMUTABLE
    AS $$
        SELECT convert_to(
            coalesce(_event_type, '') || E'\t' ||
            coalesce(_object_type, '') || E'\t' ||
            coalesce(_object_id::text, '') || E'\t' ||
            coalesce(_actor_id::text, '') || E'\t' ||
            coalesce(_tenant_id::text, '') || E'\t' ||
            coalesce(_payload::text, '{}'),
            'UTF8'
        );
    $$;


--
-- Name: audit_log_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RAISE EXCEPTION 'audit_auditlog is append-only (op=%, by=%)',
            TG_OP, current_user;
    END
    $$;


--
-- Name: audit_log_hash_chain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_hash_chain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
        last_hash BYTEA;
        body BYTEA;
    BEGIN
        SELECT self_hash INTO last_hash
        FROM audit_auditlog
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE;

        body := audit_canonical(
            NEW.event_type,
            NEW.object_type,
            NEW.object_id,
            NEW.actor_id,
            NEW.tenant_id,
            NEW.payload
        );

        NEW.prev_hash := last_hash;
        NEW.self_hash := digest(coalesce(last_hash, ''::bytea) || body, 'sha256');
        RETURN NEW;
    END
    $$;


--
-- Name: pentesters_tsv_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pentesters_tsv_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.tsv := to_tsvector(
            'portuguese',
            coalesce(NEW.headline, '') || ' ' || coalesce(NEW.bio, '')
        );
        RETURN NEW;
    END
    $$;


--
-- Name: proposals_tsv_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.proposals_tsv_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.tsv := to_tsvector(
            'portuguese',
            coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
        );
        RETURN NEW;
    END
    $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user (
    id bigint NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    full_name character varying(200) NOT NULL,
    is_admin boolean NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    mfa_secret bytea,
    mfa_enabled boolean NOT NULL,
    mfa_backup_codes jsonb NOT NULL,
    last_login_at timestamp with time zone,
    failed_attempts smallint NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT accounts_user_failed_attempts_check CHECK ((failed_attempts >= 0))
);


--
-- Name: accounts_user_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user_groups (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    group_id integer NOT NULL
);


--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user_user_permissions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: applications_application; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications_application (
    id bigint NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cover_message text NOT NULL,
    proposed_rate numeric(10,2),
    proposed_total numeric(14,2),
    status character varying(12) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    pentester_id bigint NOT NULL,
    proposal_id bigint NOT NULL
);


--
-- Name: applications_application_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.applications_application ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.applications_application_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_auditlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_auditlog (
    id bigint NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    actor_ip inet,
    actor_ua text NOT NULL,
    tenant_id bigint,
    event_type character varying(64) NOT NULL,
    object_type character varying(64) NOT NULL,
    object_id bigint,
    payload jsonb NOT NULL,
    prev_hash bytea,
    self_hash bytea NOT NULL,
    actor_id bigint
);


--
-- Name: audit_auditlog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_auditlog ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_auditlog_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: axes_accessattempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes_accessattempt (
    id integer NOT NULL,
    user_agent character varying(255) NOT NULL,
    ip_address inet,
    username character varying(255),
    http_accept character varying(1025) NOT NULL,
    path_info character varying(255) NOT NULL,
    attempt_time timestamp with time zone NOT NULL,
    get_data text NOT NULL,
    post_data text NOT NULL,
    failures_since_start integer NOT NULL,
    CONSTRAINT axes_accessattempt_failures_since_start_check CHECK ((failures_since_start >= 0))
);


--
-- Name: axes_accessattempt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.axes_accessattempt ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.axes_accessattempt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: axes_accessattemptexpiration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes_accessattemptexpiration (
    access_attempt_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: axes_accessfailurelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes_accessfailurelog (
    id integer NOT NULL,
    user_agent character varying(255) NOT NULL,
    ip_address inet,
    username character varying(255),
    http_accept character varying(1025) NOT NULL,
    path_info character varying(255) NOT NULL,
    attempt_time timestamp with time zone NOT NULL,
    locked_out boolean NOT NULL
);


--
-- Name: axes_accessfailurelog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.axes_accessfailurelog ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.axes_accessfailurelog_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: axes_accesslog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.axes_accesslog (
    id integer NOT NULL,
    user_agent character varying(255) NOT NULL,
    ip_address inet,
    username character varying(255),
    http_accept character varying(1025) NOT NULL,
    path_info character varying(255) NOT NULL,
    attempt_time timestamp with time zone NOT NULL,
    logout_time timestamp with time zone,
    session_hash character varying(64) NOT NULL
);


--
-- Name: axes_accesslog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.axes_accesslog ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.axes_accesslog_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id bigint NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


--
-- Name: pentesters_certification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pentesters_certification (
    id bigint NOT NULL,
    code character varying(32) NOT NULL,
    label character varying(120) NOT NULL
);


--
-- Name: pentesters_certification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pentesters_certification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pentesters_certification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pentesters_pentestercertification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pentesters_pentestercertification (
    id bigint NOT NULL,
    issued_at date,
    expires_at date,
    evidence_s3_key character varying(255) NOT NULL,
    verification character varying(10) NOT NULL,
    verified_at timestamp with time zone,
    certification_id bigint NOT NULL,
    pentester_id bigint NOT NULL
);


--
-- Name: pentesters_pentestercertification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pentesters_pentestercertification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pentesters_pentestercertification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pentesters_pentesterprofile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pentesters_pentesterprofile (
    id bigint NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    headline character varying(140) NOT NULL,
    bio text NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    currency character varying(3) NOT NULL,
    availability character varying(12) NOT NULL,
    location character varying(120) NOT NULL,
    remote_only boolean NOT NULL,
    rating_avg numeric(3,2),
    rating_count integer NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id bigint NOT NULL,
    tsv tsvector,
    CONSTRAINT hourly_rate_non_negative CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT pentesters_pentesterprofile_rating_count_check CHECK ((rating_count >= 0))
);


--
-- Name: pentesters_pentesterprofile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pentesters_pentesterprofile ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pentesters_pentesterprofile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pentesters_pentesterprofile_specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pentesters_pentesterprofile_specialties (
    id bigint NOT NULL,
    pentesterprofile_id bigint NOT NULL,
    specialty_id bigint NOT NULL
);


--
-- Name: pentesters_pentesterprofile_specialties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pentesters_pentesterprofile_specialties ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pentesters_pentesterprofile_specialties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pentesters_specialty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pentesters_specialty (
    id bigint NOT NULL,
    code character varying(24) NOT NULL,
    label character varying(80) NOT NULL
);


--
-- Name: pentesters_specialty_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pentesters_specialty ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pentesters_specialty_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: proposals_proposal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals_proposal (
    id bigint NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(140) NOT NULL,
    description text NOT NULL,
    scope_md text NOT NULL,
    budget_amount numeric(14,2),
    budget_currency character varying(3) NOT NULL,
    budget_kind character varying(10) NOT NULL,
    duration_weeks smallint,
    status character varying(10) NOT NULL,
    visibility character varying(8) NOT NULL,
    published_at timestamp with time zone,
    closes_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id bigint NOT NULL,
    tsv tsvector,
    CONSTRAINT proposals_proposal_duration_weeks_check CHECK ((duration_weeks >= 0))
);


--
-- Name: proposals_proposal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.proposals_proposal ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.proposals_proposal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: proposals_proposal_specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals_proposal_specialties (
    id bigint NOT NULL,
    proposal_id bigint NOT NULL,
    specialty_id bigint NOT NULL
);


--
-- Name: proposals_proposal_specialties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.proposals_proposal_specialties ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.proposals_proposal_specialties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tenants_membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants_membership (
    id bigint NOT NULL,
    role character varying(10) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    user_id bigint NOT NULL,
    tenant_id bigint NOT NULL
);


--
-- Name: tenants_membership_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tenants_membership ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tenants_membership_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tenants_tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants_tenant (
    id bigint NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(12) NOT NULL,
    legal_name character varying(200) NOT NULL,
    document character varying(20) NOT NULL,
    document_kind character varying(4) NOT NULL,
    status character varying(12) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: tenants_tenant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tenants_tenant ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tenants_tenant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user accounts_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_email_key UNIQUE (email);


--
-- Name: accounts_user_groups accounts_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_groups accounts_user_groups_user_id_group_id_59c0b32f_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_group_id_59c0b32f_uniq UNIQUE (user_id, group_id);


--
-- Name: accounts_user accounts_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_pkey PRIMARY KEY (id);


--
-- Name: accounts_user accounts_user_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_public_id_key UNIQUE (public_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq UNIQUE (user_id, permission_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: applications_application application_unique_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_application
    ADD CONSTRAINT application_unique_pair UNIQUE (proposal_id, pentester_id);


--
-- Name: applications_application applications_application_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_application
    ADD CONSTRAINT applications_application_pkey PRIMARY KEY (id);


--
-- Name: applications_application applications_application_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_application
    ADD CONSTRAINT applications_application_public_id_key UNIQUE (public_id);


--
-- Name: audit_auditlog audit_auditlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_auditlog
    ADD CONSTRAINT audit_auditlog_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: axes_accessattempt axes_accessattempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accessattempt
    ADD CONSTRAINT axes_accessattempt_pkey PRIMARY KEY (id);


--
-- Name: axes_accessattempt axes_accessattempt_username_ip_address_user_agent_8ea22282_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accessattempt
    ADD CONSTRAINT axes_accessattempt_username_ip_address_user_agent_8ea22282_uniq UNIQUE (username, ip_address, user_agent);


--
-- Name: axes_accessattemptexpiration axes_accessattemptexpiration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accessattemptexpiration
    ADD CONSTRAINT axes_accessattemptexpiration_pkey PRIMARY KEY (access_attempt_id);


--
-- Name: axes_accessfailurelog axes_accessfailurelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accessfailurelog
    ADD CONSTRAINT axes_accessfailurelog_pkey PRIMARY KEY (id);


--
-- Name: axes_accesslog axes_accesslog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accesslog
    ADD CONSTRAINT axes_accesslog_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: tenants_membership membership_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_membership
    ADD CONSTRAINT membership_unique UNIQUE (user_id, tenant_id);


--
-- Name: pentesters_certification pentesters_certification_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_certification
    ADD CONSTRAINT pentesters_certification_code_key UNIQUE (code);


--
-- Name: pentesters_certification pentesters_certification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_certification
    ADD CONSTRAINT pentesters_certification_pkey PRIMARY KEY (id);


--
-- Name: pentesters_pentestercertification pentesters_pentestercertification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentestercertification
    ADD CONSTRAINT pentesters_pentestercertification_pkey PRIMARY KEY (id);


--
-- Name: pentesters_pentesterprofile_specialties pentesters_pentesterprof_pentesterprofile_id_spec_3da06244_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile_specialties
    ADD CONSTRAINT pentesters_pentesterprof_pentesterprofile_id_spec_3da06244_uniq UNIQUE (pentesterprofile_id, specialty_id);


--
-- Name: pentesters_pentesterprofile pentesters_pentesterprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile
    ADD CONSTRAINT pentesters_pentesterprofile_pkey PRIMARY KEY (id);


--
-- Name: pentesters_pentesterprofile pentesters_pentesterprofile_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile
    ADD CONSTRAINT pentesters_pentesterprofile_public_id_key UNIQUE (public_id);


--
-- Name: pentesters_pentesterprofile_specialties pentesters_pentesterprofile_specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile_specialties
    ADD CONSTRAINT pentesters_pentesterprofile_specialties_pkey PRIMARY KEY (id);


--
-- Name: pentesters_pentesterprofile pentesters_pentesterprofile_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile
    ADD CONSTRAINT pentesters_pentesterprofile_tenant_id_key UNIQUE (tenant_id);


--
-- Name: pentesters_specialty pentesters_specialty_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_specialty
    ADD CONSTRAINT pentesters_specialty_code_key UNIQUE (code);


--
-- Name: pentesters_specialty pentesters_specialty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_specialty
    ADD CONSTRAINT pentesters_specialty_pkey PRIMARY KEY (id);


--
-- Name: proposals_proposal proposals_proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal
    ADD CONSTRAINT proposals_proposal_pkey PRIMARY KEY (id);


--
-- Name: proposals_proposal proposals_proposal_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal
    ADD CONSTRAINT proposals_proposal_public_id_key UNIQUE (public_id);


--
-- Name: proposals_proposal_specialties proposals_proposal_speci_proposal_id_specialty_id_e01384f7_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal_specialties
    ADD CONSTRAINT proposals_proposal_speci_proposal_id_specialty_id_e01384f7_uniq UNIQUE (proposal_id, specialty_id);


--
-- Name: proposals_proposal_specialties proposals_proposal_specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal_specialties
    ADD CONSTRAINT proposals_proposal_specialties_pkey PRIMARY KEY (id);


--
-- Name: tenants_tenant tenant_document_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_tenant
    ADD CONSTRAINT tenant_document_unique UNIQUE (document, document_kind);


--
-- Name: tenants_membership tenants_membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_membership
    ADD CONSTRAINT tenants_membership_pkey PRIMARY KEY (id);


--
-- Name: tenants_tenant tenants_tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_tenant
    ADD CONSTRAINT tenants_tenant_pkey PRIMARY KEY (id);


--
-- Name: tenants_tenant tenants_tenant_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_tenant
    ADD CONSTRAINT tenants_tenant_public_id_key UNIQUE (public_id);


--
-- Name: accounts_user_email_b2644a56_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_email_b2644a56_like ON public.accounts_user USING btree (email varchar_pattern_ops);


--
-- Name: accounts_user_groups_group_id_bd11a704; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_groups_group_id_bd11a704 ON public.accounts_user_groups USING btree (group_id);


--
-- Name: accounts_user_groups_user_id_52b62117; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_groups_user_id_52b62117 ON public.accounts_user_groups USING btree (user_id);


--
-- Name: accounts_user_user_permissions_permission_id_113bb443; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_user_permissions_permission_id_113bb443 ON public.accounts_user_user_permissions USING btree (permission_id);


--
-- Name: accounts_user_user_permissions_user_id_e4f0a161; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_user_permissions_user_id_e4f0a161 ON public.accounts_user_user_permissions USING btree (user_id);


--
-- Name: application_proposa_d914dd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX application_proposa_d914dd_idx ON public.applications_application USING btree (proposal_id, status);


--
-- Name: applications_application_pentester_id_27128907; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_application_pentester_id_27128907 ON public.applications_application USING btree (pentester_id);


--
-- Name: applications_application_proposal_id_92423806; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_application_proposal_id_92423806 ON public.applications_application USING btree (proposal_id);


--
-- Name: audit_audit_event_t_a6e18a_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_audit_event_t_a6e18a_idx ON public.audit_auditlog USING btree (event_type, occurred_at);


--
-- Name: audit_audit_tenant__5831f4_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_audit_tenant__5831f4_idx ON public.audit_auditlog USING btree (tenant_id, occurred_at);


--
-- Name: audit_auditlog_actor_id_20e70a27; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditlog_actor_id_20e70a27 ON public.audit_auditlog USING btree (actor_id);


--
-- Name: audit_auditlog_event_type_6805eab9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditlog_event_type_6805eab9 ON public.audit_auditlog USING btree (event_type);


--
-- Name: audit_auditlog_event_type_6805eab9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditlog_event_type_6805eab9_like ON public.audit_auditlog USING btree (event_type varchar_pattern_ops);


--
-- Name: audit_auditlog_occurred_at_7280a782; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditlog_occurred_at_7280a782 ON public.audit_auditlog USING btree (occurred_at);


--
-- Name: audit_auditlog_tenant_id_6a956a1c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditlog_tenant_id_6a956a1c ON public.audit_auditlog USING btree (tenant_id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: axes_accessattempt_ip_address_10922d9c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessattempt_ip_address_10922d9c ON public.axes_accessattempt USING btree (ip_address);


--
-- Name: axes_accessattempt_user_agent_ad89678b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessattempt_user_agent_ad89678b ON public.axes_accessattempt USING btree (user_agent);


--
-- Name: axes_accessattempt_user_agent_ad89678b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessattempt_user_agent_ad89678b_like ON public.axes_accessattempt USING btree (user_agent varchar_pattern_ops);


--
-- Name: axes_accessattempt_username_3f2d4ca0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessattempt_username_3f2d4ca0 ON public.axes_accessattempt USING btree (username);


--
-- Name: axes_accessattempt_username_3f2d4ca0_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessattempt_username_3f2d4ca0_like ON public.axes_accessattempt USING btree (username varchar_pattern_ops);


--
-- Name: axes_accessfailurelog_ip_address_2e9f5a7f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessfailurelog_ip_address_2e9f5a7f ON public.axes_accessfailurelog USING btree (ip_address);


--
-- Name: axes_accessfailurelog_user_agent_ea145dda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessfailurelog_user_agent_ea145dda ON public.axes_accessfailurelog USING btree (user_agent);


--
-- Name: axes_accessfailurelog_user_agent_ea145dda_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessfailurelog_user_agent_ea145dda_like ON public.axes_accessfailurelog USING btree (user_agent varchar_pattern_ops);


--
-- Name: axes_accessfailurelog_username_a8b7e8a4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessfailurelog_username_a8b7e8a4 ON public.axes_accessfailurelog USING btree (username);


--
-- Name: axes_accessfailurelog_username_a8b7e8a4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accessfailurelog_username_a8b7e8a4_like ON public.axes_accessfailurelog USING btree (username varchar_pattern_ops);


--
-- Name: axes_accesslog_ip_address_86b417e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accesslog_ip_address_86b417e5 ON public.axes_accesslog USING btree (ip_address);


--
-- Name: axes_accesslog_user_agent_0e659004; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accesslog_user_agent_0e659004 ON public.axes_accesslog USING btree (user_agent);


--
-- Name: axes_accesslog_user_agent_0e659004_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accesslog_user_agent_0e659004_like ON public.axes_accesslog USING btree (user_agent varchar_pattern_ops);


--
-- Name: axes_accesslog_username_df93064b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accesslog_username_df93064b ON public.axes_accesslog USING btree (username);


--
-- Name: axes_accesslog_username_df93064b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX axes_accesslog_username_df93064b_like ON public.axes_accesslog USING btree (username varchar_pattern_ops);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: pentesters_certification_code_3709849b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_certification_code_3709849b_like ON public.pentesters_certification USING btree (code varchar_pattern_ops);


--
-- Name: pentesters_pentestercertification_certification_id_110ca9b1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_pentestercertification_certification_id_110ca9b1 ON public.pentesters_pentestercertification USING btree (certification_id);


--
-- Name: pentesters_pentestercertification_pentester_id_2f8d9342; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_pentestercertification_pentester_id_2f8d9342 ON public.pentesters_pentestercertification USING btree (pentester_id);


--
-- Name: pentesters_pentesterprofil_pentesterprofile_id_03c85e74; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_pentesterprofil_pentesterprofile_id_03c85e74 ON public.pentesters_pentesterprofile_specialties USING btree (pentesterprofile_id);


--
-- Name: pentesters_pentesterprofile_specialties_specialty_id_d9a878eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_pentesterprofile_specialties_specialty_id_d9a878eb ON public.pentesters_pentesterprofile_specialties USING btree (specialty_id);


--
-- Name: pentesters_specialty_code_62f8c9bd_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_specialty_code_62f8c9bd_like ON public.pentesters_specialty USING btree (code varchar_pattern_ops);


--
-- Name: pentesters_tsv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pentesters_tsv_idx ON public.pentesters_pentesterprofile USING gin (tsv);


--
-- Name: pp_avail_rate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pp_avail_rate_idx ON public.pentesters_pentesterprofile USING btree (availability, hourly_rate) WHERE ((availability)::text = 'OPEN'::text);


--
-- Name: prop_status_pub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prop_status_pub_idx ON public.proposals_proposal USING btree (status, published_at DESC) WHERE ((status)::text = 'PUBLISHED'::text);


--
-- Name: prop_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prop_tenant_idx ON public.proposals_proposal USING btree (tenant_id);


--
-- Name: proposals_proposal_specialties_proposal_id_fb6272bb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_proposal_specialties_proposal_id_fb6272bb ON public.proposals_proposal_specialties USING btree (proposal_id);


--
-- Name: proposals_proposal_specialties_specialty_id_994d8349; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_proposal_specialties_specialty_id_994d8349 ON public.proposals_proposal_specialties USING btree (specialty_id);


--
-- Name: proposals_proposal_tenant_id_fee32b5b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_proposal_tenant_id_fee32b5b ON public.proposals_proposal USING btree (tenant_id);


--
-- Name: proposals_title_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_title_trgm_idx ON public.proposals_proposal USING gin (title public.gin_trgm_ops);


--
-- Name: proposals_tsv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proposals_tsv_idx ON public.proposals_proposal USING gin (tsv);


--
-- Name: tenants_membership_tenant_id_55f75d05; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_membership_tenant_id_55f75d05 ON public.tenants_membership USING btree (tenant_id);


--
-- Name: tenants_membership_user_id_2c860192; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_membership_user_id_2c860192 ON public.tenants_membership USING btree (user_id);


--
-- Name: tenants_ten_type_bb3311_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_ten_type_bb3311_idx ON public.tenants_tenant USING btree (type, status);


--
-- Name: audit_auditlog audit_log_hash_chain_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_log_hash_chain_trg BEFORE INSERT ON public.audit_auditlog FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();


--
-- Name: audit_auditlog audit_log_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON public.audit_auditlog FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();


--
-- Name: audit_auditlog audit_log_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON public.audit_auditlog FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_append_only();


--
-- Name: audit_auditlog audit_log_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON public.audit_auditlog FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();


--
-- Name: pentesters_pentesterprofile pentesters_tsv_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pentesters_tsv_trg BEFORE INSERT OR UPDATE OF headline, bio ON public.pentesters_pentesterprofile FOR EACH ROW EXECUTE FUNCTION public.pentesters_tsv_update();


--
-- Name: proposals_proposal proposals_tsv_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proposals_tsv_trg BEFORE INSERT OR UPDATE OF title, description ON public.proposals_proposal FOR EACH ROW EXECUTE FUNCTION public.proposals_tsv_update();


--
-- Name: accounts_user_groups accounts_user_groups_group_id_bd11a704_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_group_id_bd11a704_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_user_id_52b62117_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_52b62117_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_permission_id_113bb443_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_permission_id_113bb443_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_user_id_e4f0a161_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_user_id_e4f0a161_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: applications_application applications_applica_pentester_id_27128907_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_application
    ADD CONSTRAINT applications_applica_pentester_id_27128907_fk_pentester FOREIGN KEY (pentester_id) REFERENCES public.pentesters_pentesterprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: applications_application applications_applica_proposal_id_92423806_fk_proposals; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications_application
    ADD CONSTRAINT applications_applica_proposal_id_92423806_fk_proposals FOREIGN KEY (proposal_id) REFERENCES public.proposals_proposal(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: audit_auditlog audit_auditlog_actor_id_20e70a27_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_auditlog
    ADD CONSTRAINT audit_auditlog_actor_id_20e70a27_fk_accounts_user_id FOREIGN KEY (actor_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: axes_accessattemptexpiration axes_accessattemptex_access_attempt_id_6b73a47a_fk_axes_acce; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.axes_accessattemptexpiration
    ADD CONSTRAINT axes_accessattemptex_access_attempt_id_6b73a47a_fk_axes_acce FOREIGN KEY (access_attempt_id) REFERENCES public.axes_accessattempt(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pentesters_pentestercertification pentesters_pentester_certification_id_110ca9b1_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentestercertification
    ADD CONSTRAINT pentesters_pentester_certification_id_110ca9b1_fk_pentester FOREIGN KEY (certification_id) REFERENCES public.pentesters_certification(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pentesters_pentestercertification pentesters_pentester_pentester_id_2f8d9342_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentestercertification
    ADD CONSTRAINT pentesters_pentester_pentester_id_2f8d9342_fk_pentester FOREIGN KEY (pentester_id) REFERENCES public.pentesters_pentesterprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pentesters_pentesterprofile_specialties pentesters_pentester_pentesterprofile_id_03c85e74_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile_specialties
    ADD CONSTRAINT pentesters_pentester_pentesterprofile_id_03c85e74_fk_pentester FOREIGN KEY (pentesterprofile_id) REFERENCES public.pentesters_pentesterprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pentesters_pentesterprofile_specialties pentesters_pentester_specialty_id_d9a878eb_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile_specialties
    ADD CONSTRAINT pentesters_pentester_specialty_id_d9a878eb_fk_pentester FOREIGN KEY (specialty_id) REFERENCES public.pentesters_specialty(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pentesters_pentesterprofile pentesters_pentester_tenant_id_9edc0786_fk_tenants_t; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pentesters_pentesterprofile
    ADD CONSTRAINT pentesters_pentester_tenant_id_9edc0786_fk_tenants_t FOREIGN KEY (tenant_id) REFERENCES public.tenants_tenant(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposals_proposal_specialties proposals_proposal_s_proposal_id_fb6272bb_fk_proposals; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal_specialties
    ADD CONSTRAINT proposals_proposal_s_proposal_id_fb6272bb_fk_proposals FOREIGN KEY (proposal_id) REFERENCES public.proposals_proposal(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposals_proposal_specialties proposals_proposal_s_specialty_id_994d8349_fk_pentester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal_specialties
    ADD CONSTRAINT proposals_proposal_s_specialty_id_994d8349_fk_pentester FOREIGN KEY (specialty_id) REFERENCES public.pentesters_specialty(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposals_proposal proposals_proposal_tenant_id_fee32b5b_fk_tenants_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals_proposal
    ADD CONSTRAINT proposals_proposal_tenant_id_fee32b5b_fk_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants_tenant(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tenants_membership tenants_membership_tenant_id_55f75d05_fk_tenants_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_membership
    ADD CONSTRAINT tenants_membership_tenant_id_55f75d05_fk_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants_tenant(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tenants_membership tenants_membership_user_id_2c860192_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants_membership
    ADD CONSTRAINT tenants_membership_user_id_2c860192_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: applications_application; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications_application ENABLE ROW LEVEL SECURITY;

--
-- Name: applications_application applications_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY applications_owner ON public.applications_application USING (((proposal_id IN ( SELECT proposals_proposal.id
   FROM public.proposals_proposal
  WHERE (proposals_proposal.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint))) OR (pentester_id IN ( SELECT pentesters_pentesterprofile.id
   FROM public.pentesters_pentesterprofile
  WHERE (pentesters_pentesterprofile.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint))))) WITH CHECK ((pentester_id IN ( SELECT pentesters_pentesterprofile.id
   FROM public.pentesters_pentesterprofile
  WHERE (pentesters_pentesterprofile.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint))));


--
-- Name: proposals_proposal proposals_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proposals_owner ON public.proposals_proposal USING ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)) WITH CHECK ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint));


--
-- Name: proposals_proposal; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposals_proposal ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals_proposal proposals_published_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proposals_published_read ON public.proposals_proposal FOR SELECT USING (((status)::text = 'PUBLISHED'::text));


--
-- PostgreSQL database dump complete
--

\unrestrict g7UmkwaaMpydEcWkuZWzaplgV3lvO40LFt6uHMk8CcaRWAcAd6CxdCWbFPEnCew

