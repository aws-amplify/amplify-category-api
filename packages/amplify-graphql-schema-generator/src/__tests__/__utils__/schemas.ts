export const schemas = {
  mysql: {
    /*
     * CREATE TABLE Todo (
     *   id INT PRIMARY KEY,
     *   title VARCHAR(255) NOT NULL,
     *   start_date DATE,
     *   due_date DATE
     * );
     */
    todo: `TABLE_NAME,COLUMN_NAME,COLUMN_DEFAULT,ORDINAL_POSITION,DATA_TYPE,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
Todo,due_date,NULL,4,date,date,YES,NULL,NULL,NULL,NULL,NULL
Todo,id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
Todo,start_date,NULL,3,date,date,YES,NULL,NULL,NULL,NULL,NULL
Todo,title,NULL,2,varchar,varchar(255),NO,255,NULL,NULL,NULL,NULL`,
    /*
     * CREATE TABLE publications (
     *   pub_id INTEGER NOT NULL PRIMARY KEY,
     *   pub_type CHAR(1) CHECK (pub_type IN ('A', 'B', 'P', 'S')),
     *   pub_url VARCHAR(64) NOT NULL UNIQUE,
     *   CONSTRAINT publications_superkey UNIQUE (pub_id, pub_type)
     * );
     * CREATE TABLE articles (
     *   pub_id INTEGER NOT NULL,
     *   pub_type CHAR(1) DEFAULT 'A' CHECK (pub_type = 'A'),
     *   placeholder CHAR(1) NOT NULL,
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     *
     * CREATE TABLE stories (
     *   pub_id INTEGER NOT NULL,
     *   pub_type CHAR(1) DEFAULT 'S' CHECK (pub_type = 'S'),
     *   placeholder CHAR(1) NOT NULL,
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     * CREATE TABLE comments (
     *   pub_id INTEGER NOT NULL REFERENCES publications (pub_id),
     *   comment_timestamp TIMESTAMP NOT NULL DEFAULT now(),
     *   commenter_email VARCHAR(10) NOT NULL,
     *   comment_text VARCHAR(30) NOT NULL,
     *   PRIMARY KEY (pub_id, comment_timestamp, commenter_email)
     * );
     */
    news: `TABLE_NAME,COLUMN_NAME,COLUMN_DEFAULT,ORDINAL_POSITION,DATA_TYPE,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
comments,comment_timestamp,CURRENT_TIMESTAMP,2,timestamp,timestamp,NO,NULL,PRIMARY,0,2,
publications,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
publications,pub_id,NULL,1,int,int,NO,NULL,publications_superkey,0,1,
publications,pub_type,NULL,2,char,char(1),YES,1,publications_superkey,0,2,YES
publications,pub_url,NULL,3,varchar,varchar(64),NO,64,pub_url,0,1,
articles,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
articles,pub_type,A,2,char,char(1),NO,1,PRIMARY,0,2,
articles,placeholder,NULL,3,char,char(1),NO,1,NULL,NULL,NULL,NULL
stories,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
stories,pub_type,S,2,char,char(1),NO,1,PRIMARY,0,2,
stories,placeholder,NULL,3,char,char(1),NO,1,NULL,NULL,NULL,NULL
comments,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
comments,commenter_email,NULL,3,varchar,varchar(10),NO,10,PRIMARY,0,3,
comments,comment_text,NULL,4,varchar,varchar(30),NO,30,NULL,NULL,NULL,NULL`,
    /*
     * Create table statements from news followed by:
     *
     * ALTER TABLE publications RENAME TO pub
     */
    newsNameChange: `TABLE_NAME,COLUMN_NAME,COLUMN_DEFAULT,ORDINAL_POSITION,DATA_TYPE,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
comments,comment_timestamp,CURRENT_TIMESTAMP,2,timestamp,timestamp,NO,NULL,PRIMARY,0,2,
pub,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
pub,pub_id,NULL,1,int,int,NO,NULL,publications_superkey,0,1,
pub,pub_type,NULL,2,char,char(1),YES,1,publications_superkey,0,2,YES
pub,pub_url,NULL,3,varchar,varchar(64),NO,64,pub_url,0,1,
articles,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
articles,pub_type,A,2,char,char(1),NO,1,PRIMARY,0,2,
articles,placeholder,NULL,3,char,char(1),NO,1,NULL,NULL,NULL,NULL
stories,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
stories,pub_type,S,2,char,char(1),NO,1,PRIMARY,0,2,
stories,placeholder,NULL,3,char,char(1),NO,1,NULL,NULL,NULL,NULL
comments,pub_id,NULL,1,int,int,NO,NULL,PRIMARY,0,1,
comments,commenter_email,NULL,3,varchar,varchar(10),NO,10,PRIMARY,0,3,
comments,comment_text,NULL,4,varchar,varchar(30),NO,30,NULL,NULL,NULL,NULL`,
  },
  postgres: {
    /*
     * CREATE TABLE Todo (
     *   id INT PRIMARY KEY,
     *   title VARCHAR(255) NOT NULL,
     *   start_date DATE,
     *   due_date DATE
     * );
     */
    todo: `"table_name","enum_name","enum_values","column_name","column_default","ordinal_position","data_type","udt_name","is_nullable","character_maximum_length","indexname","constraint_type","index_columns"
"todo",NULL,NULL,"due_date",NULL,4,"date","date","YES",NULL,NULL,NULL,NULL
"todo",NULL,NULL,"id",NULL,1,"integer","int4","NO",NULL,"todo_pkey","PRIMARY KEY","id"
"todo",NULL,NULL,"start_date",NULL,3,"date","date","YES",NULL,NULL,NULL,NULL
"todo",NULL,NULL,"title",NULL,2,"character varying","varchar","NO",255,NULL,NULL,NULL`,
    /*
     * CREATE TABLE publications (
     *   pub_id INTEGER NOT NULL PRIMARY KEY,
     *   pub_type CHAR(1) CHECK (pub_type IN ('A', 'B', 'P', 'S')),
     *   pub_url VARCHAR(64) NOT NULL UNIQUE,
     *   CONSTRAINT fake_pkey UNIQUE (pub_id, pub_type)
     * );
     * CREATE TABLE articles (
     *   pub_id INTEGER NOT NULL,
     *   pub_type CHAR(1) DEFAULT 'A' CHECK (pub_type = 'A'),
     *   placeholder CHAR(1) NOT NULL,
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     *
     * CREATE TABLE stories (
     *   pub_id INTEGER NOT NULL,
     *   pub_type CHAR(1) DEFAULT 'S' CHECK (pub_type = 'S'),
     *   placeholder CHAR(1) NOT NULL,
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     * CREATE TABLE comments (
     *   pub_id INTEGER NOT NULL REFERENCES publications (pub_id),
     *   comment_timestamp TIMESTAMP NOT NULL DEFAULT now(),
     *   commenter_email VARCHAR(10) NOT NULL,
     *   PRIMARY KEY (pub_id, comment_timestamp, commenter_email)
     * );
     */
    news: `"table_name","enum_name","enum_values","column_name","column_default","ordinal_position","data_type","udt_name","is_nullable","character_maximum_length","indexname","constraint_type","index_columns"
"articles",NULL,NULL,"placeholder",NULL,3,"character","bpchar","NO",1,NULL,NULL,NULL
"articles",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"articles_pkey","PRIMARY KEY","pub_id, pub_type"
"articles",NULL,NULL,"pub_type","'A'::bpchar",2,"character","bpchar","NO",1,"articles_pkey","PRIMARY KEY","pub_id, pub_type"
"comments",NULL,NULL,"comment_timestamp","now()",2,"timestamp without time zone","timestamp","NO",NULL,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"comments",NULL,NULL,"commenter_email",NULL,3,"character varying","varchar","NO",10,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"comments",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"publications",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"fake_pkey","UNIQUE","pub_id, pub_type"
"publications",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"publications_pkey","PRIMARY KEY","pub_id"
"publications",NULL,NULL,"pub_type",NULL,2,"character","bpchar","YES",1,"fake_pkey","UNIQUE","pub_id, pub_type"
"publications",NULL,NULL,"pub_url",NULL,3,"character varying","varchar","NO",64,"publications_pub_url_key","UNIQUE","pub_url"
"stories",NULL,NULL,"placeholder",NULL,3,"character","bpchar","NO",1,NULL,NULL,NULL
"stories",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"stories_pkey","PRIMARY KEY","pub_id, pub_type"
"stories",NULL,NULL,"pub_type","'S'::bpchar",2,"character","bpchar","NO",1,"stories_pkey","PRIMARY KEY","pub_id, pub_type"`,
    /*
     * Create table statements from news followed by:
     *
     * ALTER TABLE publications RENAME TO pub
     */
    newsNameChange: `"table_name","enum_name","enum_values","column_name","column_default","ordinal_position","data_type","udt_name","is_nullable","character_maximum_length","indexname","constraint_type","index_columns"
"articles",NULL,NULL,"placeholder",NULL,3,"character","bpchar","NO",1,NULL,NULL,NULL
"articles",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"articles_pkey","PRIMARY KEY","pub_id, pub_type"
"articles",NULL,NULL,"pub_type","'A'::bpchar",2,"character","bpchar","NO",1,"articles_pkey","PRIMARY KEY","pub_id, pub_type"
"comments",NULL,NULL,"comment_timestamp","now()",2,"timestamp without time zone","timestamp","NO",NULL,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"comments",NULL,NULL,"commenter_email",NULL,3,"character varying","varchar","NO",10,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"comments",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"comments_pkey","PRIMARY KEY","pub_id, comment_timestamp, commenter_email"
"pub",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"fake_pkey","UNIQUE","pub_id, pub_type"
"pub",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"publications_pkey","PRIMARY KEY","pub_id"
"pub",NULL,NULL,"pub_type",NULL,2,"character","bpchar","YES",1,"fake_pkey","UNIQUE","pub_id, pub_type"
"pub",NULL,NULL,"pub_url",NULL,3,"character varying","varchar","NO",64,"publications_pub_url_key","UNIQUE","pub_url"
"stories",NULL,NULL,"placeholder",NULL,3,"character","bpchar","NO",1,NULL,NULL,NULL
"stories",NULL,NULL,"pub_id",NULL,1,"integer","int4","NO",NULL,"stories_pkey","PRIMARY KEY","pub_id, pub_type"
"stories",NULL,NULL,"pub_type","'S'::bpchar",2,"character","bpchar","NO",1,"stories_pkey","PRIMARY KEY","pub_id, pub_type"`,
    /*
     * CREATE TABLE serial_table (
     * id SERIAL PRIMARY KEY,
     * number SERIAL,
     * );
     */
    serial: `
      "table_name","enum_name","enum_values","column_name","column_default","ordinal_position","data_type","udt_name","is_nullable","character_maximum_length","indexname","constraint_type","index_columns"
      serial_table,,,id,nextval('serial_table_id_seq'::regclass),1,integer,int4,NO,,serial_table_pkey,PRIMARY KEY,id
      serial_table,,,number,nextval('serial_table_number_seq'::regclass),2,integer,int4,NO,,,,
    `,
  },
};
