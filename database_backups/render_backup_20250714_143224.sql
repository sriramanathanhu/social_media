--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: socialmediadb_82lt_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO socialmediadb_82lt_user;

--
-- Name: update_live_streams_updated_at(); Type: FUNCTION; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE FUNCTION public.update_live_streams_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_live_streams_updated_at() OWNER TO socialmediadb_82lt_user;

--
-- Name: update_stream_apps_updated_at(); Type: FUNCTION; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE FUNCTION public.update_stream_apps_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stream_apps_updated_at() OWNER TO socialmediadb_82lt_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_groups; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.account_groups (
    id integer NOT NULL,
    user_id integer,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#1976D2'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.account_groups OWNER TO socialmediadb_82lt_user;

--
-- Name: account_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.account_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_groups_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: account_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.account_groups_id_seq OWNED BY public.account_groups.id;


--
-- Name: api_credentials; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.api_credentials (
    id integer NOT NULL,
    platform character varying(50) NOT NULL,
    client_id character varying(255) NOT NULL,
    client_secret character varying(255) NOT NULL,
    created_by integer,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT api_credentials_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.api_credentials OWNER TO socialmediadb_82lt_user;

--
-- Name: api_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.api_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_credentials_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: api_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.api_credentials_id_seq OWNED BY public.api_credentials.id;


--
-- Name: live_streams; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.live_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    stream_key character varying(255) NOT NULL,
    rtmp_url character varying(255) NOT NULL,
    source_app character varying(255) DEFAULT 'live'::character varying,
    source_stream character varying(255),
    status character varying(50) DEFAULT 'inactive'::character varying,
    app_id uuid,
    app_key_id uuid,
    destinations jsonb DEFAULT '[]'::jsonb,
    quality_settings jsonb DEFAULT '{}'::jsonb,
    auto_post_enabled boolean DEFAULT false,
    auto_post_accounts text[],
    auto_post_message text,
    category character varying(100),
    tags text[],
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    thumbnail_url character varying(255),
    CONSTRAINT live_streams_status_check CHECK (((status)::text = ANY ((ARRAY['inactive'::character varying, 'live'::character varying, 'ended'::character varying, 'error'::character varying])::text[])))
);


ALTER TABLE public.live_streams OWNER TO socialmediadb_82lt_user;

--
-- Name: oauth_states; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.oauth_states (
    id integer NOT NULL,
    state_key character varying(255) NOT NULL,
    user_id integer,
    platform character varying(50) NOT NULL,
    instance_url character varying(255),
    client_id character varying(255),
    client_secret character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '01:00:00'::interval),
    extra_data text
);


ALTER TABLE public.oauth_states OWNER TO socialmediadb_82lt_user;

--
-- Name: oauth_states_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.oauth_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.oauth_states_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: oauth_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.oauth_states_id_seq OWNED BY public.oauth_states.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer,
    content text NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    target_accounts jsonb,
    published_at timestamp without time zone,
    scheduled_for timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    media_urls jsonb DEFAULT '[]'::jsonb,
    post_type character varying(20) DEFAULT 'text'::character varying,
    is_scheduled boolean DEFAULT false,
    CONSTRAINT posts_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'video'::character varying, 'reel'::character varying])::text[])))
);


ALTER TABLE public.posts OWNER TO socialmediadb_82lt_user;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: social_accounts; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.social_accounts (
    id integer NOT NULL,
    user_id integer,
    platform character varying(50) NOT NULL,
    instance_url character varying(255),
    username character varying(255) NOT NULL,
    display_name character varying(255),
    avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp without time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    last_used timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    group_id integer
);


ALTER TABLE public.social_accounts OWNER TO socialmediadb_82lt_user;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.social_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_accounts_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.social_accounts_id_seq OWNED BY public.social_accounts.id;


--
-- Name: stream_app_keys; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.stream_app_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_id uuid NOT NULL,
    key_name character varying(255) NOT NULL,
    stream_key character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stream_app_keys OWNER TO socialmediadb_82lt_user;

--
-- Name: stream_apps; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.stream_apps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    app_name character varying(255) NOT NULL,
    description text,
    rtmp_app_path character varying(255) NOT NULL,
    default_stream_key character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stream_apps_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'deleted'::character varying])::text[])))
);


ALTER TABLE public.stream_apps OWNER TO socialmediadb_82lt_user;

--
-- Name: stream_republishing; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.stream_republishing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid NOT NULL,
    user_id integer NOT NULL,
    destination_name character varying(255) NOT NULL,
    destination_url character varying(255) NOT NULL,
    destination_port integer DEFAULT 1935,
    destination_app character varying(255) NOT NULL,
    destination_stream character varying(255) NOT NULL,
    destination_key character varying(255),
    enabled boolean DEFAULT true,
    priority integer DEFAULT 1,
    retry_attempts integer DEFAULT 3,
    status character varying(50) DEFAULT 'inactive'::character varying,
    last_error text,
    last_connected_at timestamp with time zone,
    connection_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stream_republishing_status_check CHECK (((status)::text = ANY ((ARRAY['inactive'::character varying, 'active'::character varying, 'error'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.stream_republishing OWNER TO socialmediadb_82lt_user;

--
-- Name: stream_sessions; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.stream_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid NOT NULL,
    user_id integer NOT NULL,
    session_key character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp with time zone,
    duration_seconds integer,
    peak_viewers integer DEFAULT 0,
    viewer_count integer DEFAULT 0,
    bytes_sent bigint DEFAULT 0,
    bytes_received bigint DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stream_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'ended'::character varying, 'error'::character varying])::text[])))
);


ALTER TABLE public.stream_sessions OWNER TO socialmediadb_82lt_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'user'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO socialmediadb_82lt_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO socialmediadb_82lt_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: account_groups id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.account_groups ALTER COLUMN id SET DEFAULT nextval('public.account_groups_id_seq'::regclass);


--
-- Name: api_credentials id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.api_credentials ALTER COLUMN id SET DEFAULT nextval('public.api_credentials_id_seq'::regclass);


