# Vote Tracker Deployment Guide

This document is a quick reference for deploying changes to dev and production
on the Hetzner VPS using Dokku. It assumes a clean local checkout and no
secrets in the repo.

## Prereqs

- Repo is on your machine.
- SSH access to the VPS: `root@157.180.37.245`.
- Dokku is installed on the VPS.
- DNS A record for `vote-tracker.trevordebard.com` -> `157.180.37.245`.
- DNS A record for `dev-vote-tracker.trevordebard.com` -> `157.180.37.245`.

## Automated deployments (recommended)

Deploys run via GitHub Actions:

- Dev: every push to `main` -> `dev-vote-tracker.trevordebard.com`
- Prod: manual workflow dispatch -> `vote-tracker.trevordebard.com`

### One-time GitHub Actions setup

1) Create an SSH keypair for GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-dokku" -f ~/.ssh/vote-tracker-dokku -N ""
```

2) Add the public key to Dokku:

```bash
ssh root@157.180.37.245 "dokku ssh-keys:add github-actions ~/.ssh/vote-tracker-dokku.pub"
```

3) Add a GitHub repo secret named `DOKKU_SSH_PRIVATE_KEY` with the contents of:

```bash
cat ~/.ssh/vote-tracker-dokku
```

4) Ensure the workflows exist:

- `/.github/workflows/deploy-dev.yml`
- `/.github/workflows/deploy-prod.yml`

### Trigger a prod deploy

In GitHub:

1) Actions tab
2) Select "Deploy Prod"
3) Run workflow

## Manual deploy (backup option)

1) Make your changes locally.
2) Run a quick local check (optional but recommended):

```bash
npm run lint
```

3) Commit your changes:

```bash
git status
git add -A
git commit -m "Describe the change"
```

4) Push to Dokku:

```bash
git push dokku main
```

Wait for the build output to finish. It should end with:

```
=====> Application deployed:
       https://vote-tracker.trevordebard.com
```

## Verify after deploy

- Open `https://vote-tracker.trevordebard.com` in a browser.
- Create a room and confirm it redirects to `/host/{CODE}`.

## View logs (during or after deploy)

Tail logs:

```bash
ssh root@157.180.37.245 "dokku logs vote-tracker -t"
ssh root@157.180.37.245 "dokku logs vote-tracker-dev -t"
```

Last 200 lines:

```bash
ssh root@157.180.37.245 "dokku logs vote-tracker -n 200"
ssh root@157.180.37.245 "dokku logs vote-tracker-dev -n 200"
```

## Quick status checks

```bash
ssh root@157.180.37.245 "dokku ps:report vote-tracker"
ssh root@157.180.37.245 "dokku urls vote-tracker"
ssh root@157.180.37.245 "dokku ps:report vote-tracker-dev"
ssh root@157.180.37.245 "dokku urls vote-tracker-dev"
```

## Local Git remote (one-time setup)

From your local repo:

```bash
git remote add dokku dokku@157.180.37.245:vote-tracker
```

If the remote already exists:

```bash
git remote set-url dokku dokku@157.180.37.245:vote-tracker
```

## Common issues

### LetsEncrypt fails with an invalid domain

If you see a `rejectedIdentifier` error, ensure only real public domains are
attached to the app:

```bash
dokku domains:remove vote-tracker vote-tracker.trevor-personal-vps
dokku domains:set vote-tracker vote-tracker.trevordebard.com
dokku letsencrypt:enable vote-tracker
```

### SQLite "unable to open database file"

Usually a permissions issue on the host-mounted volume:

```bash
ssh root@157.180.37.245 "chown -R 32767:32767 /var/lib/dokku/data/storage/vote-tracker"
ssh root@157.180.37.245 "dokku ps:restart vote-tracker"
```

### Deploy lock stuck

```bash
ssh root@157.180.37.245 "dokku apps:unlock vote-tracker"
```

## Useful references

- App URL: `https://vote-tracker.trevordebard.com`
- Dev URL: `https://dev-vote-tracker.trevordebard.com`
- Server: `root@157.180.37.245`

## One-time server setup (if you ever need it)

SSH into the VPS:

```bash
ssh root@157.180.37.245
```

Create the apps:

```bash
dokku apps:create vote-tracker
dokku apps:create vote-tracker-dev
```

Create persistent volumes for SQLite and mount them:

```bash
mkdir -p /var/lib/dokku/data/storage/vote-tracker
dokku storage:mount vote-tracker /var/lib/dokku/data/storage/vote-tracker:/app/data
chown -R 32767:32767 /var/lib/dokku/data/storage/vote-tracker
mkdir -p /var/lib/dokku/data/storage/vote-tracker-dev
dokku storage:mount vote-tracker-dev /var/lib/dokku/data/storage/vote-tracker-dev:/app/data
chown -R 32767:32767 /var/lib/dokku/data/storage/vote-tracker-dev
```

Set the app domains:

```bash
dokku domains:set vote-tracker vote-tracker.trevordebard.com
dokku domains:set vote-tracker-dev dev-vote-tracker.trevordebard.com
```

Enable HTTPS (replace email if desired):

```bash
dokku config:set --no-restart vote-tracker DOKKU_LETSENCRYPT_EMAIL=trevordebard@gmail.com
dokku letsencrypt:enable vote-tracker
dokku letsencrypt:set vote-tracker-dev email trevordebard@gmail.com
dokku letsencrypt:enable vote-tracker-dev
```

Open HTTPS in the firewall if needed:

```bash
sudo ufw allow 443/tcp
```
