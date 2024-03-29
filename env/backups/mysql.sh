#!/usr/bin/node

DATE = `date +%d%b%y`
LOCAL_BACKUP_DIR = "{{local_backups_dir}}"
DB_NAME = "{{plan.db_name}}"
DB_USER = "root"
DB_PASSWORD = "{{mysql.root_password}}"
FTP_SERVER = "{{settings.host}}"
FTP_USERNAME = "{{settings.username}}"
FTP_PASSWORD = "{{settings.password}}"
FTP_UPLOAD_DIR = "{{plan.remote_path}}"
LOG_FILE = $LOCAL_BACKUP_DIR / backup - DATE.log

############### Local Backup  ########################
mkdir - p $LOCAL_BACKUP_DIR
docker exec {{ mysql_image_name }} mysqldump - u $DB_USER - p$DB_PASSWORD $DB_NAME | gzip > "$LOCAL_BACKUP_DIR/$DB_NAME.sql.gz"

############### UPLOAD to FTP Server  ################

ftp - n $FTP_SERVER << EndFTP
user "$FTP_USERNAME" "$FTP_PASSWORD"
binary
hash
mkdir $FTP_UPLOAD_DIR
cd $FTP_UPLOAD_DIR
#pwd
lcd $LOCAL_BACKUP_DIR
put "$DB_NAME-$DATE.sql.gz"
bye
EndFTP

if test $ ? = 0
then
    echo "Database Successfully Uploaded to Ftp Server
        File Name $DB_NAME-$DATE.sql.gz " > $LOG_FILE
else
    echo "Error in database Upload to Ftp Server" > $LOG_FILE
fi