import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../../", import.meta.url));
const db=new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  const foundation=readFileSync(root+'/supabase/migrations/202608300001_bynv_accounts.sql','utf8').replace('create extension if not exists pgcrypto;','');
  await db.exec(foundation);
  await db.exec(readFileSync(root+'/docs/experience-schema.sql','utf8'));
  await db.exec(readFileSync(root+'/docs/assessment-preservation.sql','utf8'));
  console.log('Combined schemas applied to isolated PostgreSQL successfully.');
  for(const filename of ['experience-verification.sql','assessment-preservation-test.sql']) {
    console.log('Verifying '+filename);
    const results=await db.exec(readFileSync(root+'/docs/'+filename,'utf8'));
    for(const result of results) if(result.rows?.length) console.log(JSON.stringify(result.rows));
  }
  await db.exec(readFileSync(root+'/supabase/migrations/20260917012747_momentum_personalization.sql','utf8'));
  const checks=await db.exec(readFileSync(root+'/docs/momentum-verification.sql','utf8'));
  for(const result of checks) if(result.rows?.length) console.log(JSON.stringify(result.rows));
  const resetChecks=await db.exec(readFileSync(root+'/docs/reset-verification.sql','utf8'));
  for(const result of resetChecks) if(result.rows?.length) console.log(JSON.stringify(result.rows));
  const count=await db.query('select count(*)::integer as remaining_test_users from auth.users');
  console.log(JSON.stringify(count.rows));
} catch(error) { console.error(error); process.exitCode=1; }
finally { await db.close(); }
