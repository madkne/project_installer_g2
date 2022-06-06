CREATE DATABASE IF NOT EXISTS {{mysql_database_name}};
alter user 'root'@'%' identified with mysql_native_password by '{{mysql_root_password}}';
FLUSH PRIVILEGES;
