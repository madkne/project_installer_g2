from .development import *
import os

DEBUG = {{'True' if debug_mode else 'False'}}

ALLOWED_HOSTS = ['*', '{{allowed_host}}']

HOST_NAME = '{{host_name}}'

SERVER_MODE = 'cloud'  # cloud or local

# os.environ.setdefault('DATABASE_HOST', '127.0.0.1')
os.environ.setdefault('DATABASE_HOST', 'mysql')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'talent',
        'USER': 'root',
        # 'PASSWORD': 'sdRTYfv45@#',
        'PASSWORD': '{{mysql_password}}',
        'HOST': os.environ['DATABASE_HOST'],
        'PORT': '{{mysql_port}}',
        'OPTIONS': {
            'sql_mode': 'traditional',
        }
    }
}

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# CACHES = {
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": "redis://redis:6379/1",
#         "OPTIONS": {
#             "CLIENT_CLASS": "django_redis.client.DefaultClient",
#         },
#         "TIMEOUT": 300,
#     }
# }
CACHE_TTL = 300  # 5 minutes
#  # Security
# SESSION_COOKIE_SECURE = True
# SECURE_BROWSER_XSS_FILTER = True
# SECURE_CONTENT_TYPE_NOSNIFF = True
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_SECONDS = 31536000
# SECURE_REDIRECT_EXEMPT = []
# SECURE_SSL_HOST = None
# SECURE_SSL_REDIRECT = True
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
