# First local OWNER

From `backend/`, with the backend running on port 3000:

```powershell
.\scripts\bootstrap-owner.ps1 -Email 'your-email@example.com'
```

Enter a unique password into the hidden local prompt and confirm it. Never supply
the password in chat, command arguments, environment variables, or source files.
Use at least 14 characters and no more than 72 UTF-8 bytes.

The launcher checks the local PostgreSQL connection before prompting. The Node
script restricts the connection to loopback port 5432, database `eldob_travel`,
and rejects production mode. It verifies the live User schema and OWNER enum.
An existing email or any existing OWNER stops the script without an update.
There is no promotion or overwrite option. A transaction locks the User table
briefly while rechecking eligibility and inserting only the new OWNER.

Passwords are bcrypt-hashed with cost 12. The script uses the real local login
endpoint and checks that `/dashboard` returns 401 without authentication and 200
with the new OWNER's access token. It revokes only its own test refresh token.
Access tokens are held only in memory and are never printed; they expire
according to the configured access-token lifetime.

A successful run prints `PASS: password login and OWNER dashboard authorization`.
If account creation succeeds but a later check fails, **do not rerun**: inspect the
server and verify the existing account. This script never resets passwords.
It makes no schema migrations and does not delete or modify existing users.

Login: http://127.0.0.1:5173/login

Owner dashboard: http://127.0.0.1:5173/owner

Read-only preflight (no password required):

```powershell
node .\scripts\bootstrap-owner.cjs 'your-email@example.com' --check
```
