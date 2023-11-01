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
    todo: `TABLE_CATALOG,TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,CHARACTER_OCTET_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,PRIVILEGES,COLUMN_COMMENT,GENERATION_EXPRESSION,SRS_ID,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
def,todo_database,Todo,due_date,4,NULL,YES,date,NULL,NULL,NULL,NULL,NULL,NULL,NULL,date,,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,todo_database,Todo,id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,todo_database,Todo,start_date,3,NULL,YES,date,NULL,NULL,NULL,NULL,NULL,NULL,NULL,date,,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,todo_database,Todo,title,2,NULL,NO,varchar,255,1020,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,varchar(255),,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
`,
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
     *   placeholder CHAR(1) NOT NULL, -- placeholder for other attributes of articles
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     *
     * CREATE TABLE stories (
     *   pub_id INTEGER NOT NULL,
     *   pub_type CHAR(1) DEFAULT 'S' CHECK (pub_type = 'S'),
     *   placeholder CHAR(1) NOT NULL, -- placeholder for other attributes of stories
     *   PRIMARY KEY (pub_id, pub_type),
     *   FOREIGN KEY (pub_id, pub_type) REFERENCES publications (pub_id, pub_type)
     * );
     * CREATE TABLE comments (
     *   pub_id INTEGER NOT NULL REFERENCES publications (pub_id),
     *   comment_timestamp TIMESTAMP NOT NULL DEFAULT now(),
     *   commenter_email VARCHAR(10) NOT NULL, -- Only allow people who have
     *                                         -- really short email addresses
     *   comment_text VARCHAR(30) NOT NULL,    -- Keep 'em short!
     *   PRIMARY KEY (pub_id, comment_timestamp, commenter_email)
     * );
     */
    news: `TABLE_CATALOG,TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,CHARACTER_OCTET_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,PRIVILEGES,COLUMN_COMMENT,GENERATION_EXPRESSION,SRS_ID,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
def,blog_database,articles,placeholder,3,NULL,NO,char,1,4,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,char(1),,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,blog_database,articles,pub_id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,blog_database,articles,pub_type,2,A,NO,char,1,4,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,char(1),PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,2,
def,blog_database,comments,comment_text,4,NULL,NO,varchar,30,120,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,varchar(30),,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,blog_database,comments,comment_timestamp,2,CURRENT_TIMESTAMP,NO,timestamp,NULL,NULL,NULL,NULL,0,NULL,NULL,timestamp,PRI,DEFAULT_GENERATED,"select,insert,update,references",,,NULL,PRIMARY,0,2,
def,blog_database,comments,commenter_email,3,NULL,NO,varchar,10,40,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,varchar(10),PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,3,
def,blog_database,comments,pub_id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,blog_database,publications,pub_id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,blog_database,publications,pub_id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,publications_superkey,0,1,
def,blog_database,publications,pub_type,2,NULL,YES,char,1,4,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,char(1),,,"select,insert,update,references",,,NULL,publications_superkey,0,2,YES
def,blog_database,publications,pub_url,3,NULL,NO,varchar,64,256,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,varchar(64),UNI,,"select,insert,update,references",,,NULL,pub_url,0,1,
def,blog_database,stories,placeholder,3,NULL,NO,char,1,4,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,char(1),,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,blog_database,stories,pub_id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,blog_database,stories,pub_type,2,S,NO,char,1,4,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,char(1),PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,2,
`,
  },
};
