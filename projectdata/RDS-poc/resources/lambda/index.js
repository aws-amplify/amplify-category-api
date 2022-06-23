//https://aws.amazon.com/blogs/compute/using-amazon-rds-proxy-with-aws-lambda/
//https://deniapps.com/blog/setup-aws-lambda-to-use-amazon-rds-proxy

let AWS = require('aws-sdk');
var mysql2 = require('mysql2/promise');
var knex = require('knex');

let connection = null;
let dbBuilder;

const initDbBuilder = () => {
	if (dbBuilder === undefined) {
	var signer = new AWS.RDS.Signer({
	    region: 'us-east-2',
	    hostname: 'testingdb-proxy.proxy-cawwfzijbeke.us-east-2.rds.amazonaws.com',
	    port: 3306,
	    username: 'admin'
	  });
	
	let token = signer.getAuthToken({
	  username: 'admin'
	});
	
	
	let connectionConfig = {
	  host: process.env['endpoint'], // Store your endpoint as an env var
	  user: 'admin',
	  database: 'sys',//process.env['my_db'], // Store your DB schema name as an env var
	  ssl: { rejectUnauthorized: false},
	  password: token,
	  authSwitchHandler: function ({pluginName, pluginData}, cb) {
	      console.log("Setting new auth handler.");
	  }
	};
	
	connectionConfig.authSwitchHandler = (data, cb) => {
	    if (data.pluginName === 'mysql_clear_password') {
	      // See https://dev.mysql.com/doc/internals/en/clear-text-authentication.html
	      let password = token + '\0';
	      let buffer = Buffer.from(password);
	      cb(null, password);
	    }
	};
	
	dbBuilder = knex({
		client: 'mysql2',
		connection: connectionConfig,
		  pool: {
		    min: 5, 
		    max: 30,
		    createTimeoutMillis: 30000,
		    acquireTimeoutMillis: 30000,
		    idleTimeoutMillis: 30000,
		    reapIntervalMillis: 1000,
		    createRetryIntervalMillis: 100
		  },
		  debug: true
	});
	}
}

const createTable = async () => {
	
}

const readRecord = async () => {
	
}

const listRecords = async (infoObject) => {
	
	console.log(infoObject);
	
	let currentTable = 'CONTACTS';		//get from the model, refactor out later
	let currentValues = ['fname', 'lname'];
	
	return await dbBuilder(currentTable).select(currentValues);
}

const insertRecord = async (infoObject) => {
	
	console.log(infoObject);
	
	let currentTable = 'CONTACTS';		//get from the model, refactor out later
	let currentValues = [				//get from the args, refactor out later
		{
			fname: 'TESTING',
			lname: 'TEST'
		}	
	]
	return await dbBuilder(currentTable).insert(currentValues);
}


const updateRecord = async () => {
	
}

const deleteRecord = async () => {
	
} 

const executeSQL = async  (statement) => {
	
}

exports.handler = async(event) => {
	
	initDbBuilder();
	
		 /*
		 
		 CREATE TABLE CONTACTS (fname VARCHAR(20), lname VARCHAR(20))
		 
		 INSERT INTO CONTACTS(fname, lname) VALUES('richard', 'threlkeld')
		 
		 let result = await executeSQL("INSERT INTO CONTACTS(fname, lname) VALUES('manuel', 'iglesias')");
		 //result = await executeSQL(`INSERT INTO CONTACTS(fname, lname) VALUES('${args.firstName}', '${args.lastName}')`);
		
		result = await executeSQL("SELECT * FROM CONTACTS");
		 */
	

	//const res = await dbBuilder.connection(connection).select().from('CONTACTS').limit(5);
	// let res = await executeSQL('foo');
	// console.log(res);

	// return res;
	
	
	
	let result = {};
	let info;
	
	if (event.hasOwnProperty('info')){
		info = event.info;
	} else {
		info = event.detail.info;
	}
	
	if (info.parentTypeName === 'Mutation') {
		const args = event.detail.args;
		result = await insertRecord(info);
	} else if (info.parentTypeName === 'Query') {
		console.log(`info is ${info.parentTypeName} for ${info.fieldName}`);
		result = await listRecords(info);
	} else {
		console.log('Cannot determine the GraphQL parentTypeName');
		result = {};
	}
	
	return result;
};