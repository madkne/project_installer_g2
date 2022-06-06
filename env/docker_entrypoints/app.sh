#!/bin/bash

echo "*** Collect static files ***"
python manage.py collectstatic --noinput

echo "*** Apply database migrations ***"
{% for app in appsList %}
python manage.py makemigrations {{app}} --skip-checks --no-input
{% endfor %}
python manage.py makemigrations

echo '*** migrate to database ***'
python manage.py migrate

# echo '*** insert data to location table if not exist ***'
# python manage.py shell  --settings=talent.settings.production  -c "from common.common import StartupFunctions; StartupFunctions.insert_locations()"
# Start server
# echo "Starting server"
# python manage.py runserver 0.0.0.0:80
# uwsgi --socket 0.0.0.0:8000 \
#  --thunder-lock \
#     --single-interpreter \
#     --enable-threads \
#     --processes=${UWSGI_WORKERS:-2} \
#     --buffer-size=8192 \
#  --module talent.wsgi --py-autoreload 1 --logto /tmp/mylog.log 
# 