--
-- Name: oauth_states id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.oauth_states ALTER COLUMN id SET DEFAULT nextval('public.oauth_states_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: social_accounts id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.social_accounts ALTER COLUMN id SET DEFAULT nextval('public.social_accounts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account_groups; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.account_groups (id, user_id, name, description, color, created_at, updated_at) FROM stdin;
1	2	Mastadon		#1976D2	2025-07-05 23:54:47.859275	2025-07-05 23:54:47.859275
\.


--
-- Data for Name: api_credentials; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.api_credentials (id, platform, client_id, client_secret, created_by, status, created_at, updated_at) FROM stdin;
4	x	MWNMaWZTZjN2WjlCanhzamZfUWw6MTpjaQ	un_2oE_ROT0MblmMa-TrJSvMv4B2I6DIeWfaIJ8P1s-3phtNPg	2	active	2025-07-05 18:11:10.308001	2025-07-05 18:11:10.308001
\.


--
-- Data for Name: live_streams; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.live_streams (id, user_id, title, description, stream_key, rtmp_url, source_app, source_stream, status, app_id, app_key_id, destinations, quality_settings, auto_post_enabled, auto_post_accounts, auto_post_message, category, tags, is_public, created_at, updated_at, started_at, ended_at, thumbnail_url) FROM stdin;
c1a8b9c8-7946-4c98-88c5-4a2d4759d4b7	2	RMN		darshan	rtmp://37.27.201.26:1935/live	live	\N	inactive	ae00aa90-d946-4ed2-ad3b-925e3f1c0c97	ed3efe4f-f61f-480c-8bb4-843466e51605	[]	{"bitrate": 4000, "framerate": 30, "resolution": "1920x1080", "audio_bitrate": 128}	f	{}	\N	\N	{}	t	2025-07-13 17:31:34.70556+00	2025-07-13 17:31:34.70556+00	\N	\N	\N
25225966-1c23-4d00-943b-97d3395676ed	2	RMN Test 2		live	rtmp://37.27.201.26:1935/socialmedia	live	\N	inactive	d4832d1c-582c-42cd-b7d6-5ddcc00efffd	8c6bdf90-2023-48a4-a16a-172a71c56e5d	[]	{"bitrate": 4000, "framerate": 30, "resolution": "1920x1080", "audio_bitrate": 128}	f	{}	\N	\N	{}	t	2025-07-13 17:43:34.619909+00	2025-07-13 17:44:26.612543+00	\N	\N	\N
\.


--
-- Data for Name: oauth_states; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.oauth_states (id, state_key, user_id, platform, instance_url, client_id, client_secret, created_at, expires_at, extra_data) FROM stdin;
1	mastodon_16f617eaf9e7367acc97e76f2f26eb82	2	mastodon	https://mastodon.social	wEMmbXdk4yizDMmmYuKB938xNQuJIWX8CEr_XRIUh_M	cHOyhMtQRBi2f5L7K0-tREbMNIbtr_Ic5PUlr1kF_x8	2025-07-04 22:53:42.383907	2025-07-04 23:53:42.383907	\N
2	mastodon_a794c7c1821a965eaffd3ebc0bf43919	2	mastodon	https://mastodon.social	4taSwgb0OzrMzS_wrJr7l9LRYJrY4BkvHpiWVSdEFfI	2nV9TPuyb9i1ksZjtF86P8YFHpn1KfGwNpEDoI5ng3k	2025-07-04 22:54:06.858982	2025-07-04 23:54:06.858982	\N
3	mastodon_db72a444246b59c7ef6b1de62859d183	2	mastodon	https://mastodon.social	r7wRsTjNLz3WHoJeR4Ef5xOCvdknrnUaB1Bbkw21qP8	aP2CbbGXWMotHWh0HcICoC9C-72LXFDnTgjUoLh9MEk	2025-07-04 22:55:39.7796	2025-07-04 23:55:39.7796	\N
4	mastodon_a12eafba33b841f9b8a52e6b1a765859	2	mastodon	https://mastodon.social	iRDMDK1dg27EI9vCBLIRVmLG-A3MoatwGtMFkctSxns	4NMHz12jPq81gIhwOb_lraxKlQ4GpF9Mr-G8dc5v_po	2025-07-04 22:57:46.994597	2025-07-04 23:57:46.994597	\N
17	x_d87b0408d17198ce18e990bdc756b04b	2	x	\N	\N	\N	2025-07-05 16:58:40.658718	2025-07-05 17:58:40.658718	wUSYkJ-PiWHjJpjukDF2GVgdRXpkLXbFoqRj5ktzhzE
18	x_d9923f9400ec01e1745f9f8b7b19597a	2	x	\N	\N	\N	2025-07-05 16:59:22.065003	2025-07-05 17:59:22.065003	wKEMPDcX2R_SEeE4lDR1aqPZ5ynMUgVRtVunpKZgxaY
19	x_f6f8536306d2a251af8ccf370ba47696	2	x	\N	\N	\N	2025-07-05 17:10:53.146583	2025-07-05 18:10:53.146583	jWA-EGZChjM4JmbD8d-XmElq07vv65-T7WZp3SBWkq8
20	x_062adc617d1a696a01805e94f9b2f591	2	x	\N	\N	\N	2025-07-05 17:13:05.352755	2025-07-05 18:13:05.352755	Rhc9SGo6e-V12qO260HCIB0WXxAExfVI9SlLgCDFo8s
21	x_b1e135ec5f1c6c9cd71bb4f7b44d84a0	2	x	\N	\N	\N	2025-07-05 17:18:07.344056	2025-07-05 18:18:07.344056	rlSwZNGo1ThVy3_zuzN1MrHJADpZQTJWB95xIjft6l0
22	x_5b4d6cbf88a0645d11a78b295eddf127	3	x	\N	\N	\N	2025-07-05 17:20:16.605555	2025-07-05 18:20:16.605555	1FY1iawDsYtH56_Zh2tmv_n-knqYgPqZKh79xQuPDe8
23	x_81ea93c07952c2790c9b65c1e9f27062	2	x	\N	\N	\N	2025-07-05 17:24:08.110069	2025-07-05 18:24:08.110069	G7hAEgxmUbr5Cp0fm96H_6Izoj7EO8Giz8A2Xo6Oscs
24	x_7bfd6e071c8ec3e6c7624f011c21b826	3	x	\N	\N	\N	2025-07-05 17:24:38.639741	2025-07-05 18:24:38.639741	IgY-vKwVmZKnRr8f8WtHHjzsggouMnRq5qOZai1POfI
25	x_86f7c1db621f4cc26901b9d5afeba1d2	3	x	\N	\N	\N	2025-07-05 17:26:50.47481	2025-07-05 18:26:50.47481	YG35shwFRpsups9-Lc7-iuKWoKOT7GMx5ikA2P5-rjE
26	x_ab8fdeca31786ff18f1b3ed59eea6603	2	x	\N	\N	\N	2025-07-05 17:36:10.730646	2025-07-05 18:36:10.730646	Ur5paE2opUuDf7e70gI0CIzbDyX_dUDmKoCpVOVilf8
27	x_17cd9a0ab073ba1bbcf63d1c87907699	2	x	\N	\N	\N	2025-07-05 17:40:12.686088	2025-07-05 18:40:12.686088	BgL5dAWQlIO8TyC9-834qfhlis3eUOmQHOLy9TkQFY8
28	x_4fc11b57db11e3085bbf09898d5739a6	3	x	\N	\N	\N	2025-07-05 17:40:52.692977	2025-07-05 18:40:52.692977	yyzNid4JvTDG4qJ-GEQicst9-ZyrTnQVpdgPcRGyksg
29	x_c4321548f6fd1a1ea69797012f30ffce	3	x	\N	\N	\N	2025-07-05 17:53:24.894754	2025-07-05 18:53:24.894754	yMi7osERkYQ8aQC2vyz4bKRBujqIdVJALqfIS5CQmFg
30	x_acd746f299ac8030b6af356f38b32c66	2	x	\N	\N	\N	2025-07-05 17:54:26.609771	2025-07-05 18:54:26.609771	BhteuGOW6sdy6XPmMqIFwBvfBmNnEBsza8zZY9-cuv4
31	x_b383c1ca05c74fd027aeba83c6f3edea	2	x	\N	\N	\N	2025-07-05 18:11:22.817538	2025-07-05 19:11:22.817538	QwNXAQA7Toye7srlArlvWOhjpOcxx3ZiSWRbjOkJCgw
32	x_26493423c7955e11304b070319fd0ef7	3	x	\N	\N	\N	2025-07-05 18:13:33.093357	2025-07-05 19:13:33.093357	Asvw2aKiafQQqtKzbztzH6dOZBPM2YF2lKggKsIazW4
33	x_2daefc6d967d392217ffb32f60f73735	2	x	\N	\N	\N	2025-07-05 18:31:30.628419	2025-07-05 19:31:30.628419	zgmLjdyQdrCCGoqdpUvsTBGcWBV9k7A1CPt1Sq9H70w
34	x_8a0e497492ae2ca90ec5c5e110cccd78	2	x	\N	\N	\N	2025-07-05 18:54:27.478396	2025-07-05 19:54:27.478396	8JMo3b7V7sSGRjbNKlzb1Z1_sp2JENLOgB7qAy-Wv3w
35	x_882a9e3193844e3726af6ed5304771da	2	x	\N	\N	\N	2025-07-05 18:58:47.15439	2025-07-05 19:58:47.15439	7terQOzPKcuZl5KO1X9Ix-DP7Owp-obrLyCbBi5pWYg
36	x_612fcf1be3cfefec4a404933bbc07680	2	x	\N	\N	\N	2025-07-05 18:59:44.786603	2025-07-05 19:59:44.786603	SITxuG1pXgpCqKMIOE7huWjqp7cUozcq7HfMsoszalk
37	x_b64476a74e83322b02f7dc43270bfdb9	2	x	\N	\N	\N	2025-07-05 19:03:05.244102	2025-07-05 20:03:05.244102	DFk2RpYGBub6S4haSmL5ec4UqAvCbBNWWNINA4nbWGQ
44	x_f519c8937f25e5b35fca14970270855e	2	x	\N	\N	\N	2025-07-05 19:15:02.379068	2025-07-05 20:15:02.379068	eRF2iVArSAKUl_uSF0WGy0CpmNOrvlYoewstBtZ2xSw
45	x_ed481525292eadeb54340da5eb56902c	2	x	\N	\N	\N	2025-07-05 19:16:59.739127	2025-07-05 20:16:59.739127	eDNt0aj_G5lnbqCsbHa-lW4lR_rirI0cWT1N9vc6zxY
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.posts (id, user_id, content, status, target_accounts, published_at, scheduled_for, error_message, created_at, updated_at, media_urls, post_type, is_scheduled) FROM stdin;
1	2	Nithyanandam	published	[1]	2025-07-05 14:00:16.996	\N	\N	2025-07-05 14:00:16.405684	2025-07-05 14:00:16.996848	[]	text	f
2	2	Nithyanandam	failed	[1]	\N	\N	Some accounts failed to publish	2025-07-05 14:09:10.943592	2025-07-05 14:09:11.286611	[]	text	f
3	2	Nithyanandam	published	[1]	2025-07-05 14:11:07.53	\N	\N	2025-07-05 14:11:07.100521	2025-07-05 14:11:07.531836	[]	text	f
4	2	Blessings	failed	[2]	\N	\N	Some accounts failed to publish	2025-07-05 14:15:02.107107	2025-07-05 14:15:02.116709	[]	text	f
5	2	NIthyanandam	published	[2]	2025-07-05 14:15:29.568	\N	\N	2025-07-05 14:15:29.22552	2025-07-05 14:15:29.572049	[]	text	f
6	2	Blessings!!	published	[2]	2025-07-05 14:20:40.943	\N	\N	2025-07-05 14:20:39.036221	2025-07-05 14:20:40.946033	[]	text	f
7	2	Nithyanandam	published	[3]	2025-07-05 14:55:15.601	\N	\N	2025-07-05 14:55:15.192271	2025-07-05 14:55:15.602733	[]	text	f
8	2	Nithyanandam	failed	[3, 2]	\N	\N	Some accounts failed to publish	2025-07-05 15:05:38.86557	2025-07-05 15:05:39.678403	[]	text	f
9	2	Blessings!!	failed	[3, 2]	\N	\N	Some accounts failed to publish	2025-07-05 15:06:22.702678	2025-07-05 15:06:23.174219	[]	text	f
10	2	Blessings!!	failed	[3, 2]	\N	\N	Some accounts failed to publish	2025-07-05 15:08:27.379457	2025-07-05 15:08:28.127271	[]	text	f
11	2	Nithyanandam	failed	[3, 2]	\N	\N	Some accounts failed to publish	2025-07-05 15:09:49.289647	2025-07-05 15:09:49.77555	[]	text	f
12	2	Nithyanandam	failed	[3, 2]	\N	\N	Some accounts failed to publish	2025-07-05 15:13:28.736098	2025-07-05 15:13:29.139572	[]	text	f
13	2	Nithyanandam	published	[4, 3]	2025-07-05 15:14:44.601	\N	\N	2025-07-05 15:14:43.875477	2025-07-05 15:14:44.602168	[]	text	f
14	2	Blessings!!	published	[4, 3]	2025-07-05 15:17:35.991	\N	\N	2025-07-05 15:17:32.009023	2025-07-05 15:17:35.991875	[]	text	f
15	2	🌀 Your voice is scripting your future — word by word.\r\n\r\n✨ One whisper can shape a paradise… or seal a dead end.\r\n\r\n🌺 The SPH  reveals: Sound is not speech — it’s creation .\r\n\r\n💥 If you’ve ever talked yourself out of your own dream, this is your turning point.\r\n\r\n🔗 https://medium.com/p/6ec23a68d54c — not just a link. A lifeline to who you could be.	published	[5, 4, 3]	2025-07-05 15:24:28.027	\N	\N	2025-07-05 15:24:26.326086	2025-07-05 15:24:28.027482	[]	text	f
16	2	👁️‍🗨️ "They looked perfect. But something felt...off."\r\nYour soul knew. Your body screamed. But your mind got fooled.\r\n\r\n🧠 The SPH reveals the ancient Hindu technique to read people before they betray you.\r\n\r\n💥 Never ignore your inner clarity again. This is how spiritual warriors see through masks.\r\n\r\n🔗 From deception to perception:\r\nhttps://medium.com/p/bc5a1fe4d7d1	published	[5, 4, 3]	2025-07-05 15:26:43.076	\N	\N	2025-07-05 15:26:42.02849	2025-07-05 15:26:43.075982	[]	text	f
17	2	When you live in a laughing light mood, you will become Shiva. How to become Shiva? – just laugh. #AskNithyananda	published	[8, 7, 5, 4, 3]	2025-07-05 19:22:35.204	\N	\N	2025-07-05 19:22:33.602663	2025-07-05 19:22:35.205069	[]	text	f
18	2	🌍 05 JULY 2025 – Paramashivasena – UAN Delegate Training Summit | DAY 05 | SEASON 2 | WITH THE SUPREME PONTIFF OF HINDUISM (SPH) BHAGAVAN SRI NITHYANANDA PARAMASHIVAM	scheduled	[5, 4, 3, 8, 7]	\N	2025-07-06 03:13:00	\N	2025-07-06 00:12:50.31172	2025-07-06 00:12:50.31172	[]	image	t
19	2	🌍 05 JULY 2025 – Paramashivasena – UAN Delegate Training Summit | DAY 05 | SEASON 2 | WITH THE SUPREME PONTIFF OF HINDUISM (SPH) BHAGAVAN SRI NITHYANANDA PARAMASHIVAM	failed	[5, 4, 3, 8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 00:34:00.570544	2025-07-06 00:34:06.892461	[]	image	f
20	2	🌍 05 JULY 2025 – Paramashivasena – UAN Delegate Training Summit | DAY 05 | SEASON 2 | WITH THE SUPREME PONTIFF OF HINDUISM (SPH) BHAGAVAN SRI NITHYANANDA PARAMASHIVAM	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 00:40:34.114128	2025-07-06 00:40:34.209879	[]	image	f
21	2	🌍 05 JULY 2025 – Paramashivasena – UAN Delegate Training Summit | DAY 05 | SEASON 2 | WITH THE SUPREME PONTIFF OF HINDUISM (SPH) BHAGAVAN SRI NITHYANANDA PARAMASHIVAM	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 01:01:21.664235	2025-07-06 01:01:21.851873	[]	image	f
22	2	If you close your eyes for a moment and feel your whole being smiling, radiating bliss, this will awaken your intelligence completely, unlocking the treasures of all your chakras. #AskNithyananda	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 01:03:12.609479	2025-07-06 01:03:12.717588	[]	text	f
23	2	If you close your eyes for a moment and feel your whole being smiling, radiating bliss, this will awaken your intelligence completely, unlocking the treasures of all your chakras. #AskNithyananda	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 01:10:46.836414	2025-07-06 01:10:47.428656	[]	image	f
24	2	If you close your eyes for a moment and feel your whole being smiling, radiating bliss, this will awaken your intelligence completely, unlocking the treasures of all your chakras. #AskNithyananda	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 01:11:15.741193	2025-07-06 01:11:15.831682	[]	text	f
25	2	If you close your eyes for a moment and feel your whole being smiling, radiating bliss, this will awaken your intelligence completely, unlocking the treasures of all your chakras.	failed	[8, 7]	\N	\N	Some accounts failed to publish	2025-07-06 01:18:37.507366	2025-07-06 01:18:37.729574	[]	text	f
26	2	If you close your eyes for a moment and feel your whole being smiling, radiating bliss, this will awaken your intelligence completely, unlocking the treasures of all your chakras.	published	[10, 9]	2025-07-06 01:23:28.905	\N	\N	2025-07-06 01:23:28.533529	2025-07-06 01:23:28.905522	[]	text	f
27	2	05 JULY 2025 – Paramashivasena – UAN Delegate Training Summit | DAY 05 | SEASON 2 | WITH THE SUPREME PONTIFF OF HINDUISM (SPH) BHAGAVAN SRI NITHYANANDA PARAMASHIVAM	published	[10, 9]	2025-07-06 01:25:09.068	\N	\N	2025-07-06 01:25:08.296993	2025-07-06 01:25:09.068433	[]	image	f
28	2	Paramashivasena – UAN Delegate Training Summit	published	[10, 9]	2025-07-06 01:30:02.999	\N	\N	2025-07-06 01:30:02.274614	2025-07-06 01:30:02.999761	[]	image	f
29	2	Paramashivasena – UAN Delegate Training Summit	failed	[12, 11]	\N	\N	Some accounts failed to publish	2025-07-06 01:36:26.38306	2025-07-06 01:36:26.884928	[]	image	f
30	2	Paramashivasena – UAN Delegate Training Summit	failed	[12, 11]	\N	\N	Some accounts failed to publish	2025-07-06 01:41:14.666182	2025-07-06 01:41:14.854366	[]	text	f
31	2	Nithyanandam	failed	[12, 11]	\N	\N	Some accounts failed to publish	2025-07-06 11:56:45.46841	2025-07-06 11:56:45.679124	[]	text	f
32	2	Nithyanandam	published	[14, 13]	2025-07-06 12:07:56.605	\N	\N	2025-07-06 12:07:56.201317	2025-07-06 12:07:56.607439	[]	text	f
33	2	Nithyanandam	failed	[14, 13]	\N	\N	Some accounts failed to publish	2025-07-06 12:10:07.107605	2025-07-06 12:10:07.751073	[]	image	f
34	2	Blessings!!	failed	[14, 13]	\N	\N	Some accounts failed to publish	2025-07-06 12:10:41.47738	2025-07-06 12:10:41.741259	[]	text	f
35	2	Nithyanandam	failed	[14, 13]	\N	\N	Some accounts failed to publish	2025-07-06 12:29:26.607552	2025-07-06 12:29:26.75061	[]	text	f
36	2	Blessings!!	failed	[16, 15]	\N	\N	Some accounts failed to publish	2025-07-06 12:31:02.652549	2025-07-06 12:31:02.810447	[]	text	f
37	2	Paramashiva Sena Darshan Blessings	failed	[16, 15]	\N	\N	Some accounts failed to publish	2025-07-06 14:41:35.650374	2025-07-06 14:41:36.376558	[]	image	f
38	2	Testing the social media scheduler application 🙏	failed	[5, 4, 3, 16, 15]	\N	\N	Some accounts failed to publish	2025-07-06 15:50:59.571676	2025-07-06 15:51:01.2333	[]	text	f
39	2	Nithyanandam	failed	[22]	\N	\N	Some accounts failed to publish	2025-07-07 04:03:15.544589	2025-07-07 04:03:16.598594	[]	image	f
40	2	NIthyanandam	failed	[23]	\N	\N	Some accounts failed to publish	2025-07-07 04:52:14.005724	2025-07-07 04:52:15.060689	[]	image	f
41	2	Blessings!!	published	[25]	2025-07-09 20:11:21.719	\N	\N	2025-07-09 20:11:21.138987	2025-07-09 20:11:21.721032	[]	image	f
42	2	Blessings to all.	published	[25]	2025-07-09 20:26:59.916	\N	\N	2025-07-09 20:26:59.308375	2025-07-09 20:26:59.917908	[]	image	f
43	2	Blessings to All!!	published	[29, 27]	2025-07-09 20:41:34.406	\N	\N	2025-07-09 20:41:33.467677	2025-07-09 20:41:34.407952	[]	image	f
44	2	Nithyanandam	published	[29, 27]	2025-07-09 20:52:53.993	\N	\N	2025-07-09 20:52:52.910584	2025-07-09 20:52:53.996557	[]	image	f
45	2	Nithyanandam	published	[29, 27]	2025-07-09 21:01:55.251	\N	\N	2025-07-09 21:01:54.924425	2025-07-09 21:01:55.251928	[]	image	f
46	2	Nithyanandam	published	[29, 27]	2025-07-09 23:13:56.031	\N	\N	2025-07-09 23:13:54.895002	2025-07-09 23:13:56.035459	[]	image	f
47	2	Nithyanandam	published	[29, 27]	2025-07-09 23:24:06.826	\N	\N	2025-07-09 23:24:05.73932	2025-07-09 23:24:06.827868	[]	image	f
48	2	N	published	[29, 27]	2025-07-09 23:29:27.937	\N	\N	2025-07-09 23:29:27.651421	2025-07-09 23:29:27.938356	[]	image	f
49	2	O	published	[29]	2025-07-09 23:31:20.358	\N	\N	2025-07-09 23:31:20.232053	2025-07-09 23:31:20.359999	[]	image	f
50	2	N	published	[29]	2025-07-09 23:36:02.444	\N	\N	2025-07-09 23:36:01.917952	2025-07-09 23:36:02.447336	[]	image	f
51	2	Guru Purnima Blessings	published	[29, 27]	2025-07-10 05:40:03.439	\N	\N	2025-07-10 05:40:02.373241	2025-07-10 05:40:03.438753	[]	image	f
52	2	Guru Purnima Blessings	published	[29, 27]	2025-07-10 05:53:35.449	\N	\N	2025-07-10 05:53:34.341049	2025-07-10 05:53:35.450226	[]	image	f
53	2	Blessings to All	published	[29, 27]	2025-07-10 06:14:04.563	\N	\N	2025-07-10 06:14:01.199549	2025-07-10 06:14:04.56503	[]	image	f
54	2	KAILASA'S GURU PURNIMA 2025\r\n\r\nOn this sacred day of Guru Purnima, The Supreme Pontiff of Hinduism (SPH), Bhagavan Sri Nithyananda Paramashiva, showers His divine grace and blessings upon all of us, awakening higher consciousness, spiritual clarity, and inner strength.	published	[29, 27]	2025-07-10 06:32:24.815	\N	\N	2025-07-10 06:32:22.046625	2025-07-10 06:32:24.816224	[]	image	f
55	2	KAILASA'S GURU PURNIMA 2025\r\nOn this sacred day of Guru Purnima, The Supreme Pontiff of Hinduism (SPH), Bhagavan Sri Nithyananda Paramashiva, showers His divine grace and blessings upon all of us, awakening higher consciousness, spiritual clarity, and inner strength.	failed	[16, 15]	\N	\N	Some accounts failed to publish	2025-07-10 07:32:43.941908	2025-07-10 07:32:44.899406	[]	image	f
56	2	On this sacred day of Guru Purnima, The Supreme Pontiff of Hinduism (SPH), Bhagavan Sri Nithyananda Paramashiva, showers His divine grace and blessings upon all of us, awakening higher consciousness, spiritual clarity, and inner strength.	failed	[16, 15]	\N	\N	Some accounts failed to publish	2025-07-10 12:30:02.873785	2025-07-10 12:30:03.04522	[]	text	f
57	2	On this sacred day of Guru Purnima, The Supreme Pontiff of Hinduism (SPH), Bhagavan Sri Nithyananda Paramashiva, showers His divine grace and blessings upon all of us, awakening higher consciousness, spiritual clarity, and inner strength.	published	[31, 30]	2025-07-10 12:32:40.044	\N	\N	2025-07-10 12:32:38.685065	2025-07-10 12:32:40.044493	[]	image	f
58	2	The SPH Blesses all of us on the auspicious occasion of the Guru Purnima.	published	[31, 30]	2025-07-10 12:54:22.708	\N	\N	2025-07-10 12:54:21.39246	2025-07-10 12:54:22.708813	[]	image	f
59	2	The SPH Blesses all of us on the auspicious occasion of the Guru Purnima.	published	[31, 30]	2025-07-10 12:57:50.003	\N	\N	2025-07-10 12:57:48.033942	2025-07-10 12:57:50.004122	[]	image	f
60	2	The SPH Blesses all of us on the auspicious occasion of the Guru Purnima.	failed	[31, 30]	\N	\N	Some accounts failed to publish	2025-07-10 13:11:56.069423	2025-07-10 13:11:57.486585	[]	image	f
61	2	The SPH Blesses all of us on the auspicious occasion of the Guru Purnima.	published	[29, 27]	2025-07-10 13:16:32.37	\N	\N	2025-07-10 13:16:30.247039	2025-07-10 13:16:32.370119	[]	image	f
\.


--
-- Data for Name: social_accounts; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.social_accounts (id, user_id, platform, instance_url, username, display_name, avatar_url, access_token, refresh_token, token_expires_at, status, last_used, created_at, updated_at, group_id) FROM stdin;
5	2	mastodon	https://mastodon.social	SriNithyanandaTamil	KAILASA's SPH Nithyananda	https://mastodon.social/avatars/original/missing.png	f1112e89caee91b2bac660cb4549c783:791f92884c59d4abce617420cc4a33b3ff2072c018acd26ac498ec47c582129eed21d73d1c837063fffde491e5bb1221	\N	\N	active	2025-07-06 00:34:02.637249	2025-07-05 15:23:16.555754	2025-07-06 00:34:02.637249	1
3	2	mastodon	https://mastodon.social	nithyanandayoga	KAILASA's Nithyananda Yoga	https://files.mastodon.social/accounts/avatars/114/790/722/466/991/781/original/e9748c350435b6ca.jpg	c818f04940b1892a49d620e1a7fe8407:41b155782219b8c63f7a0d3441c34ac33830f773dcc043580855dcc8513ab291b307727bd70f7f9a4e8c67c957db5284	\N	\N	active	2025-07-06 00:34:04.595656	2025-07-05 14:49:52.281569	2025-07-06 00:34:04.595656	1
4	2	mastodon	https://mastodon.social	SriNithyananda	KAILASA's SPH Nithyananda	https://files.mastodon.social/accounts/avatars/114/445/044/896/750/112/original/1fc187283524fb7f.jpg	1c950a67403c75465bcaaa44442b6bad:6d19b1e79dc6f27b205681db427ce06988c65c78e6e32c2de0b650d4a34b79a0722847f430276eb209d28664a840c3e8	\N	\N	active	2025-07-06 00:34:06.889365	2025-07-05 15:14:32.210196	2025-07-06 00:34:06.889365	1
6	3	x	\N	kailasanation	United States Of KAILASA	\N	881941b50e76f31fd6a512052d5a5dbb:a4181ff40f505724d33266d81b796dd5105238c57f3cb78fc083a7b3800b79233b94da9d2c97b30a11ff5951acaa95acba399ee725f7b932b0aa370112fb6ef3a4866dd037a74870367c1e7012ecb097ce9e9c0a3cdf2b4f16178b0236a1df02	\N	2025-07-05 21:13:08.559	active	\N	2025-07-05 19:13:08.562357	2025-07-05 19:13:08.562357	\N
23	2	pinterest	\N	ramanathaananda	ramanathaananda	https://i.pinimg.com/600x600_R/30/52/20/305220a1685dd84587ed52ac0de3651f.jpg	7cde027983985cd0722482570fec7b83:881a081e1b88e3bf8a2c5f2a87c1d126ad1ade72e29234f263e90c273a80d9e0c3f7de0b64a3ee56deac64bd8eb5ac2150937d1aebf0af4aca70c9b3d280a2388b4c863606550242d3ddbbbaeb04b5b70f0d92100d7823612b421671eb2d6bfd1ae9c2fe13c68fc74c69b943a20b720b	\N	\N	active	\N	2025-07-07 04:11:50.935485	2025-07-07 04:11:50.935485	\N
30	2	x	\N	NithyanandaAi	Ask Nithyananda	\N	2582644e44f567a2063c04ce746b492a:be8b0b49d1a53ca9fbd55dfd5e6dbb1e35312d3e583a2225225f3f821ea45c539942af2b3c66bae25a9d2cdc8c349acfa2fa7d9bb26764b569a7cc9556aa3f6b93ccec187c9c4e20cbb88f8a33dca4c03f140bd68366e5354db2327578ae6ae0	\N	2025-07-10 14:31:17.627	active	2025-07-10 12:57:49.039716	2025-07-10 12:31:17.627053	2025-07-10 12:57:49.039716	\N
31	2	x	\N	kailasanation	United States Of KAILASA	\N	052194ef2f3a0fcc8c1ea45cda82a6c2:89215843cfc0dcfd74e03074547b1473e659d20e54b23241c6ee93aab911b339dc102473017948b9284c0762782c007aacfdcf525d1e8c8db4c798c809fe57c154f1f2072dd5e081b113375300aa18904b4144100e051017b50930494254e7b9	\N	2025-07-10 14:32:10.478	active	2025-07-10 12:57:50.001753	2025-07-10 12:32:10.47818	2025-07-10 12:57:50.001753	\N
29	2	bluesky	\N	nithyanandayoga.bsky.social	nithyanandayoga.bsky.social	\N	4c5d441a9c86f1ed3c3a56dea97d2ae0:5899829454d52b7d847e8eb936ee7e29b25c161aec26da710f672225112be210	\N	\N	active	2025-07-10 13:16:31.290258	2025-07-09 20:31:37.322475	2025-07-10 13:16:31.290258	\N
27	2	bluesky	\N	sphnithyananda.bsky.social	sphnithyananda.bsky.social	\N	d155cb7ed7d10ebf0fb8946efa9cb4bd:8f669388835bfe52d1b9e5fc8fb15ffaa5743eb7d576baf737216702e18f9d11	\N	\N	active	2025-07-10 13:16:32.367596	2025-07-09 20:29:13.017565	2025-07-10 13:16:32.367596	\N
\.


--
-- Data for Name: stream_app_keys; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.stream_app_keys (id, app_id, key_name, stream_key, description, is_active, usage_count, last_used_at, created_at, updated_at) FROM stdin;
ed3efe4f-f61f-480c-8bb4-843466e51605	ae00aa90-d946-4ed2-ad3b-925e3f1c0c97	YouTube	5b4w-rb4a-mrae-ddpq-ewus	Stream key for YouTube	t	6	2025-07-13 17:31:34.691726+00	2025-07-13 16:30:28.079562+00	2025-07-13 17:31:34.691726+00
834fde4f-12db-45d3-ace2-c428d31194c8	d4832d1c-582c-42cd-b7d6-5ddcc00efffd	primary	live	Primary stream key	t	0	\N	2025-07-13 17:42:20.057337+00	2025-07-13 17:42:20.057337+00
8c6bdf90-2023-48a4-a16a-172a71c56e5d	d4832d1c-582c-42cd-b7d6-5ddcc00efffd	YouTube	5b4w-rb4a-mrae-ddpq-ewus	Stream key for YouTube	t	1	2025-07-13 17:43:34.614186+00	2025-07-13 17:43:12.817868+00	2025-07-13 17:43:34.614186+00
\.


--
-- Data for Name: stream_apps; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.stream_apps (id, user_id, app_name, description, rtmp_app_path, default_stream_key, status, settings, created_at, updated_at) FROM stdin;
ae00aa90-d946-4ed2-ad3b-925e3f1c0c97	2	Social Media Public Stream		live	darshan	active	{}	2025-07-13 15:20:10.081986+00	2025-07-13 16:51:59.547488+00
d4832d1c-582c-42cd-b7d6-5ddcc00efffd	2	socialmedia		socialmedia	live	active	{}	2025-07-13 17:42:20.054991+00	2025-07-13 17:42:20.054991+00
\.


--
-- Data for Name: stream_republishing; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.stream_republishing (id, stream_id, user_id, destination_name, destination_url, destination_port, destination_app, destination_stream, destination_key, enabled, priority, retry_attempts, status, last_error, last_connected_at, connection_count, created_at, updated_at) FROM stdin;
a4e32131-4e87-4cf9-9f23-42e8c169c224	c1a8b9c8-7946-4c98-88c5-4a2d4759d4b7	2	youtube	a.rtmp.youtube.com	1935	live2	5b4w-rb4a-mrae-ddpq-ewus	\N	t	1	3	inactive	\N	\N	0	2025-07-13 17:31:34.716744+00	2025-07-13 17:31:34.716744+00
0a17785b-7a6a-424f-8416-f6abea3d21af	25225966-1c23-4d00-943b-97d3395676ed	2	youtube	a.rtmp.youtube.com	1935	live2	5b4w-rb4a-mrae-ddpq-ewus	\N	t	1	3	inactive	\N	\N	0	2025-07-13 17:43:34.626536+00	2025-07-13 17:43:34.626536+00
\.


--
-- Data for Name: stream_sessions; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.stream_sessions (id, stream_id, user_id, session_key, status, started_at, ended_at, duration_seconds, peak_viewers, viewer_count, bytes_sent, bytes_received, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: socialmediadb_82lt_user
--

COPY public.users (id, email, password_hash, created_at, updated_at, role, status) FROM stdin;
1	test@example.com	$2a$12$R7VVNYPCBuNP0gMbdmJeburTt6qk6fcp960Zbg6K0bFVldaYfuJJC	2025-07-04 21:15:58.927269	2025-07-05 20:13:14.695999	admin	approved
4	sri.ramanatha@nithyanandauniversity.org	$2a$12$.TODVfgk8hEWTEfma1nTtOD8idMWhgJlwg2wzSOV7qVGCx4WpXeZO	2025-07-05 20:03:44.317584	2025-07-05 23:07:28.234753	user	approved
2	sri.ramanatha@uskfoundation.or.ke	$2a$12$3x.o6wmYteklUVy83JOi/uosSSjc/G6s0rB2mD2YPdmSTxSKws336	2025-07-04 21:18:49.347182	2025-07-06 00:56:56.464304	admin	approved
5	newtest@test.com	$2a$12$VGsHDF.vfnDb7Odko5Q9IO92UAtNXin46TqMEQLY1mbH8fbHiaPM6	2025-07-06 15:47:32.749578	2025-07-06 15:52:34.345237	user	approved
3	sri.ramanatha@kailasaafrica.org	$2a$12$CTo.UdntlIQ7pPCsByu55ehB4PH9NunW3P78OgRakTy7Rbeyxau7.	2025-07-05 16:15:27.751028	2025-07-11 03:04:05.076738	user	approved
6	sri.shivathama@uskfoundation.or.ke	$2a$12$hW31meZ7BfJfwPPqXtOEDu8ge/TM8HYcaC5fJpdZS1Oq/lhi8mwtS	2025-07-14 13:45:18.054306	2025-07-14 13:45:45.905546	user	approved
\.


--
-- Name: account_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.account_groups_id_seq', 1, true);


--
-- Name: api_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.api_credentials_id_seq', 4, true);


--
-- Name: oauth_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.oauth_states_id_seq', 56, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.posts_id_seq', 61, true);


--
-- Name: social_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.social_accounts_id_seq', 31, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: socialmediadb_82lt_user
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: account_groups account_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_pkey PRIMARY KEY (id);


--
-- Name: api_credentials api_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_pkey PRIMARY KEY (id);


--
-- Name: live_streams live_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_pkey PRIMARY KEY (id);


--
-- Name: live_streams live_streams_stream_key_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_stream_key_key UNIQUE (stream_key);


--
-- Name: oauth_states oauth_states_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_states oauth_states_state_key_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_state_key_key UNIQUE (state_key);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: social_accounts social_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_pkey PRIMARY KEY (id);


--
-- Name: stream_app_keys stream_app_keys_app_id_key_name_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_app_keys
    ADD CONSTRAINT stream_app_keys_app_id_key_name_key UNIQUE (app_id, key_name);


--
-- Name: stream_app_keys stream_app_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_app_keys
    ADD CONSTRAINT stream_app_keys_pkey PRIMARY KEY (id);


--
-- Name: stream_apps stream_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_apps
    ADD CONSTRAINT stream_apps_pkey PRIMARY KEY (id);


--
-- Name: stream_apps stream_apps_rtmp_app_path_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_apps
    ADD CONSTRAINT stream_apps_rtmp_app_path_key UNIQUE (rtmp_app_path);


--
-- Name: stream_apps stream_apps_user_id_app_name_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_apps
    ADD CONSTRAINT stream_apps_user_id_app_name_key UNIQUE (user_id, app_name);


--
-- Name: stream_republishing stream_republishing_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_republishing
    ADD CONSTRAINT stream_republishing_pkey PRIMARY KEY (id);


--
-- Name: stream_sessions stream_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_live_streams_app_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_live_streams_app_id ON public.live_streams USING btree (app_id);


--
-- Name: idx_live_streams_app_key_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_live_streams_app_key_id ON public.live_streams USING btree (app_key_id);


--
-- Name: idx_live_streams_status; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_live_streams_status ON public.live_streams USING btree (status);


--
-- Name: idx_live_streams_user_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_live_streams_user_id ON public.live_streams USING btree (user_id);


--
-- Name: idx_stream_app_keys_active; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_app_keys_active ON public.stream_app_keys USING btree (is_active);


--
-- Name: idx_stream_app_keys_app_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_app_keys_app_id ON public.stream_app_keys USING btree (app_id);


--
-- Name: idx_stream_apps_status; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_apps_status ON public.stream_apps USING btree (status);


--
-- Name: idx_stream_apps_user_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_apps_user_id ON public.stream_apps USING btree (user_id);


--
-- Name: idx_stream_republishing_status; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_republishing_status ON public.stream_republishing USING btree (status);


--
-- Name: idx_stream_republishing_stream_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_republishing_stream_id ON public.stream_republishing USING btree (stream_id);


--
-- Name: idx_stream_republishing_user_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_republishing_user_id ON public.stream_republishing USING btree (user_id);


--
-- Name: idx_stream_sessions_status; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_sessions_status ON public.stream_sessions USING btree (status);


--
-- Name: idx_stream_sessions_stream_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_sessions_stream_id ON public.stream_sessions USING btree (stream_id);


--
-- Name: idx_stream_sessions_user_id; Type: INDEX; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE INDEX idx_stream_sessions_user_id ON public.stream_sessions USING btree (user_id);


--
-- Name: live_streams update_live_streams_updated_at; Type: TRIGGER; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.update_live_streams_updated_at();


--
-- Name: stream_app_keys update_stream_app_keys_updated_at; Type: TRIGGER; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TRIGGER update_stream_app_keys_updated_at BEFORE UPDATE ON public.stream_app_keys FOR EACH ROW EXECUTE FUNCTION public.update_stream_apps_updated_at();


--
-- Name: stream_apps update_stream_apps_updated_at; Type: TRIGGER; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TRIGGER update_stream_apps_updated_at BEFORE UPDATE ON public.stream_apps FOR EACH ROW EXECUTE FUNCTION public.update_stream_apps_updated_at();


--
-- Name: stream_republishing update_stream_republishing_updated_at; Type: TRIGGER; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TRIGGER update_stream_republishing_updated_at BEFORE UPDATE ON public.stream_republishing FOR EACH ROW EXECUTE FUNCTION public.update_live_streams_updated_at();


--
-- Name: stream_sessions update_stream_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: socialmediadb_82lt_user
--

CREATE TRIGGER update_stream_sessions_updated_at BEFORE UPDATE ON public.stream_sessions FOR EACH ROW EXECUTE FUNCTION public.update_live_streams_updated_at();


--
-- Name: account_groups account_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_credentials api_credentials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.stream_apps(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_app_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_app_key_id_fkey FOREIGN KEY (app_key_id) REFERENCES public.stream_app_keys(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_states oauth_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: social_accounts social_accounts_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.account_groups(id) ON DELETE SET NULL;


--
-- Name: social_accounts social_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stream_app_keys stream_app_keys_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_app_keys
    ADD CONSTRAINT stream_app_keys_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.stream_apps(id) ON DELETE CASCADE;


--
-- Name: stream_apps stream_apps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_apps
    ADD CONSTRAINT stream_apps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stream_republishing stream_republishing_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_republishing
    ADD CONSTRAINT stream_republishing_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.live_streams(id) ON DELETE CASCADE;


--
-- Name: stream_republishing stream_republishing_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_republishing
    ADD CONSTRAINT stream_republishing_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stream_sessions stream_sessions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.live_streams(id) ON DELETE CASCADE;


--
-- Name: stream_sessions stream_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: socialmediadb_82lt_user
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO socialmediadb_82lt_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO socialmediadb_82lt_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO socialmediadb_82lt_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO socialmediadb_82lt_user;


--
-- PostgreSQL database dump complete
--

