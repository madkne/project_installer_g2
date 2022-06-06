CREATE DATABASE IF NOT EXISTS talent;
alter user 'root'@'%' identified with mysql_native_password by '{{mysql_password}}';
FLUSH PRIVILEGES;
