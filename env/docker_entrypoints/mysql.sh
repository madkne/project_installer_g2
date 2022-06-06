#!/bin/bash
# echo "Initialising MySQL..."
mysql_connection_max_attempts=10
mysql_connection_attempt=0
until mysql -u "root" --password="12345" -e 'exit'
do
    mysql_connection_attempt=$(expr $mysql_connection_attempt + 1)
    echo "    [$mysql_connection_attempt/$mysql_connection_max_attempts] Waiting for MySQL service (this may take a while)..."
    if [ $mysql_connection_attempt -eq $mysql_connection_max_attempts ]
    then
      echo "MySQL initialisation error" 1>&2
      exit 1
    fi
    sleep 3
done
echo "MySQL is up and running"




# mysqld --default-authentication-plugin=mysql_native_password
echo "creating table {{mysql_database_name}}..."
# mysql -u "root" --password="12345"  -e 'CREATE DATABASE IF NOT EXISTS talent;'
mysql -u "root" --password="12345"  -e 'CREATE DATABASE IF NOT EXISTS {{mysql_database_name}};'

echo "${RED}altering user {{mysql_database_name}}..."
mysql -u "root" --password="{{mysql_root_password}}" -e "alter user 'root'@'%' identified with mysql_native_password by '{{mysql_root_password}}';"


# sdRTYfv45@#
