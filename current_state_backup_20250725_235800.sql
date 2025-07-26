--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_groups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.account_groups OWNER TO postgres;

--
-- Name: account_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_groups_id_seq OWNER TO postgres;

--
-- Name: account_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_groups_id_seq OWNED BY public.account_groups.id;


--
-- Name: api_credentials; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.api_credentials OWNER TO postgres;

--
-- Name: api_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_credentials_id_seq OWNER TO postgres;

--
-- Name: api_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_credentials_id_seq OWNED BY public.api_credentials.id;


--
-- Name: oauth_states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oauth_states (
    id integer NOT NULL,
    state_key character varying(255) NOT NULL,
    user_id integer,
    platform character varying(50) NOT NULL,
    instance_url character varying(255),
    client_id character varying(255),
    client_secret character varying(255),
    extra_data text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '01:00:00'::interval)
);


ALTER TABLE public.oauth_states OWNER TO postgres;

--
-- Name: oauth_states_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.oauth_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.oauth_states_id_seq OWNER TO postgres;

--
-- Name: oauth_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.oauth_states_id_seq OWNED BY public.oauth_states.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer,
    content text NOT NULL,
    media_urls jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'draft'::character varying,
    target_accounts jsonb,
    published_at timestamp without time zone,
    scheduled_for timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    post_type character varying(20) DEFAULT 'text'::character varying,
    is_scheduled boolean DEFAULT false,
    CONSTRAINT posts_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'video'::character varying, 'reel'::character varying])::text[])))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: reddit_subreddits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reddit_subreddits (
    id integer NOT NULL,
    account_id integer,
    subreddit_name character varying(255) NOT NULL,
    display_name character varying(255),
    title character varying(255),
    description text,
    subscribers integer DEFAULT 0,
    submission_type character varying(50) DEFAULT 'any'::character varying,
    can_submit boolean DEFAULT true,
    is_moderator boolean DEFAULT false,
    over_18 boolean DEFAULT false,
    created_utc integer,
    last_synced timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reddit_subreddits OWNER TO postgres;

--
-- Name: reddit_subreddits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reddit_subreddits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reddit_subreddits_id_seq OWNER TO postgres;

--
-- Name: reddit_subreddits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reddit_subreddits_id_seq OWNED BY public.reddit_subreddits.id;


--
-- Name: social_accounts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.social_accounts OWNER TO postgres;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.social_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.social_accounts_id_seq OWNER TO postgres;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.social_accounts_id_seq OWNED BY public.social_accounts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: account_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_groups ALTER COLUMN id SET DEFAULT nextval('public.account_groups_id_seq'::regclass);


--
-- Name: api_credentials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_credentials ALTER COLUMN id SET DEFAULT nextval('public.api_credentials_id_seq'::regclass);


--
-- Name: oauth_states id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_states ALTER COLUMN id SET DEFAULT nextval('public.oauth_states_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: reddit_subreddits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reddit_subreddits ALTER COLUMN id SET DEFAULT nextval('public.reddit_subreddits_id_seq'::regclass);


--
-- Name: social_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts ALTER COLUMN id SET DEFAULT nextval('public.social_accounts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_groups (id, user_id, name, description, color, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_credentials (id, platform, client_id, client_secret, created_by, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: oauth_states; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oauth_states (id, state_key, user_id, platform, instance_url, client_id, client_secret, extra_data, created_at, expires_at) FROM stdin;
1	reddit_140c62f84e427e542d4e9b356c033b5c	1	reddit	\N	xym1njw3qp52EkQf4ZTUWQ	LSWQYEul_LH8IgAhFdhAEbmOAeWUMg	{"userId":1,"random":"140c62f84e427e542d4e9b356c033b5c","platform":"reddit"}	2025-07-25 23:29:44.197266	2025-07-26 00:29:44.197266
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, user_id, content, media_urls, status, target_accounts, published_at, scheduled_for, error_message, created_at, updated_at, post_type, is_scheduled) FROM stdin;
\.


--
-- Data for Name: reddit_subreddits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reddit_subreddits (id, account_id, subreddit_name, display_name, title, description, subscribers, submission_type, can_submit, is_moderator, over_18, created_utc, last_synced) FROM stdin;
1	1	test	r/test	Test Subreddit	A test subreddit	1000	any	t	f	f	\N	2025-07-25 23:30:21.141831
2	1	programming	r/programming	Programming	Programming discussions	5000000	any	t	f	f	\N	2025-07-25 23:30:21.141831
3	1	technology	r/technology	Technology	Technology news	10000000	link	t	f	f	\N	2025-07-25 23:30:21.141831
\.


--
-- Data for Name: social_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.social_accounts (id, user_id, platform, instance_url, username, display_name, avatar_url, access_token, refresh_token, token_expires_at, status, last_used, created_at, updated_at, group_id) FROM stdin;
1	2	reddit	\N	testuser	Test User	\N	test_encrypted_token	test_refresh_token	2025-07-26 00:30:29.940634	active	\N	2025-07-25 23:30:02.787079	2025-07-25 23:30:02.787079	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role, status, created_at, updated_at) FROM stdin;
1	admin@example.com	$2a$12$0p3NEqv8bR3bOCJjLzMvZ.o5CPHPYaeRoG6jGPxpzIsj7yCejp7Ey	admin	approved	2025-07-25 23:29:04.045203	2025-07-25 23:29:04.045203
2	sri.ramanatha@uskfoundation.or.ke	$2a$12$0NJAOA7i2aN.QUzYevthT.xxcFhT6GSqfzNLUFB/8NzZdN93vLYH6	admin	approved	2025-07-25 23:35:21.261886	2025-07-25 23:35:21.261886
\.


--
-- Name: account_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_groups_id_seq', 1, false);


--
-- Name: api_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_credentials_id_seq', 1, false);


--
-- Name: oauth_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.oauth_states_id_seq', 1, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 1, false);


--
-- Name: reddit_subreddits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reddit_subreddits_id_seq', 3, true);


--
-- Name: social_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.social_accounts_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: account_groups account_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_pkey PRIMARY KEY (id);


--
-- Name: api_credentials api_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_pkey PRIMARY KEY (id);


--
-- Name: oauth_states oauth_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_states oauth_states_state_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_state_key_key UNIQUE (state_key);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: reddit_subreddits reddit_subreddits_account_id_subreddit_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reddit_subreddits
    ADD CONSTRAINT reddit_subreddits_account_id_subreddit_name_key UNIQUE (account_id, subreddit_name);


--
-- Name: reddit_subreddits reddit_subreddits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reddit_subreddits
    ADD CONSTRAINT reddit_subreddits_pkey PRIMARY KEY (id);


--
-- Name: social_accounts social_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account_groups account_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_credentials api_credentials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: oauth_states oauth_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reddit_subreddits reddit_subreddits_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reddit_subreddits
    ADD CONSTRAINT reddit_subreddits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.social_accounts(id) ON DELETE CASCADE;


--
-- Name: social_accounts social_accounts_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.account_groups(id) ON DELETE SET NULL;


--
-- Name: social_accounts social_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

