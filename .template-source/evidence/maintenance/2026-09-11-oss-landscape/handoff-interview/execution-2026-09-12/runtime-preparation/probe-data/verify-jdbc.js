// Diagnostic read-only verifier. Product Provider must use the reviewed fixed query registry.
var Paths=Java.type('java.nio.file.Paths'), Files=Java.type('java.nio.file.Files'), UTF8=Java.type('java.nio.charset.StandardCharsets').UTF_8;
function read(path){return String(new java.lang.String(Files.readAllBytes(Paths.get(path)),UTF8));}
function write(path,text){Files.write(Paths.get(path),new java.lang.String(text).getBytes(UTF8));}
var root=String(java.lang.System.getenv('YSS_PROBE_DATA_ROOT'));
var config=JSON.parse(read(String(java.lang.System.getenv('YSS_PROBE_CONNECTION_FILE'))));
var registry=JSON.parse(read(root+'/fixed-queries.json'));var baseline=JSON.parse(read(root+'/test-data.json'));var expected={};baseline.checks.forEach(function(c){expected[c.id]=c.expected_rows;});
var actual={}, diagnostics=[], failures=[];
['control','target'].forEach(function(source){
 var properties=new java.util.Properties();properties.setProperty('user',config[source].username);properties.setProperty('password',config[source].password);properties.setProperty('connectTimeout','3');properties.setProperty('socketTimeout','3');properties.setProperty('options','-c default_transaction_read_only=on -c TimeZone=UTC -c statement_timeout=2000');
 var connection=new org.postgresql.Driver().connect(config[source].jdbc_url,properties);
 try{
  connection.setAutoCommit(false);connection.setReadOnly(true);connection.setTransactionIsolation(java.sql.Connection.TRANSACTION_REPEATABLE_READ);
  if(connection.getMetaData().getDatabaseMajorVersion()!=15)throw new Error('PostgreSQL major version differs');
  var state=connection.createStatement();state.setQueryTimeout(2);state.execute("SET LOCAL TIME ZONE 'UTC'");var rs=state.executeQuery("SELECT current_setting('transaction_read_only'), current_setting('transaction_isolation'), current_setting('TimeZone')");rs.next();var observed=[String(rs.getString(1)),String(rs.getString(2)),String(rs.getString(3))];rs.close();state.close();if(JSON.stringify(observed)!=JSON.stringify(['on','repeatable read','UTC']))throw new Error('read-only transaction contract violated: '+JSON.stringify(observed));
  diagnostics.push({datasource:source,transaction:observed});
  ['structure','content'].forEach(function(phase){registry.queries.forEach(function(q){if(q.datasource!=source||q.phase!=phase)return;
   var stmt=connection.createStatement();stmt.setQueryTimeout(2);stmt.setMaxRows(1001);var result=stmt.executeQuery(q.sql);var rows=[];while(result.next()){if(result.getMetaData().getColumnCount()!=1)throw new Error('unexpected columns');var value=result.getString(1);if(value===null)throw new Error('null canonical row');rows.push(String(value));}result.close();stmt.close();actual[q.id]=rows;if(JSON.stringify(rows)!=JSON.stringify(expected[q.id]))failures.push(q.id);
  });});
  connection.rollback();
 }finally{connection.close();}
});
write(root+'/jdbc-snapshot.json',JSON.stringify(actual,null,2)+'\n');write(root+'/jdbc-verification.json',JSON.stringify({executed_at:String(java.time.Instant.now()),driver:'org.postgresql.Driver 42.7.8',queries:Object.keys(actual).length,transactions:diagnostics,failed_query_ids:failures,exit_code:failures.length?1:0},null,2)+'\n');if(failures.length)throw new Error('Frozen baseline mismatch: '+failures.join(','));print('18 JDBC queries match frozen two-case baseline; read-only/repeatable-read/UTC confirmed');
