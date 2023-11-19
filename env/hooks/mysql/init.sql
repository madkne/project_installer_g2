-- # create databases
{% for db in databases %}
{% if db.type == 'mysql' %}
{% for dbname in db.init_db_names %}
CREATE DATABASE IF NOT EXISTS `{{dbname}}`;
{% endfor %}
{% endif %}
{% endfor %}
-- alter user 'root'@'%' identified with mysql_native_password by '{{mysql_root_password}}';
-- FLUSH PRIVILEGES;
-- enable logs
SET global general_log = on;
SET global general_log_file='/var/log/mysql/mysql.log';
SET global log_output = 'file';