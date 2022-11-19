-- # create databases
{% for db in databases %}
{% if db.type == 'mysql' %}
{% for dbname in db.mysql_db_names %}
CREATE DATABASE IF NOT EXISTS `{{dbname}}`;
{% endfor %}
{% endif %}
{% endfor %}
-- alter user 'root'@'%' identified with mysql_native_password by '{{mysql_root_password}}';
-- FLUSH PRIVILEGES;
