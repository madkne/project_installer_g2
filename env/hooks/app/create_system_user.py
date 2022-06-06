from accounts.models import User
try:
    if User.objects.filter(email='system@site.com'):
        print('system user already exists')
        exit()
    sys_user=User.objects.create(email='system@site.com', role='applicant', is_admin=True, is_really_admin=True, is_active=True, settings={})
    sys_user.settings['read_only'] = True
    sys_user.save()
    print('system user created')
except Exception as e:
    print('error happened: %s' %e)