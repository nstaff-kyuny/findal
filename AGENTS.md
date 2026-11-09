# Project rules

- Old backup cleanup runs inside `runBackup` after a successful backup and only touches `backup_jobs` rows and `backups` bucket files, so no extra scheduled job is needed and app/member data is never affected.
- Admin job takedowns use `jobs.admin_hidden` set only via the `admin_set_job_hidden` RPC, guarded by a trigger and SELECT policies, so employers cannot re-activate a hidden job and every seeker query stays filtered without code changes.
- Ad banners share one `ad_banners` table split by its `audience` column (`seeker` / `employer`), so each admin banner page and each app screen only reads its own audience.
- Public store-download guidance lives in the standalone `/download` route and uses explicit external store links, so visitors can choose a store without signing in or automatic redirection.