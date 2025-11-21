# Vercel Environment Variables Setup

To deploy this application to Vercel, you need to add the following environment variables to your Vercel project settings.

## Required Firebase Admin Environment Variables

Navigate to your Vercel project settings → Environment Variables and add:

### 1. FIREBASE_ADMIN_PROJECT_ID
```
labre-lims-bb270
```

### 2. FIREBASE_ADMIN_CLIENT_EMAIL
```
firebase-adminsdk-fbsvc@labre-lims-bb270.iam.gserviceaccount.com
```

### 3. FIREBASE_ADMIN_PRIVATE_KEY
```
-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDN40XNiixdJiEL
8Lfz9FnjWaGcRfm7qzyQY0V7AOKty6c6DyNlu6P++lifSjhPuEhtPijDixKYmMLK
8P829ep5i7yM44EDCBuWvvfhFuRIiRGYpkPhkXo3velGj3Mw+L0+6Dcsgk9f8PGM
bn/6btuXV5faOgU0bObtmho1CbHu+/IPuqxYSS/x7v15jIwM8r+JAfe9tobjYaIM
cokLXsUIkDPZGD4zErdEc+EcYgHitERyx8zJsrFYY5W6ChOHqqsQdn/wxouKdkHS
Se+60qx5rL0oAw05XaaryN8NSnCCeLnv/zy5x9+7K3RnryzJjmyZu7hm4j6OLqDU
6xxjLhrdAgMBAAECgf90SutVx0+uGnT2fM43lzP7agurn9rV8uLcRTZgELmSpHWd
Vbx1hu20foBdEo8ieFs9WUVGx+C5HZAcqtBKB9CccISpdj4CeF62k/Q8L7H1RqoQ
KKaVXDBGGMveDyjOTUr+CixTKuFET9QgF+PLXZ94D862DnYVWdRJlCgGM6bnIf4j
7bQfPlHkz0dmu+rT2A00CdyFahrhLq6rnKU8tUGWh0LZbam/UyqDXhG5IKugvGNS
sfXOOTfxok8T6hb4M8JweQ905MigPZ4JUroVaC+2db3RPthAjWtsxjA9rJ4YgfQ+
ZjCeBQq0dnPnzeueU9QyJb5XcVjTWOYWVRELK6ECgYEA8OE6GPnEToGJFT6sqL5q
ZHdjQEkquuh8upWADU/78/nk6Fp8FOc+dWcIw23zyuFFgfKuLBgvgvERUL6FaYza
k2glvBg9hrbsn9NTlfpqaByeNz49dCqYSsETRQn14mRs3FrycD7OLgdMx6kWCEeF
NANdQZCrZjj0D6MJ0OuzG2UCgYEA2s+/hi2/8BFGcT1UhkBwI2UF/le7Mn8qXwzp
Enu74SzLEzw9EZ2knBaLA6xPxnykMqO3C80o2SDEMJoa2fxrqMHAelJrjw9VgaNc
ZAIHeq4PIqJFT5cYy34EibLX0LzOhYCYmdFam4dsvGFfvF4wcKryk7a5sq3votZ4
7EMC1hkCgYEApowDgHtJOMKlhpPkC3RE2ZwWer9cFQlkHBn8BLhVy1Xv6JuPiWBt
tfz8eStP0em6BmRF+uTqDM4jG8HvOpCSHDN5S7ky6S8XIlaaR2tyIPQQjL+y+9vr
mlwut6Bwawzmm+EiGWvDYN3ZP39wZV8WAWWGGCwv5ijgzuL6iYI+P2UCgYAOgAvq
IWgBybNIV88dInIL9mriQwAVxZWSPPHJFsgJkQVYHfrSCwdYjKnjsWyL88CR1oWP
06WsVd6KdfvnjDG6OjS+Jm4YSeTZtXCu8+948sXv/p7nOlUbTxuP4HkqzQhGkpIK
R3RgsCXFihJlEjzVio6OuWIu9BXYTawvw/URKQKBgDzIcOd1HUWKqnxeJjS/qaKO
eM6Ugg1V9mfNkWo3VEGL7Ju6vckMS1XF5ZPM18yBoduX736f6P56ScKi2JPW2eXg
pKjNnKUQJFAWehmtqMPIDoD2iSDcHUhj1uLktSdGJxl+W2I5gR9VDjVmitxMqoGI
ikkCBXHR96YGp5LyHm5G
-----END PRIVATE KEY-----
```

> **Important**: When pasting the private key in Vercel, paste it exactly as shown above, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. Vercel will handle the newline escaping automatically.

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Enter the **Key** (e.g., `FIREBASE_ADMIN_PROJECT_ID`)
   - Enter the **Value** (copy from above)
   - Select which environments to apply to (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application for the changes to take effect

## Verification

After adding the environment variables and redeploying:
- The build should complete without the "ENOENT: no such file or directory" error
- Check the build logs for "Initializing Firebase Admin with environment variables"
- Test the admin API endpoints to ensure Firebase Admin is working correctly

## Local Development

For local development, the app will continue to use the `serviceAccountKey.json` file (or the specific file you have: `labre-lims-bb270-firebase-adminsdk-fbsvc-0d7653c406.json`). Make sure this file is in your `.gitignore` to prevent committing credentials to version control.
