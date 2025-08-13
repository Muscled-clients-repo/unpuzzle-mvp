# Supabase Migrations

This folder contains numbered SQL migration files for tracking database changes.

## File Naming Convention
- `001_initial_setup.sql` - First migration
- `002_add_auth.sql` - Second migration
- `003_add_courses.sql` - Third migration
- etc.

## Usage
1. Create migration files in numerical order
2. Copy SQL content from Supabase SQL Editor
3. Run in Supabase SQL Editor in order
4. Keep files for version control and team sync

## Migration Log
- [ ] 001 - Initial setup (users, profiles, auth) ✅ CREATED
- [ ] 002 - Courses and videos tables ✅ CREATED
- [x] 003 - AI features (reflections, chat) ✅ CREATED
- [x] 004 - Seed data with existing mock content ✅ CREATED

## How to Run
1. Open Supabase SQL Editor
2. Run migrations in order:
   - Copy content from `001_initial_setup.sql` and execute
   - Copy content from `002_courses_and_videos.sql` and execute  
   - Copy content from `003_ai_features.sql` and execute
   - Copy content from `004_seed_data.sql` and execute
3. Verify tables and data are created correctly
4. Update frontend environment variables to connect to Supabase