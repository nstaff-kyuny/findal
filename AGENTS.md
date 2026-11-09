# Project rules

- Old backup cleanup runs inside `runBackup` after a successful backup and only touches `backup_jobs` rows and `backups` bucket files, so no extra scheduled job is needed and app/member data is never affected.
- Public store-download guidance lives in the standalone `/download` route and uses explicit external store links, so visitors can choose a store without signing in or automatic redirection.